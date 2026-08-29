import type { AskArgs, InfoBlock } from "../schema/index.js"
import { OTHER_ID } from "../schema/input.js"
import { esc } from "./escape.js"

/** Ids of choice options that already have a matching option_card block. */
function cardCoveredIds(args: AskArgs): Set<string> | null {
  const input = args.input
  if (input.type !== "single_choice" && input.type !== "multi_choice") return null
  const ids = new Set(input.options.map((o) => o.id))
  const covered = new Set<string>()
  for (const b of args.blocks) {
    if (b.type === "option_card" && ids.has(b.id)) covered.add(b.id)
  }
  return covered
}

function optionCard(args: AskArgs, id: string): Extract<InfoBlock, { type: "option_card" }> | undefined {
  const card = args.blocks.find((b: InfoBlock) => b.type === "option_card" && b.id === id)
  return card?.type === "option_card" ? card : undefined
}

function metaClass(meta?: string): string {
  if (!meta) return ""
  const m = meta.toLowerCase()
  if (/(risky|high|irreversible|warn|critical|danger)/.test(m)) return " warn"
  if (/(ready|low|recommended|success|stable)/.test(m)) return " success"
  return ""
}

/** Final pseudo-option holding the free-text escape hatch. */
function otherChoice(kind: "radio" | "checkbox", placeholder?: string): string {
  const ph = esc(placeholder ?? "Type your own…")
  return `<label class="choice choice-other"><input type="${kind}" name="choice" value="${OTHER_ID}">
<span><span class="choice-title">Other</span><input type="text" class="other-input" id="other-input" placeholder="${ph}" aria-label="Other"></span></label>`
}

/** Filter out option_card blocks that duplicate choice options (they are rendered as the choices). */
export function dedupeOptionCards(args: AskArgs): InfoBlock[] {
  const covered = cardCoveredIds(args)
  if (!covered || covered.size === 0) return args.blocks
  return args.blocks.filter((b) => !(b.type === "option_card" && covered.has(b.id)))
}

