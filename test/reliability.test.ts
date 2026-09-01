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
import { renderPage } from "../src/render/page.js"
import { renderBlock } from "../src/render/blocks.js"

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
    expect(html).toContain("settleViewMs: 5000")
  })
})
