import { describe, expect, it } from "vitest"
import { renderMarkdown } from "../src/render/markdown.js"
import { PendingStore } from "../src/store/pending.js"
import type { AskArgs } from "../src/schema/index.js"

const args: AskArgs = {
  title: "t",
  blocks: [{ type: "paragraph", text: "x" }],
  input: { type: "approve" },
}

describe("renderMarkdown", () => {
  it("escapes raw HTML", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).not.toContain("<script>")
    expect(renderMarkdown("<b>x</b>")).toContain("&lt;b&gt;x&lt;/b&gt;")
  })

  it("renders headings, lists, code, quotes, hr", () => {
    const md = renderMarkdown("# H1\n\n- a\n- b\n\n1. one\n2. two\n\n> quoted\n\n```\ncode()\n```\n\n---")
    expect(md).toContain("<h2>H1</h2>")
    expect(md).toContain("<ul><li>a</li><li>b</li></ul>")
    expect(md).toContain("<ol><li>one</li><li>two</li></ol>")
    expect(md).toContain("<blockquote>quoted</blockquote>")
    expect(md).toContain("<pre><code>code()</code></pre>")
    expect(md).toContain("<hr>")
  })

  it("renders inline styles and safe links only", () => {
    const md = renderMarkdown("**bold** *em* `code` [x](https://a.b) [y](javascript:alert(1))")
    expect(md).toContain("<strong>bold</strong>")
    expect(md).toContain("<em>em</em>")
    expect(md).toContain("<code>code</code>")
    expect(md).toContain('href="https://a.b"')
    expect(md).not.toContain('href="javascript')
  })
})

describe("PendingStore", () => {
  it("create → submit → markConsumed transitions", () => {
    const store = new PendingStore(60_000)
    const { entry, promise } = store.create(args)
    expect(entry.status).toBe("pending")
    expect(store.status(entry.token)).toBe("pending")
    expect(store.submit(entry.token, { action: "approve" })).toBe(true)
    expect(store.status(entry.token)).toBe("submitted")
    expect(store.result(entry.token)).toEqual({ action: "approve" })
    store.markConsumed(entry.token)
    expect(store.status(entry.token)).toBe("consumed")
    return expect(promise).resolves.toEqual({ action: "approve" })
  })

  it("submit is single-shot and cancel rejects double transitions", () => {
    const store = new PendingStore(60_000)
    const { entry } = store.create(args)
    expect(store.cancel(entry.token)).toBe(true)
    expect(store.cancel(entry.token)).toBe(false)
    expect(store.submit(entry.token, { action: "approve" })).toBe(false)
    expect(store.result(entry.token)).toEqual({ action: "cancel" })
  })

  it("expires pending entries after the timeout", () => {
    const store = new PendingStore(10)
    const { entry, promise } = store.create(args)
    return expect(promise).resolves.toEqual({ action: "timeout" }).then(() => {
      expect(store.status(entry.token)).toBe("expired")
    })
  })

  it("settleAll resolves everything pending for shutdown", () => {
    const store = new PendingStore(60_000)
    const p1 = store.create(args).promise
    const p2 = store.create(args).promise
    store.settleAll()
    return expect(Promise.all([p1, p2])).resolves.toEqual([{ action: "timeout" }, { action: "timeout" }])
  })

  it("prunes old terminal entries", () => {
    const store = new PendingStore(60_000)
    const { entry } = store.create(args)
    store.cancel(entry.token)
    // @ts-expect-error reach into internals to simulate age
    store.entries.get(entry.token)!.createdAt = Date.now() - 20 * 60 * 1000
    store.create(args)
    expect(store.status(entry.token)).toBeUndefined()
  })
})
