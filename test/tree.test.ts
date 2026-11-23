import { describe, expect, it } from "vitest"
import {
  askArgsJsonSchema,
  askArgsSchema,
  MAX_TREE_CHILDREN,
  MAX_TREE_DEPTH,
  MAX_TREE_NODES,
} from "../src/schema/index.js"
import { renderBlock } from "../src/render/blocks.js"

const baseArgs = {
  title: "Pick a direction",
  blocks: [] as unknown[],
  input: { type: "approve" as const },
}

function parseBlock(block: unknown) {
  return askArgsSchema.parse({ ...baseArgs, blocks: [block] }).blocks[0]!
}

const sampleTree = {
  type: "tree" as const,
  layout: "flow" as const,
  root: {
    title: "Ship the feature",
    note: "Three candidate slices",
    meta: "plan",
    status: "active" as const,
    children: [
      { title: "Renderer", meta: "2 files", status: "done" as const },
      {
        title: "Docs",
        children: [{ title: "README", note: "one paragraph" }],
      },
    ],
  },
}

describe("tree block", () => {
  it("accepts nested nodes and renders a flow", () => {
    const block = parseBlock(sampleTree)
    const html = renderBlock(block)
    expect(html).toContain('class="tree-flow"')
    expect(html).toContain("Ship the feature")
    expect(html).toContain("Three candidate slices")
    expect(html).toContain("Renderer")
    expect(html).toContain("README")
    expect(html).toContain("tree-node status-active")
    expect(html).toContain("tree-dot status-done")
  })

  it("renders the indented list layout", () => {
    const block = parseBlock({ ...sampleTree, layout: "list" })
    const html = renderBlock(block)
    expect(html).toContain('class="tree-list"')
    expect(html).not.toContain('class="tree-flow"')
    expect(html).toContain("tree-row")
  })

  it("escapes node text", () => {
    const block = parseBlock({
      type: "tree",
      root: { title: "<script>alert(1)</script>", note: "a & b" },
    })
    const html = renderBlock(block)
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("a &amp; b")
  })

  it("rejects empty children, too many children, and too much depth", () => {
    expect(() => parseBlock({ type: "tree", root: { title: "x", children: [] } })).toThrow()
    expect(() =>
      parseBlock({
        type: "tree",
        root: { title: "x", children: Array.from({ length: MAX_TREE_CHILDREN + 1 }, (_, i) => ({ title: `c${i}` })) },
      }),
    ).toThrow()

    let deep: { title: string; children?: unknown[] } = { title: "leaf" }
    for (let i = 0; i < MAX_TREE_DEPTH; i++) deep = { title: `n${i}`, children: [deep] }
    expect(() => parseBlock({ type: "tree", root: deep })).toThrow()
  })

  it("rejects more nodes than the cap", () => {
    const children = Array.from({ length: MAX_TREE_CHILDREN }, (_, i) => ({
      title: `branch ${i}`,
      children: Array.from({ length: MAX_TREE_CHILDREN }, (_, j) => ({ title: `leaf ${i}.${j}` })),
    }))
    expect(() => parseBlock({ type: "tree", root: { title: "root", children } })).toThrow(/maximum is 60/)
    expect(MAX_TREE_NODES).toBe(60)
  })

  it("is part of the advertised JSON schema", () => {
    const schema = JSON.stringify(askArgsJsonSchema())
    expect(schema).toContain('"tree"')
    expect(schema).toContain("$defs")
  })
})
