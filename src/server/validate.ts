import type { AskArgs, AskResult } from "../schema/index.js"
import { OTHER_ID } from "../schema/input.js"

/** Semantic validation of a browser submission against the original ask args. */
export function validateResultAgainstArgs(args: AskArgs, result: AskResult): string | null {
  const input = args.input

  switch (input.type) {
    case "approve": {
      if (result.action !== "approve" && result.action !== "reject" && result.action !== "cancel") {
        return `expected approve/reject/cancel, got ${result.action}`
      }
      const required = input.noteRequired ?? "never"
      if (required === "always" && result.action !== "cancel" && !result.note?.trim()) return "a note is required"
      if (required === "on_reject" && result.action === "reject" && !result.note?.trim()) return "a note is required when rejecting"
      return null
    }
    case "single_choice": {
      if (result.action === "cancel") return null
      if (result.action !== "choose" || !result.optionId) return "expected a choice"
      if (result.optionId === OTHER_ID) {
        if (!input.other) return "other input is not enabled for this question"
        if (!result.otherText?.trim()) return "otherText is required when choosing the other option"
        return null
      }
      if (!input.options.some((o) => o.id === result.optionId)) return `unknown optionId: ${result.optionId}`
      return null
    }
    case "multi_choice": {
      if (result.action === "cancel") return null
      if (result.action !== "choose" || !result.optionIds) return "expected choices"
      const min = input.min ?? 0
      const max = input.max ?? input.options.length
      if (result.optionIds.length < min || result.optionIds.length > max) {
        return `expected between ${min} and ${max} selections`
      }
      const known = new Set(input.options.map((o) => o.id))
      if (!result.optionIds.every((id) => known.has(id) || id === OTHER_ID)) return "unknown optionId in selection"
      if (result.optionIds.includes(OTHER_ID)) {
        if (!input.other) return "other input is not enabled for this question"
        if (!result.otherText?.trim()) return "otherText is required when choosing the other option"
      }
      return null
    }
    case "text": {
      if (result.action === "cancel") return null
      if (result.action !== "submit" || result.value === undefined) return "expected text"
      const len = result.value.length
      if (len < (input.minLength ?? 0) || len > (input.maxLength ?? 20_000)) return "text length out of bounds"
      return null
    }
    case "form": {
      if (result.action === "cancel") return null
      if (result.action !== "submit" || result.values === undefined) return "expected form values"
      const props = input.schema.properties
      for (const key of Object.keys(result.values)) {
        if (!(key in props)) return `unknown form field: ${key}`
      }
      for (const key of input.schema.required ?? []) {
        const v = result.values[key]
        if (v === undefined || v === null || v === "") return `missing required field: ${key}`
      }
      for (const [key, f] of Object.entries(props)) {
        const v = result.values[key]
        if (v === undefined || v === null || v === "") continue
        if (f.type === "number" || f.type === "integer") {
          if (typeof v !== "number" || Number.isNaN(v)) return `field ${key} must be a number`
          if (f.type === "integer" && !Number.isInteger(v)) return `field ${key} must be an integer`
          if (f.minimum !== undefined && v < f.minimum) return `field ${key} below minimum`
          if (f.maximum !== undefined && v > f.maximum) return `field ${key} above maximum`
        }
        if (f.type === "string") {
          if (typeof v !== "string") return `field ${key} must be a string`
          if (f.enum && !f.enum.includes(v)) return `field ${key} must be one of the allowed values`
          if (f.minLength !== undefined && v.length < f.minLength) return `field ${key} too short`
          if (f.maxLength !== undefined && v.length > f.maxLength) return `field ${key} too long`
          if (f.format === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return `field ${key} must be an email`
        }
      }
      return null
    }
  }
}
