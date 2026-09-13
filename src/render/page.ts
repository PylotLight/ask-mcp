import type { AskArgs } from "../schema/index.js"
import type { PendingStatus } from "../store/pending.js"
import type { FormTheme, ThemeMotion } from "../config.js"
import { renderBlock } from "./blocks.js"
import { clientScript } from "./client.js"
import { esc } from "./escape.js"
import { dedupeOptionCards, renderActions, renderInputRegion } from "./input.js"
import { pageStyles } from "./styles.js"

export interface ThemeOptions {
  stars?: number
  motion?: ThemeMotion
}

export function renderPage(args: AskArgs, token: string, status: PendingStatus, density: "comfortable" | "compact" = "comfortable", settleViewMs = 3000, theme: FormTheme = "minimal", themeOpts: ThemeOptions = {}): string {
  const pending = status === "pending"
  const safeTheme = theme === "starfield" || theme === "dots" || theme === "contour" ? theme : "minimal"
  const starCount = Number.isInteger(themeOpts.stars) ? Math.max(0, Math.min(5000, themeOpts.stars as number)) : 1000
  const motion: ThemeMotion = themeOpts.motion === "subtle" || themeOpts.motion === "still" ? themeOpts.motion : "full"
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
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:">
<title>${esc(args.title)} — ask-mcp</title>
<style>${pageStyles(density)}</style>
</head>
<body data-token="${esc(token)}" data-status="${status}" data-theme="${safeTheme}" data-stars="${starCount}" data-motion="${motion}">
<div class="bg" aria-hidden="true"><span class="bg-stars"></span><span class="bg-stars-bright"></span><span class="bg-shoot"></span></div>
<div class="wrap">
<header class="brand"><span class="dot"></span>ask<span class="sep">/</span>mcp</header>
<main class="card">
<p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>${esc(eyebrowFor(args))}</p>
<h1>${esc(args.title)}</h1>
${subtitle}
<div class="blocks">${blocksHtml}</div>
${inputHtml}
${actionsHtml}
<section class="settle" id="settle-view" hidden role="status" aria-live="polite">
  <h2 id="settle-title">Answer recorded</h2>
  <p class="settle-summary" id="settle-summary"></p>
  <p class="settle-link">Permalink to this answer:<span class="permalink-row"><code id="settle-permalink"></code><button type="button" class="btn-secondary btn-sm" id="btn-copy">Copy</button></span></p>
  <p class="settle-countdown" id="settle-countdown" hidden>Closing in <b id="settle-secs">3</b>s<span class="countdown-track" aria-hidden="true"><span class="countdown-fill" id="settle-progress"></span></span></p>
  <div class="settle-actions">
    <button type="button" class="btn-primary" id="btn-close">Close now</button>
    <button type="button" class="btn-secondary" id="btn-stay" hidden>Stay open</button>
  </div>
</section>
<div class="status" id="status-box" role="status" aria-live="polite">
  <div class="spinner" id="status-spinner"></div><span id="status-msg"></span>
</div>
</main>
</div>
<script>${clientScript(args, settleViewMs)}</script>
</body>
</html>`
}

/** One-line summary of what kind of answer is needed, shown above the title. */
export function eyebrowFor(args: AskArgs): string {
  const input = args.input
  switch (input.type) {
    case "approve": return "Approval needed"
    case "single_choice": return `Pick 1 of ${input.options.length + (input.other ? 1 : 0)}`
    case "multi_choice": {
      const min = input.min ?? 0
      const max = input.max ?? input.options.length
      return min === max ? `Pick ${max}` : `Pick ${min}–${max}`
    }
    case "text": return "Your answer needed"
    case "form": return `Form · ${Object.keys(input.schema.properties).length} fields`
  }
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
