import type { InfoBlock, TreeNode } from "../schema/index.js"
import { esc } from "./escape.js"
import { renderMarkdown } from "./markdown.js"

function treeStatus(node: TreeNode): string {
  return node.status ?? "neutral"
}

function treeHead(node: TreeNode, includeMeta = true): string {
  const meta = includeMeta && node.meta ? `<span class="tree-meta">${esc(node.meta)}</span>` : ""
  return `<span class="tree-dot status-${treeStatus(node)}" aria-hidden="true"></span><span class="tree-title">${esc(node.title)}</span>${meta}`
}

function renderFlowNode(node: TreeNode): string {
  const note = node.note ? `<div class="tree-note">${esc(node.note)}</div>` : ""
  const meta = node.meta ? `<span class="tree-meta">${esc(node.meta)}</span>` : ""
  const children = node.children?.length
    ? `<ul>${node.children.map(renderFlowNode).join("")}</ul>`
    : ""
  return `<li><div class="tree-node status-${treeStatus(node)}"><div class="tree-node-head">${treeHead(node, false)}</div>${note}${meta}</div>${children}</li>`
}

function renderListNode(node: TreeNode): string {
  const meta = node.meta ? `<span class="tree-meta">${esc(node.meta)}</span>` : ""
  const note = node.note ? `<div class="tree-note">${esc(node.note)}</div>` : ""
  const children = node.children?.length
    ? `<ul>${node.children.map(renderListNode).join("")}</ul>`
    : ""
  return `<li><div class="tree-row"><span class="tree-dot status-${treeStatus(node)}" aria-hidden="true"></span><span class="tree-title">${esc(node.title)}</span>${meta}</div>${note}${children}</li>`
}

function renderTree(block: Extract<InfoBlock, { type: "tree" }>): string {
  if (block.layout === "list") {
    return `<div class="tree-list"><ul>${renderListNode(block.root)}</ul></div>`
  }
  return `<div class="tree-flow"><ul>${renderFlowNode(block.root)}</ul></div>`
}

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
    case "diff": {
      let added = 0
      let removed = 0
      const rows = block.diff
        .split("\n")
        .map((line) => {
          const cls =
            line.startsWith("@@")
              ? "hunk"
              : line.startsWith("diff --git") ||
                  line.startsWith("index ") ||
                  line.startsWith("old mode ") ||
                  line.startsWith("new mode ") ||
                  line.startsWith("rename ") ||
                  line.startsWith("--- ") ||
                  line.startsWith("+++ ")
                ? "meta"
                : line.startsWith("+")
                  ? (added++, "add")
                  : line.startsWith("-")
                    ? (removed++, "del")
                    : "ctx"
          return `<span class="dl ${cls}">${esc(line) || "&nbsp;"}</span>`
        })
        .join("")
      const name = block.path ?? "diff"
      const head = `<div class="diff-head"><code>${esc(name)}</code><span class="diff-stats"><em class="add">+${added}</em> <em class="del">&minus;${removed}</em></span></div>`
      return `<div class="diff-block">${head}<div class="diff-body">${rows}</div></div>`
    }
    case "tree":
      return renderTree(block)
    case "divider":
      return "<hr>"
  }
}
