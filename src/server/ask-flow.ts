import { z } from "zod"
import type { ServerResponse } from "node:http"
import {
  askArgsSchema,
  askOptionsSchema,
  infoBlockSchema,
  lenientInputSpecSchema,
  normalizeInputSpec,
  type AskArgs,
  type AskResult,
} from "../schema/index.js"
import type { ArtifactStore } from "../store/artifacts.js"
import type { PendingStore } from "../store/pending.js"
import type { TemplateStore } from "../store/templates.js"
import { openInBrowser } from "../util/open.js"

export interface AskFlowDeps {
  store: PendingStore
  artifacts: ArtifactStore
  baseUrl: string
  openBrowser: boolean
}

/** Lenient whole-args shape: everything optional — templates can supply the required parts. */
const lenientAskArgsSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  subtitle: z.string().max(200).optional(),
  blocks: z.array(infoBlockSchema).max(200).optional(),
  input: lenientInputSpecSchema.optional(),
  options: askOptionsSchema.optional(),
})

/** Format any thrown schema/validation error as a single readable line. */
export function formatAskError(err: unknown): string {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> }).issues
    return issues.map((i) => `${i.path.map(String).join(".")}: ${i.message}`).join("; ")
  }
  return err instanceof Error ? err.message : String(err)
}

/**
 * Normalize a lenient ask args object (input.type may be omitted) into the
 * strict AskArgs union. Throws a ZodError on invalid input.
 */
export function normalizeAskArgs(raw: unknown): AskArgs {
  const partial = lenientAskArgsSchema.parse(raw)
  const input = normalizeInputSpec(partial.input ?? {})
  const { blocks, ...rest } = partial
  const parsed = askArgsSchema.safeParse({ blocks: blocks ?? [], ...rest, input })
  if (!parsed.success) throw parsed.error
  return parsed.data
}

export interface RawAskRequest {
  template?: string
  title?: string
  subtitle?: string
  blocks?: unknown
  input?: unknown
  options?: unknown
}

/**
 * Resolve a raw ask request into strict AskArgs. When `template` is set, the
 * template spec supplies defaults and explicit request fields override it.
 */
export async function resolveAskArgs(raw: RawAskRequest, templates: TemplateStore): Promise<AskArgs> {
  let base: Record<string, unknown> = {}
  if (raw.template !== undefined) {
    if (typeof raw.template !== "string" || raw.template.length === 0) throw new Error("template must be a non-empty string")
    const template = await templates.get(raw.template)
    if (!template) {
      const known = (await templates.list()).map((t) => t.id)
      throw new Error(`unknown template: ${raw.template}${known.length ? ` (available: ${known.join(", ")})` : ""}`)
    }
    base = { ...template.spec }
  }
  const merged: Record<string, unknown> = { ...base }
  for (const key of ["title", "subtitle", "blocks", "input", "options"] as const) {
    if (raw[key] !== undefined) merged[key] = raw[key]
  }
  return normalizeAskArgs(merged)
}

/** Artifact persistence is best-effort: a disk failure must not break a live interaction. */
export async function bestEffort(fn: () => Promise<void>, what: string): Promise<void> {
  try {
    await fn()
  } catch (err) {
    console.error(`[ask] failed to save ${what}:`, err instanceof Error ? err.message : err)
  }
}

/**
 * The blocking ask flow shared by the MCP tool and the direct HTTP API:
 * create the pending ask, persist its spec, open the form, wait for the
 * decision, persist the response, and return the structured result.
 */
export async function runAsk(deps: AskFlowDeps, args: AskArgs, res?: ServerResponse): Promise<AskResult> {
  const { entry, promise } = deps.store.create(args)
  const formUrl = `${deps.baseUrl}/f/${entry.token}`
  const abortIfPending = (): void => {
    if (deps.store.status(entry.token) === "pending") {
      console.error(`[ask] request aborted by client, cancelling ${entry.token}`)
      deps.store.cancel(entry.token)
    }
  }
  if (res) {
    // res 'close' fires on premature client disconnect AND after normal completion;
    // by then the entry is consumed/cancelled, so cancel() no-ops.
    if (res.destroyed) abortIfPending()
    else res.on("close", abortIfPending)
  }
  await bestEffort(() => deps.artifacts.saveSpec(entry.token, entry.requestId, args), "spec")
  console.error(`[ask] form ready: ${formUrl} (requestId=${entry.requestId})`)
  if (deps.openBrowser) openInBrowser(formUrl)
  const result: AskResult = await promise
  deps.store.markConsumed(entry.token)
  await bestEffort(() => deps.artifacts.saveResponse(entry.token, entry.requestId, result), "response")
  return result
}
