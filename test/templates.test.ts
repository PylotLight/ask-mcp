import { describe, expect, it } from "vitest"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { TemplateStore, isValidTemplateId } from "../src/store/templates.js"

function store(): TemplateStore {
  return new TemplateStore(mkdtempSync(path.join(tmpdir(), "ask-templates-")))
}

describe("TemplateStore", () => {
  it("seeds built-in templates on first init", async () => {
    const s = store()
    await s.init()
    const templates = await s.list()
    expect(templates.map((t) => t.id).sort()).toEqual(["deploy-confirm", "pick-region", "review-signoff"])
    const deploy = await s.get("deploy-confirm")
    expect(deploy?.title).toBe("Confirm a deployment")
    expect((deploy?.spec as { input?: { type?: string } }).input?.type).toBe("approve")
  })

  it("does not clobber user templates on re-init", async () => {
    const s = store()
    await s.init()
    await s.put("mine", { title: "Mine", spec: { title: "Mine", blocks: [{ type: "paragraph", text: "x" }], input: { type: "approve" } } })
    await s.init()
    const ids = (await s.list()).map((t) => t.id)
    expect(ids).toContain("mine")
    expect(ids).toHaveLength(4)
  })

  it("put validates the spec through the ask pipeline", async () => {
    const s = store()
    await s.put("good", { title: "Good", spec: { title: "Good", blocks: [{ type: "paragraph", text: "x" }] } })
    expect((await s.get("good"))?.title).toBe("Good")
    await expect(s.put("bad", { title: "Bad", spec: { title: "Bad", blocks: [{ type: "nope" }] } })).rejects.toThrow()
    await expect(s.put("bad", { title: "Bad", spec: { title: "", blocks: [{ type: "paragraph", text: "x" }] } })).rejects.toThrow()
  })

  it("rejects invalid ids and removes templates", async () => {
    const s = store()
    await expect(s.put("../evil", { title: "x", spec: { title: "x", blocks: [{ type: "paragraph", text: "x" }] } })).rejects.toThrow(/invalid template id/)
    expect(isValidTemplateId("UPPER")).toBe(false)
    await s.put("doomed", { title: "Doomed", spec: { title: "Doomed", blocks: [{ type: "paragraph", text: "x" }] } })
    expect(await s.remove("doomed")).toBe(true)
    expect(await s.get("doomed")).toBeNull()
    expect(await s.remove("doomed")).toBe(false)
  })
})
