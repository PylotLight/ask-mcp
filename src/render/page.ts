import type { AskArgs } from "../schema/index.js"
import type { PendingStatus } from "../store/pending.js"
import { renderBlock } from "./blocks.js"
import { clientScript } from "./client.js"
import { esc } from "./escape.js"
import { dedupeOptionCards, renderActions, renderInputRegion } from "./input.js"
import { pageStyles } from "./styles.js"

export function renderPage(args: AskArgs, token: string, status: PendingStatus, density: "comfortable" | "compact" = "comfortable"): string {
  const pending = status === "pending"
  const blocksHtml = dedupeOptionCards(args).map(renderBlock).join("\n")
  const inputHtml = pending ? `<div id="input-region">${renderInputRegion(args)}</div>` : ""
  const actionsHtml = pending
    ? `<div class="actions">${renderActions(args, args.options?.allowCancel !== false)}</div>`
    : ""
  const subtitle = args.subtitle ? `<p class="subtitle">${esc(args.subtitle)}</p>` : ""

  return `<!doctype html>
<html lang="${esc(args.options?.locale ?? "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'">
<title>${esc(args.title)} — ask-mcp</title>
<style>${pageStyles(density)}</style>
</head>
<body data-token="${esc(token)}" data-status="${status}">
<div class="bg" aria-hidden="true"><div class="bg-glow-2"></div></div>
<div class="wrap">
<header class="brand"><span class="dot"></span>ask<span class="sep">/</span>mcp</header>
<main class="card">
<h1>${esc(args.title)}</h1>
${subtitle}
<div class="blocks">${blocksHtml}</div>
${inputHtml}
${actionsHtml}
<div class="status" id="status-box" role="status" aria-live="polite">
  <div class="spinner" id="status-spinner"></div><span id="status-msg"></span>
</div>
</main>
</div>
<script>${clientScript(args)}</script>
</body>
</html>`
}

/** Shown when a form token is unknown, expired, or pruned. */
export function renderGonePage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Unavailable — ask-mcp</title>
<style>${pageStyles("comfortable")}</style>
</head>
<body>
<div class="wrap">
<main class="card">
<h1>This question is no longer available</h1>
<p class="subtitle">It was answered, cancelled, or expired — you can safely close this tab.</p>
</main>
</div>
</body>
</html>`
}
