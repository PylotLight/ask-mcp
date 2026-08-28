import type { AskArgs, AskResult } from "../schema/index.js"

function labelFor(args: AskArgs, id: string): string {
  if (args.input.type === "single_choice" || args.input.type === "multi_choice") {
    return args.input.options.find((o) => o.id === id)?.label ?? id
  }
  return id
}

function clip(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

export function summarizeResult(args: AskArgs, r: AskResult): string {
  const note = r.note ? ` (note: ${clip(r.note)})` : ""
  switch (r.action) {
    case "approve":
      return `User approved "${args.title}".${note}`
    case "reject":
      return `User rejected "${args.title}".${note}`
    case "choose": {
      if (r.optionIds?.length) {
        return `User selected: ${r.optionIds.map((id) => labelFor(args, id)).join(", ")}.${note}`
      }
      if (r.optionId) {
        return `User chose "${labelFor(args, r.optionId)}".${note}`
      }
      return `User made a choice.${note}`
    }
    case "submit": {
      if (r.value !== undefined) return `User provided text: "${clip(r.value, 500)}".${note}`
      if (r.values) {
        const pairs = Object.entries(r.values).map(([k, v]) => `${k}=${clip(String(v), 80)}`)
        return `User submitted form: ${pairs.join(", ") || "(empty)"}.${note}`
      }
      return `User submitted.${note}`
    }
    case "cancel":
      return "User cancelled without answering."
    case "timeout":
      return "No user response before the timeout; treat the question as unanswered and proceed accordingly."
  }
}
