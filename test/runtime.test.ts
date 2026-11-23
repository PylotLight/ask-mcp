import { describe, expect, it } from "vitest"
import { renderInputRegion } from "../src/render/input.js"
import { clientScript } from "../src/render/client.js"
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

describe("Other input", () => {
  const singleOther = {
    title: "t",
    blocks: [],
    input: { type: "single_choice", options: [{ id: "a", label: "A" }], other: { placeholder: "Custom…" } },
  } as unknown as AskArgs

  it("renders the Other control as a labelled choice wrapping a text input", () => {
    const html = renderInputRegion(singleOther)
    expect(html).toContain('id="other-choice"')
    expect(html).toContain('class="choice choice-other"')
    expect(html).toContain('class="other-input"')
    expect(html).toContain("Custom…")
  })

  it("focuses the Other input when the Other choice is selected", () => {
    const js = clientScript(singleOther, 3000)
    expect(js).toContain('c.value === "__other__" && c.checked')
    expect(js).toContain("oi.focus()")
  })
})
