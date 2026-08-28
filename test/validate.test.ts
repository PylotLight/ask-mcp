import { describe, expect, it } from "vitest"
import { validateResultAgainstArgs } from "../src/server/validate.js"
import { summarizeResult } from "../src/server/summary.js"
import type { AskArgs, AskResult } from "../src/schema/index.js"

const approveArgs: AskArgs = {
  title: "Ship?",
  blocks: [{ type: "paragraph", text: "ok" }],
  input: { type: "approve", noteRequired: "always" },
}

const choiceArgs: AskArgs = {
  title: "Pick",
  blocks: [],
  input: { type: "single_choice", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
}

const multiArgs: AskArgs = {
  title: "Pick many",
  blocks: [],
  input: {
    type: "multi_choice",
    options: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }],
    min: 1,
    max: 2,
  },
}

const textArgs: AskArgs = {
  title: "Text",
  blocks: [],
  input: { type: "text", minLength: 3 },
}

const formArgs: AskArgs = {
  title: "Form",
  blocks: [],
  input: {
    type: "form",
    schema: {
      type: "object",
      properties: {
        name: { type: "string", title: "Name", minLength: 2 },
        size: { type: "integer", title: "Size", minimum: 1, maximum: 10 },
        kind: { type: "string", title: "Kind", enum: ["x", "y"] },
        email: { type: "string", title: "Email", format: "email" },
        ok: { type: "boolean", title: "OK" },
      },
      required: ["name"],
    },
  },
}

describe("validateResultAgainstArgs", () => {
  it("requires a note when noteRequired is always", () => {
    expect(validateResultAgainstArgs(approveArgs, { action: "approve" })).toMatch(/note is required/)
    expect(validateResultAgainstArgs(approveArgs, { action: "approve", note: "why" })).toBeNull()
    expect(validateResultAgainstArgs(approveArgs, { action: "cancel" })).toBeNull()
  })

  it("rejects wrong actions and unknown option ids", () => {
    expect(validateResultAgainstArgs(choiceArgs, { action: "submit" })).toMatch(/expected a choice/)
    expect(validateResultAgainstArgs(choiceArgs, { action: "choose", optionId: "zzz" })).toMatch(/unknown optionId/)
    expect(validateResultAgainstArgs(choiceArgs, { action: "choose", optionId: "a" })).toBeNull()
  })

  it("enforces multi-select min/max and membership", () => {
    expect(validateResultAgainstArgs(multiArgs, { action: "choose", optionIds: [] })).toMatch(/between 1 and 2/)
    expect(validateResultAgainstArgs(multiArgs, { action: "choose", optionIds: ["a", "b", "c"] })).toMatch(/between 1 and 2/)
    expect(validateResultAgainstArgs(multiArgs, { action: "choose", optionIds: ["a", "zzz"] })).toMatch(/unknown optionId/)
    expect(validateResultAgainstArgs(multiArgs, { action: "choose", optionIds: ["a", "b"] })).toBeNull()
  })

  it("enforces text length bounds", () => {
    expect(validateResultAgainstArgs(textArgs, { action: "submit", value: "ab" })).toMatch(/out of bounds/)
    expect(validateResultAgainstArgs(textArgs, { action: "submit", value: "abc" })).toBeNull()
  })

  it("validates form fields: required, ranges, enums, email", () => {
    expect(validateResultAgainstArgs(formArgs, { action: "submit", values: {} })).toMatch(/missing required field: name/)
    expect(validateResultAgainstArgs(formArgs, { action: "submit", values: { name: "a" } })).toMatch(/too short|length/)
    expect(
      validateResultAgainstArgs(formArgs, { action: "submit", values: { name: "abc", size: 99 } }),
    ).toMatch(/above maximum/)
    expect(
      validateResultAgainstArgs(formArgs, { action: "submit", values: { name: "abc", size: 1.5 } }),
    ).toMatch(/integer/)
    expect(
      validateResultAgainstArgs(formArgs, { action: "submit", values: { name: "abc", kind: "zzz" } }),
    ).toMatch(/allowed values/)
    expect(
      validateResultAgainstArgs(formArgs, { action: "submit", values: { name: "abc", email: "nope" } }),
    ).toMatch(/email/)
    expect(
      validateResultAgainstArgs(formArgs, {
        action: "submit",
        values: { name: "abc", size: 3, kind: "x", email: "a@b.co", ok: true },
      }),
    ).toBeNull()
    expect(validateResultAgainstArgs(formArgs, { action: "submit", values: { zzz: "1" } })).toMatch(/unknown form field/)
    expect(validateResultAgainstArgs(formArgs, { action: "cancel" })).toBeNull()
  })
})

describe("summarizeResult", () => {
  const args: AskArgs = {
    title: "Deploy plan",
    blocks: [],
    input: { type: "single_choice", options: [{ id: "now", label: "Deploy now" }] },
  }

  it("summarizes each action type", () => {
    expect(summarizeResult(args, { action: "approve" })).toContain('approved "Deploy plan"')
    expect(summarizeResult(args, { action: "reject", note: "later" })).toContain("rejected")
    expect(summarizeResult(args, { action: "choose", optionId: "now" })).toContain("Deploy now")
    expect(summarizeResult(args, { action: "choose", optionIds: ["now"] })).toContain("Deploy now")
    expect(summarizeResult(args, { action: "submit", value: "hello world" })).toContain("hello world")
    expect(summarizeResult(args, { action: "submit", values: { a: 1 } })).toContain("a=1")
    expect(summarizeResult({ ...args, input: { type: "approve" } }, { action: "cancel" })).toContain("cancelled")
    const r: AskResult = { action: "timeout" }
    expect(summarizeResult(args, r)).toContain("unanswered")
  })

  it("falls back to the raw id when the option is unknown", () => {
    expect(summarizeResult(args, { action: "choose", optionId: "ghost" })).toContain("ghost")
  })
})
