import { describe, expect, it } from "vitest"
import { mkdtempSync } from "node:fs"
import { stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { AddressInfo } from "node:net"
import { z } from "zod"
import { createHttpServer, type HttpDeps } from "../src/server/http.js"
import type { Config } from "../src/config.js"
import { PendingStore } from "../src/store/pending.js"
import { ArtifactStore } from "../src/store/artifacts.js"
import { TemplateStore } from "../src/store/templates.js"
import { dryRunAsk, formatAskError, normalizeAskArgs, runAsk } from "../src/server/ask-flow.js"
import { renderPage, eyebrowFor } from "../src/render/page.js"
import { renderBlock } from "../src/render/blocks.js"
import { renderActions, renderInputRegion } from "../src/render/input.js"

const askArgs = normalizeAskArgs({
  title: "Deploy?",
  blocks: [{ type: "paragraph", text: "x" }],
  input: { type: "approve" },
})

describe("formatAskError", () => {
  const schema = z.object({ input: z.object({ options: z.array(z.object({ id: z.string().min(2) })) }) })

  it("renders array indices as [n] and joins issues", () => {
    const err = schema.safeParse({ input: { options: [{ id: "x" }] } })
    expect(err.success).toBe(false)
    if (!err.success) {
      const msg = formatAskError(err.error)
      expect(msg).toContain("input.options[0].id")
      expect(msg).not.toContain("input.options.0.id")
    }
  })

  it("caps the issue list at three with a remainder count", () => {
    const err = schema.safeParse({ input: { options: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }] } })
    expect(err.success).toBe(false)
    if (!err.success) {
      const msg = formatAskError(err.error)
      expect(msg).toContain("(1 more)")
      expect(msg.match(/options\[/g)).toHaveLength(3)
    }
  })

  it("passes plain Errors through", () => {
    expect(formatAskError(new Error("boom"))).toBe("boom")
  })
})

describe("cancellation propagation", () => {
  it("a pre-aborted signal cancels the pending ask immediately", async () => {
    const store = new PendingStore(60_000)
    const artifacts = new ArtifactStore(mkdtempSync(path.join(tmpdir(), "ask-cancel-")))
    const controller = new AbortController()
    controller.abort()
    const result = await runAsk({ store, artifacts, baseUrl: "http://127.0.0.1:1", openBrowser: false }, askArgs, undefined, controller.signal)
    expect(result).toEqual({ action: "cancel" })
    expect(store.list()).toHaveLength(1)
    expect(store.list()[0]!.status).toBe("cancelled")
  })

  it("an abort after create settles the entry as cancelled", async () => {
    const store = new PendingStore(60_000)
    const artifacts = new ArtifactStore(mkdtempSync(path.join(tmpdir(), "ask-cancel-")))
    const controller = new AbortController()
    const pending = runAsk({ store, artifacts, baseUrl: "http://127.0.0.1:1", openBrowser: false }, askArgs, undefined, controller.signal)
    await new Promise((r) => setTimeout(r, 10))
    expect(store.list()[0]!.status).toBe("pending")
    controller.abort()
    await expect(pending).resolves.toEqual({ action: "cancel" })
    expect(store.list()[0]!.status).toBe("cancelled")
  })
})

