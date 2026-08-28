import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"
import type { IncomingMessage, ServerResponse } from "node:http"
import {
  askArgsSchema,
  askOptionsSchema,
  infoBlockSchema,
  lenientInputSpecSchema,
  MAX_BLOCKS,
  normalizeInputSpec,
  type AskArgs,
  type AskResult,
} from "../schema/index.js"
import type { ArtifactStore } from "../store/artifacts.js"
import type { PendingStore } from "../store/pending.js"
import { summarizeResult } from "./summary.js"
import { openInBrowser } from "../util/open.js"
import { VERSION } from "../version.js"

export interface McpDeps {
  store: PendingStore
  artifacts: ArtifactStore
  baseUrl: string
  openBrowser: boolean
}

export const ASK_TOOL_DESCRIPTION = `Show structured information (plans, options, diffs, tables) to the user in a rendered form and collect a decision or input.

Use whenever the user must review content and respond: approvals, choosing between alternatives, multi-selects, free text, or short forms. Do not use for pure questions that chat handles fine.

Guidance:
- Put alternatives in option_card blocks; reference the same ids in single_choice/multi_choice options.
- Use approve for a single recommended plan (reject usually warrants a note).
- Use form or text to collect data, not to choose between plans.
- Keep copy concise; do not dump entire conversation history into blocks.
- One primary input per call; ask follow-ups in subsequent calls.

Blocks the tool call until the user responds, cancels, or the timeout is reached. Returns a structured result (action, selected ids/values, optional note). On timeout, treat the question as unanswered and proceed without pestering again.

The form URL opens in the user's browser automatically when the call starts.`

/** Format Zod issues as "path: message; path: message". */
function formatIssues(error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues.map((i) => `${i.path.map(String).join(".")}: ${i.message}`).join("; ")
}

function zerrMessage(err: unknown): string {
  if (err && typeof err === "object" && "issues" in err) {
    return formatIssues(err as { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> })
  }
  return err instanceof Error ? err.message : String(err)
}

/** Artifact persistence is best-effort: a disk failure must not break a live interaction. */
async function bestEffort(fn: () => Promise<void>, what: string): Promise<void> {
  try {
    await fn()
  } catch (err) {
    console.error(`[ask] failed to save ${what}:`, err instanceof Error ? err.message : err)
  }
}

function buildServer(deps: McpDeps, res?: ServerResponse): McpServer {
  const server = new McpServer({ name: "ask-mcp", version: VERSION })

  server.registerTool(
    "ask",
    {
      title: "Ask the user",
      description: ASK_TOOL_DESCRIPTION,
      // Intentionally lenient vs askArgsSchema: `input.type` may be omitted
      // (inferred server-side) so LLM callers can pass a minimal spec.
      inputSchema: {
        title: z.string().min(1).max(120).describe("Short heading for the question surface"),
        subtitle: z.string().max(200).optional().describe("Optional supporting line under the title"),
        blocks: z
          .array(infoBlockSchema)
          .min(1)
          .max(MAX_BLOCKS)
          .describe("Info blocks shown to the user before they respond (context, options, tables, steps)"),
        input: lenientInputSpecSchema.describe(
          "The single primary input the user must respond with. `type` may be omitted: it is inferred from the other fields (options→single_choice, schema→form, text fields→text, otherwise approve).",
        ),
        options: askOptionsSchema.optional().describe("Presentation options (density, cancel button, locale)"),
      },
    },
    async (args) => {
      let input
      try {
        input = normalizeInputSpec(args.input)
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: `Invalid ask input: ${zerrMessage(err)}` }],
        }
      }
      const parsed = askArgsSchema.safeParse({ ...args, input })
      if (!parsed.success) {
        return {
          isError: true,
          content: [{ type: "text", text: `Invalid ask arguments: ${formatIssues(parsed.error)}` }],
        }
      }
      const askArgs: AskArgs = parsed.data
      const { entry, promise } = deps.store.create(askArgs)
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
      await bestEffort(() => deps.artifacts.saveSpec(entry.token, entry.requestId, askArgs), "spec")
      console.error(`[ask] form ready: ${formUrl} (requestId=${entry.requestId})`)
      if (deps.openBrowser) openInBrowser(formUrl)
      const result: AskResult = await promise
      deps.store.markConsumed(entry.token)
      await bestEffort(() => deps.artifacts.saveResponse(entry.token, entry.requestId, result), "response")
      return {
        content: [{ type: "text", text: summarizeResult(askArgs, result) }],
        structuredContent: result as unknown as Record<string, unknown>,
      }
    },
  )

  return server
}

/**
 * Stateless pattern: a fresh server+transport pair per request, no session state.
 * The blocking `ask` handler keeps the HTTP response open until the user answers.
 */
export async function handleMcpRequest(deps: McpDeps, req: IncomingMessage, res: ServerResponse, body?: unknown): Promise<void> {
  const server = buildServer(deps, res)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on("close", () => {
    void transport.close()
    void server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, body)
}
