import { describe, expect, it } from "vitest"
import {
  askArgsJsonSchema,
  askArgsSchema,
  askResultJsonSchema,
  askResultSchema,
  inferInputType,
  lenientInputSpecSchema,
  MAX_BLOCKS,
  MAX_OPTION_CARDS,
  normalizeInputSpec,
} from "../src/schema/index.js"

const baseInput = { type: "approve" } as const

function baseArgs(overrides: Record<string, unknown> = {}) {
  return {
    title: "Deploy plan",
    blocks: [{ type: "paragraph", text: "Ready to ship?" }],
    input: baseInput,
    ...overrides,
  }
}

describe("askArgsSchema", () => {
  it("accepts a minimal valid ask", () => {
    const parsed = askArgsSchema.parse(baseArgs())
    expect(parsed.title).toBe("Deploy plan")
    expect(parsed.options).toBeUndefined()
  })

  it("rejects empty blocks and empty title", () => {
    expect(() => askArgsSchema.parse(baseArgs({ blocks: [] }))).toThrow()
    expect(() => askArgsSchema.parse(baseArgs({ title: "" }))).toThrow()
  })

  it("enforces the block cap", () => {
    const blocks = Array.from({ length: MAX_BLOCKS + 1 }, (_, i) => ({ type: "paragraph", text: `b${i}` }))
    expect(() => askArgsSchema.parse(baseArgs({ blocks }))).toThrow()
  })

  it("enforces the option_card cap", () => {
    const blocks = Array.from({ length: MAX_OPTION_CARDS + 1 }, (_, i) => ({
      type: "option_card",
      id: `opt${i}`,
      title: `Option ${i}`,
    }))
    expect(() => askArgsSchema.parse(baseArgs({ blocks }))).toThrow()
  })

  it("rejects ids with invalid characters", () => {
    const blocks = [{ type: "option_card", id: "9bad id!", title: "x" }]
    expect(() => askArgsSchema.parse(baseArgs({ blocks }))).toThrow()
  })

  it("rejects table rows that do not match header count", () => {
    const blocks = [
      { type: "table", headers: ["a", "b"], rows: [["1", "2"], ["3"]] },
    ]
    expect(() => askArgsSchema.parse(baseArgs({ blocks }))).toThrow()
  })

  it("accepts single_choice wired to option_card ids", () => {
    const parsed = askArgsSchema.parse(
      baseArgs({
        blocks: [
          { type: "option_card", id: "fast", title: "Fast", meta: "Recommended" },
          { type: "option_card", id: "safe", title: "Safe" },
        ],
        input: {
          type: "single_choice",
          options: [
            { id: "fast", label: "Fast" },
            { id: "safe", label: "Safe" },
          ],
        },
      }),
    )
    expect(parsed.input.type).toBe("single_choice")
  })

  it("rejects multi_choice where min exceeds max", () => {
    expect(() =>
      askArgsSchema.parse(
        baseArgs({
          input: {
            type: "multi_choice",
            options: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
            min: 2,
            max: 1,
          },
        }),
      ),
    ).toThrow()
  })

  it("rejects form with unknown required field", () => {
    expect(() =>
      askArgsSchema.parse(
        baseArgs({
          input: {
            type: "form",
            schema: {
              type: "object",
              properties: { name: { type: "string", title: "Name" } },
              required: ["nickname"],
            },
          },
        }),
      ),
    ).toThrow()
  })

  it("rejects form with zero fields", () => {
    expect(() =>
      askArgsSchema.parse(
        baseArgs({
          input: { type: "form", schema: { type: "object", properties: {} } },
        }),
      ),
    ).toThrow()
  })
})

describe("askResultSchema", () => {
  it("accepts each action with the right fields", () => {
    expect(askResultSchema.parse({ action: "approve", note: "lgtm" }).action).toBe("approve")
    expect(askResultSchema.parse({ action: "choose", optionId: "fast" }).optionId).toBe("fast")
    expect(askResultSchema.parse({ action: "choose", optionIds: ["a", "b"] }).optionIds).toHaveLength(2)
    expect(askResultSchema.parse({ action: "submit", values: { name: "x" } }).values).toEqual({ name: "x" })
    expect(askResultSchema.parse({ action: "cancel" }).action).toBe("cancel")
    expect(askResultSchema.parse({ action: "timeout" }).action).toBe("timeout")
  })

  it("rejects unknown actions and malformed requestIds", () => {
    expect(() => askResultSchema.parse({ action: "maybe" })).toThrow()
    expect(() => askResultSchema.parse({ action: "approve", requestId: "bad id!" })).toThrow()
  })
})

describe("normalizeInputSpec", () => {
  it("infers the type from fields when type is omitted", () => {
    expect(inferInputType(lenientInputSpecSchema.parse({}))).toBe("approve")
    expect(inferInputType(lenientInputSpecSchema.parse({ options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] }))).toBe("single_choice")
    expect(inferInputType(lenientInputSpecSchema.parse({ placeholder: "say" }))).toBe("text")
    expect(
      inferInputType(
        lenientInputSpecSchema.parse({
          schema: { type: "object", properties: { name: { type: "string", title: "Name" } }, required: ["name"] },
        }),
      ),
    ).toBe("form")
  })

  it("explicit type always wins", () => {
    expect(inferInputType(lenientInputSpecSchema.parse({ type: "multi_choice", options: [{ id: "a", label: "A" }] }))).toBe("multi_choice")
  })

  it("normalizes an approve without type and passes strict validation", () => {
    const spec = normalizeInputSpec({ approveLabel: "Ship it" })
    expect(spec).toEqual({ type: "approve", approveLabel: "Ship it", rejectLabel: undefined, noteRequired: undefined, notePlaceholder: undefined })
    expect(() => askArgsSchema.parse(baseArgs({ input: spec }))).not.toThrow()
  })

  it("normalizes a choice without type into single_choice", () => {
    const spec = normalizeInputSpec({ options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] })
    expect(spec.type).toBe("single_choice")
    expect(askArgsSchema.parse(baseArgs({ input: spec })).input.type).toBe("single_choice")
  })

  it("rejects fewer than two options via strict validation", () => {
    expect(() => normalizeInputSpec({ options: [{ id: "a", label: "A" }] })).not.toThrow()
    expect(() => askArgsSchema.parse(baseArgs({ input: normalizeInputSpec({ options: [{ id: "a", label: "A" }] }) }))).toThrow()
  })

  it("strips fields that do not belong to the inferred type", () => {
    const spec = normalizeInputSpec({ options: [{ id: "a", label: "A" }, { id: "b", label: "B" }], placeholder: "ignored" })
    expect(spec).toEqual({ type: "single_choice", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] })
  })
})

describe("json schema export", () => {
  it("produces an object schema for ask args covering every input type", () => {
    const json = askArgsJsonSchema()
    expect(json.type).toBe("object")
    const text = JSON.stringify(json)
    for (const t of ["approve", "single_choice", "multi_choice", "form", "option_card", "markdown", "callout"]) {
      expect(text).toContain(t)
    }
  })

  it("produces an object schema for the result", () => {
    const json = askResultJsonSchema()
    expect(json.type).toBe("object")
    expect(JSON.stringify(json)).toContain("approve")
  })
})