describe("dryRun", () => {
  function makeDeps(): { deps: HttpDeps; close: () => Promise<void> } {
    const dir = mkdtempSync(path.join(tmpdir(), "ask-dryrun-"))
    const config: Config = {
      port: 0,
      host: "127.0.0.1",
      baseUrl: "",
      dataDir: dir,
      retentionDays: 0,
      timeoutMs: 60_000,
      settleViewMs: 8000,
      surface: "auto",
      openBrowser: false,
      stdio: false,
      configPath: path.join(dir, "config.json"),
    }
    const store = new PendingStore(60_000)
    const artifacts = new ArtifactStore(dir)
    const templates = new TemplateStore(path.join(dir, "templates"))
    const close = (): Promise<void> =>
      new Promise((resolve) => {
        store.settleAll()
        server.close(() => resolve())
      })
    const server = createHttpServer({ config, store, artifacts, templates, startedAt: Date.now() })
    const deps: HttpDeps = { config, store, artifacts, templates, startedAt: Date.now() }
    return { deps, close }
  }

  it("dryRunAsk archives spec + preview without creating a store entry", async () => {
    const artifacts = new ArtifactStore(mkdtempSync(path.join(tmpdir(), "ask-dryrun-")))
    const preview = await dryRunAsk({ artifacts }, askArgs)
    expect(preview.dryRun).toBe(true)
    expect(preview.ok).toBe(true)
    expect((await stat(preview.renderPath)).isFile()).toBe(true)
  })

  it("POST /api/ask with dryRun returns immediately and never creates a pending ask", async () => {
    const { deps, close } = makeDeps()
    const server = createHttpServer(deps)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    try {
      const port = (server.address() as AddressInfo).port
      const res = await fetch(`http://127.0.0.1:${port}/api/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Preview me", input: { type: "approve" }, dryRun: true }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { dryRun: boolean; ok: boolean; token: string; renderPath: string }
      expect(body.dryRun).toBe(true)
      expect(body.ok).toBe(true)
      expect(body.token).toBeTruthy()
      expect(deps.store.list()).toHaveLength(0)
      expect((await stat(body.renderPath)).isFile()).toBe(true)
    } finally {
      await close()
    }
  })
})

describe("render additions", () => {
  it("renders a diff block with line classes and +/- stats", () => {
    const html = renderBlock({ type: "diff", path: "src/a.ts", diff: "diff --git a/src/a.ts b/src/a.ts\n@@ -1,2 +1,2 @@\n-old line\n+new line\n context" })
    expect(html).toContain("diff-head")
    expect(html).toContain("src/a.ts")
    expect(html).toContain('class="dl add"')
    expect(html).toContain('class="dl del"')
    expect(html).toContain('class="dl hunk"')
    expect(html).toContain('class="dl meta"')
    expect(html).toContain('class="dl ctx"')
    expect(html).toContain("+1")
    expect(html).toContain("&minus;1")
  })

  it("escapes HTML inside diff lines", () => {
    const html = renderBlock({ type: "diff", diff: "+<script>alert(1)</script>" })
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("renders the settle view section and wires settleViewMs into the client", () => {
    const html = renderPage(askArgs, "tokentokentoken", "pending", "comfortable", 5000)
    expect(html).toContain('id="settle-view" hidden')
    expect(html).toContain('id="settle-permalink"')
    expect(html).toContain('id="btn-close"')
    expect(html).toContain('id="btn-copy"')
    expect(html).toContain('id="btn-stay"')
    expect(html).toContain('id="settle-countdown"')
    expect(html).toContain('id="settle-progress"')
    expect(html).toContain("settleViewMs: 5000")
  })

  it("falls back to a manual-close hint when the tab refuses to close", () => {
    const html = renderPage(askArgs, "tokentokentoken", "pending")
    expect(html).toContain("to close this tab")
    expect(html).toContain("document.title")
  })
})

describe("hero form", () => {
  const choiceArgs = (n: number, other = false) =>
    normalizeAskArgs({
      title: "Pick?",
      blocks: [],
      input: {
        type: "single_choice",
        options: Array.from({ length: n }, (_, i) => ({ id: `o${i}`, label: `O${i}` })),
        ...(other ? { other: {} } : {}),
      },
    })

  it("renders an eyebrow describing the answer needed", () => {
    expect(eyebrowFor(askArgs)).toBe("Approval needed")
    expect(eyebrowFor(choiceArgs(3))).toBe("Pick 1 of 3")
    expect(eyebrowFor(choiceArgs(3, true))).toBe("Pick 1 of 4")
    expect(eyebrowFor(normalizeAskArgs({ title: "T", blocks: [], input: { type: "text" } }))).toBe("Your answer needed")
    const html = renderPage(choiceArgs(2), "tokentokentoken", "pending")
    expect(html).toContain('<p class="eyebrow">')
    expect(html).toContain("Pick 1 of 2")
  })

  it("numbers choice badges and grids wide option sets", () => {
    const few = renderInputRegion(choiceArgs(2))
    expect(few).toContain('class="choice-num"')
    expect(few).not.toContain("choice-grid")
    const many = renderInputRegion(choiceArgs(4))
    expect(many).toContain("choice-list choice-grid")
    const other = renderInputRegion(choiceArgs(3, true))
    expect(other).toContain("choice-list choice-grid")
    expect(other).toContain("choice-num-other")
  })

  it("hints keyboard shortcuts in the actions row", () => {
    const html = renderActions(choiceArgs(3), true)
    expect(html).toContain("kbd-hint")
    expect(html).toContain("<kbd>1</kbd>–<kbd>3</kbd>")
  })

  it("applies the theme to the page and falls back to minimal", () => {
    const html = renderPage(choiceArgs(2), "tokentokentoken", "pending", "comfortable", 3000, "starfield")
    expect(html).toContain('data-theme="starfield"')
    expect(html).toContain('class="bg-stars"')
    expect(html).toContain('data-stars="1000"')
    expect(html).toContain('data-motion="full"')
    const fallback = renderPage(choiceArgs(2), "tokentokentoken", "pending", "comfortable", 3000, "aurora" as never)
    expect(fallback).toContain('data-theme="minimal"')
  })

  it("wires theme options with clamping and motion fallback", () => {
    const html = renderPage(choiceArgs(2), "tokentokentoken", "pending", "comfortable", 3000, "starfield", { stars: 2500, motion: "subtle" })
    expect(html).toContain('data-stars="2500"')
    expect(html).toContain('data-motion="subtle"')
    const clamped = renderPage(choiceArgs(2), "tokentokentoken", "pending", "comfortable", 3000, "starfield", { stars: 99999, motion: "wild" as never })
    expect(clamped).toContain('data-stars="5000"')
    expect(clamped).toContain('data-motion="full"')
  })
})
