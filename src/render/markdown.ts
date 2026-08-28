import { esc } from "./escape.js"

/**
 * Minimal, safe markdown: escape everything first, then apply a small
 * inline/block transform set. Raw HTML is never passed through.
 */
export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n")
  const out: string[] = []
  let inCode = false
  let codeLines: string[] = []
  let listItems: string[] = []
  let listOrdered = false
  let paraLines: string[] = []

  const flushList = (): void => {
    if (listItems.length) {
      const tag = listOrdered ? "ol" : "ul"
      out.push(`<${tag}>${listItems.map((li) => `<li>${inline(li)}</li>`).join("")}</${tag}>`)
      listItems = []
      listOrdered = false
    }
  }
  const flushPara = (): void => {
    if (paraLines.length) {
      out.push(`<p>${inline(paraLines.join(" "))}</p>`)
      paraLines = []
    }
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${esc(codeLines.join("\n"))}</code></pre>`)
        codeLines = []
        inCode = false
      } else {
        flushList()
        flushPara()
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushList()
      flushPara()
      const level = heading[1]!.length
      out.push(`<h${level + 1}>${inline(heading[2]!)}</h${level + 1}>`) // h2..h4, page title owns h1
      continue
    }
    if (/^\s*([-*])\s+/.test(line)) {
      if (listOrdered) flushList()
      flushPara()
      listOrdered = false
      listItems.push(line.replace(/^\s*([-*])\s+/, ""))
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushPara()
      if (!listOrdered) flushList()
      listOrdered = true
      listItems.push(line.replace(/^\s*\d+[.)]\s+/, ""))
      continue
    }
    if (/^\s*>\s?/.test(line)) {
      flushList()
      flushPara()
      out.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ""))}</blockquote>`)
      continue
    }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      flushList()
      flushPara()
      out.push("<hr>")
      continue
    }
    if (line.trim() === "") {
      flushList()
      flushPara()
      continue
    }
    paraLines.push(line.trim())
  }
  if (inCode && codeLines.length) out.push(`<pre><code>${esc(codeLines.join("\n"))}</code></pre>`)
  flushList()
  flushPara()
  return out.join("\n")
}

function inline(s: string): string {
  let t = esc(s)
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>")
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>")
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>')
  return t
}
