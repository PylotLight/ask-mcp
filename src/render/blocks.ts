import type { InfoBlock } from "../schema/index.js"
import { esc } from "./escape.js"
import { renderMarkdown } from "./markdown.js"

export function renderBlock(block: InfoBlock): string {
  switch (block.type) {
    case "heading": {
      const level = block.level ?? 2
      const h = Math.min(level + 1, 4) // page h1 is the title
      return `<h${h}>${esc(block.text)}</h${h}>`
    }
    case "paragraph":
      return `<p>${esc(block.text)}</p>`
    case "markdown":
      return `<div class="md">${renderMarkdown(block.markdown)}</div>`
    case "callout":
      return `<div class="callout ${block.variant}" role="note">${esc(block.text)}</div>`
    case "steps":
      return `<ol class="steps">${block.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>`
    case "option_card": {
      const desc = block.description ? `<div class="choice-desc">${esc(block.description)}</div>` : ""
      const meta = block.meta ? `<span class="meta">${esc(block.meta)}</span>` : ""
      return `<div class="option-card" data-option-id="${esc(block.id)}"><div class="choice-title">${esc(block.title)} ${meta}</div>${desc}</div>`
    }
    case "table": {
      const head = `<tr>${block.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>`
      const rows = block.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")
      return `<div class="table-scroll"><table>${head}${rows}</table></div>`
    }
    case "divider":
      return "<hr>"
  }
}