export function renderInputRegion(args: AskArgs): string {
  const input = args.input
  switch (input.type) {
    case "approve": {
      const placeholder = esc(input.notePlaceholder ?? "Add an optional note…")
      return `
<div class="note-area field" id="note-field" data-note-required="${input.noteRequired ?? "never"}">
  <textarea id="ask-note" placeholder="${placeholder}" aria-label="Note"></textarea>
  <div class="field-error" id="note-error">A note is required.</div>
</div>`
    }
    case "single_choice": {
      const items = input.options
        .map((o) => {
          const card = optionCard(args, o.id)
          const title = card?.title ?? o.label
          const desc = card?.description ?? o.description
          const meta = card?.meta ?? o.meta
          const cls = meta ? ` choice-meta${metaClass(meta)}` : " choice-meta"
          return `<label class="choice"><input type="radio" name="choice" value="${esc(o.id)}">
<span><span class="choice-title">${esc(title)}${meta ? `<span class="${cls.trim()}">${esc(meta)}</span>` : ""}</span>${desc ? `<div class="choice-desc">${esc(desc)}</div>` : ""}</span></label>`
        })
        .join("")
      return `
<div class="choice-list" id="choice-list" role="radiogroup">${items}${input.other ? otherChoice("radio", input.other.placeholder) : ""}</div>`
    }
    case "multi_choice": {
      const min = input.min ?? 0
      const max = input.max ?? input.options.length
      const items = input.options
        .map((o) => {
          const card = optionCard(args, o.id)
          const title = card?.title ?? o.label
          const desc = card?.description ?? o.description
          const meta = card?.meta ?? o.meta
          const cls = meta ? ` choice-meta${metaClass(meta)}` : " choice-meta"
          return `<label class="choice"><input type="checkbox" name="choice" value="${esc(o.id)}">
<span><span class="choice-title">${esc(title)}${meta ? `<span class="${cls.trim()}">${esc(meta)}</span>` : ""}</span>${desc ? `<div class="choice-desc">${esc(desc)}</div>` : ""}</span></label>`
        })
        .join("")
      return `
<div class="choice-list" id="choice-list" data-min="${min}" data-max="${max}">${items}${input.other ? otherChoice("checkbox", input.other.placeholder) : ""}</div>
<div class="field-error" id="choice-error">Select between ${min} and ${max} options.</div>
<div class="choice-count" id="choice-count" hidden></div>`
    }
    case "text": {
      const multiline = input.multiline ?? true
      const placeholder = esc(input.placeholder ?? "")
      const field = multiline
        ? `<textarea id="text-input" placeholder="${placeholder}" data-min="${input.minLength ?? 0}" data-max="${input.maxLength ?? 20000}"></textarea>`
        : `<input type="text" id="text-input" placeholder="${placeholder}" data-min="${input.minLength ?? 0}" data-max="${input.maxLength ?? 20000}">`
      return `
<div class="field" id="text-field">
  <label for="text-input">Response <span class="req" hidden>*</span></label>
  ${field}
  <div class="field-error" id="text-error">Please check the length of your response.</div>
</div>`
    }
    case "form": {
      const fields = Object.entries(input.schema.properties)
        .map(([key, f]) => {
          const req = input.schema.required?.includes(key)
          const reqMark = req ? '<span class="req">*</span>' : ""
          const attrs = [
            req ? 'data-required="1"' : "",
            "minLength" in f && f.minLength !== undefined ? `data-min="${f.minLength}"` : "",
            "maxLength" in f && f.maxLength !== undefined ? `data-max="${f.maxLength}"` : "",
            "minimum" in f && f.minimum !== undefined ? `data-min="${f.minimum}"` : "",
            "maximum" in f && f.maximum !== undefined ? `data-max="${f.maximum}"` : "",
          ]
            .filter(Boolean)
            .join(" ")
          let control: string
          switch (f.type) {
            case "string": {
              const type = f.format === "email" ? "email" : f.format === "uri" ? "url" : f.format === "date" ? "date" : "text"
              if (f.enum) {
                const opts = f.enum
                  .map((v, i) => `<option value="${esc(v)}">${esc(f.enumNames?.[i] ?? v)}</option>`)
                  .join("")
                control = `<select id="f-${esc(key)}" ${attrs}><option value="" ${f.default ? "" : "selected"} disabled></option>${opts}</select>`
              } else {
                control = `<input type="${type}" id="f-${esc(key)}" value="${esc(f.default ?? "")}" ${attrs}>`
              }
              break
            }
            case "number":
            case "integer":
              control = `<input type="number" id="f-${esc(key)}" value="${f.default ?? ""}" ${attrs} ${f.type === "integer" ? 'step="1"' : ""}>`
              break
            case "boolean":
              return `<div class="field check-field" id="field-${esc(key)}">
  <label class="check-row"><input type="checkbox" id="f-${esc(key)}" ${f.default ? "checked" : ""}><span>${esc(f.title)}</span></label>
  <div class="field-error" id="fe-${esc(key)}">Invalid value.</div>
</div>`
          }
          return `<div class="field" id="field-${esc(key)}">
  <label for="f-${esc(key)}">${esc(f.title)} ${reqMark}</label>
  ${control}
  <div class="field-error" id="fe-${esc(key)}">Invalid value.</div>
</div>`
        })
        .join("\n")
      return `
${fields}`
    }
  }
}

/** Primary + secondary buttons for the single actions row. */
export function renderActions(args: AskArgs, allowCancel: boolean): string {
  const input = args.input
  const parts: string[] = []
  switch (input.type) {
    case "approve": {
      const approve = esc(input.approveLabel ?? "Approve")
      const reject = esc(input.rejectLabel ?? "Reject")
      parts.push(`<button type="button" class="btn-primary" id="btn-approve" data-action="approve">${approve}</button>`)
      parts.push(`<button type="button" class="btn-danger" id="btn-reject" data-action="reject">${reject}</button>`)
      break
    }
    case "single_choice":
    case "multi_choice":
      parts.push(`<button type="button" class="btn-primary" id="btn-primary" data-action="choose">Confirm</button>`)
      break
    case "text":
    case "form":
      parts.push(`<button type="button" class="btn-primary" id="btn-primary" data-action="submit">${esc(input.submitLabel ?? "Submit")}</button>`)
      break
  }
  if (allowCancel) {
    parts.push(`<button type="button" class="btn-secondary" id="btn-cancel">Cancel</button>`)
  }
  return parts.join("\n")
}
