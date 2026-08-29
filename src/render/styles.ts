export function pageStyles(density: "comfortable" | "compact"): string {
  const pad = density === "compact" ? "16px" : "26px"
  const gap = density === "compact" ? "12px" : "20px"
  return `
:root {
  --text: rgba(255,255,255,.80); --muted: rgba(255,255,255,.55); --faint: rgba(255,255,255,.42);
  --label: rgba(255,255,255,.70);
  --glass: rgba(255,255,255,.095); --glass-2: rgba(255,255,255,.058);
  --glass-hi: rgba(255,255,255,.13);
  --shell: rgba(255,255,255,.095);
  --well: rgba(0,0,0,.20);
  --well-border: rgba(255,255,255,.07);
  --control: rgba(255,255,255,.062);
  --control-hover: rgba(255,255,255,.092);
  --border: rgba(255,255,255,.12); --border-strong: rgba(255,255,255,.22);
  --control-border: rgba(255,255,255,.36);
  --shadow: 0 18px 56px rgba(0,0,0,.55), 0 2px 10px rgba(0,0,0,.38), 0 0 0 1px rgba(255,255,255,.04);
  --inset-hi: inset 0 1px 0 rgba(255,255,255,.08);
  --accent: #8b93ff; --accent-2: #45c8ff;
  --accent-grad: linear-gradient(135deg, #8b93ff 0%, #6366f1 48%, #38bdf8 100%);
  --accent-soft: rgba(129,140,248,.16); --accent-glow: rgba(99,102,241,.38);
  --sel-fill: #1e2148;
  --danger: #ff7d92; --danger-soft: rgba(244,63,94,.14);
  --success: #3ce0a7; --success-soft: rgba(16,185,129,.13);
  --warn: #ffc757; --warn-soft: rgba(255,199,87,.10);
  --info-soft: rgba(56,189,248,.10);
  --radius: 16px; --radius-sm: 12px; --radius-xs: 8px;
  --pad: ${pad}; --gap: ${gap};
  --font: "Inter", "SF Pro Text", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color-scheme: dark;
}
@media (prefers-color-scheme: light) {
  :root {
    --text: #1c1c1f; --muted: rgba(24,24,27,.60); --faint: rgba(24,24,27,.42);
    --label: rgba(24,24,27,.72);
    --glass: rgba(255,255,255,.68); --glass-2: rgba(255,255,255,.42);
    --glass-hi: rgba(255,255,255,.8);
    --shell: rgba(255,255,255,.68);
    --well: rgba(20,26,45,.04);
    --well-border: rgba(20,26,45,.08);
    --control: rgba(255,255,255,.92);
    --control-hover: rgba(255,255,255,1);
    --border: rgba(20,26,45,.10); --border-strong: rgba(20,26,45,.20);
    --control-border: rgba(20,26,45,.22);
    --shadow: 0 18px 56px rgba(0,0,0,.14), 0 2px 10px rgba(0,0,0,.07);
    --inset-hi: inset 0 1px 0 rgba(255,255,255,.7);
    --accent: #5157d8; --accent-2: #0284c7;
    --accent-grad: linear-gradient(135deg, #6d72f6 0%, #5458e8 48%, #0ea5e9 100%);
    --accent-soft: rgba(99,102,241,.12); --accent-glow: rgba(99,102,241,.25);
    --sel-fill: #edecfc;
    --danger: #dc2626; --danger-soft: rgba(220,38,38,.10);
    --success: #059669; --success-soft: rgba(5,150,105,.10);
    --warn: #b45309; --warn-soft: rgba(180,83,9,.10);
    --info-soft: rgba(2,132,199,.08);
    color-scheme: light;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; min-height: 100vh; color: var(--text);
  font-family: var(--font); font-size: 14px; line-height: 1.55;
  background: #0a0a0c;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  font-feature-settings: "ss01" on, "cv01" on;
}
@media (prefers-color-scheme: light) { body { background: #f2f2f3; } }

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

.bg {
  position: fixed; inset: 0; z-index: -1; overflow: hidden;
  background: linear-gradient(180deg, #0a0a0c 0%, #121214 100%);
}
.bg::before {
  content: ""; position: absolute; inset: 0; opacity: .03;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}
.bg::after {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(120% 90% at 50% 28%, transparent 55%, rgba(0,0,0,.34) 100%);
}
@media (prefers-color-scheme: light) {
  .bg { background: linear-gradient(180deg, #f4f4f5 0%, #ebebed 100%); }
  .bg::before { opacity: .02; }
  .bg::after { background: radial-gradient(120% 90% at 50% 28%, transparent 60%, rgba(0,0,0,.05) 100%); }
}

.wrap { max-width: 740px; margin: 0 auto; padding: clamp(18px, 4vw, 42px) 18px 76px; }
.brand {
  display: flex; align-items: center; gap: 9px; margin: 0 6px 16px;
  font-size: 12px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase;
  color: var(--muted);
}
.brand .dot {
  width: 10px; height: 10px; border-radius: 4px; background: var(--accent-grad);
  box-shadow: 0 0 14px var(--accent-glow);
}
.brand .sep { color: var(--border-strong); font-weight: 400; }

.card {
  position: relative;
  background: var(--shell);
  -webkit-backdrop-filter: blur(16px) saturate(1.35);
  backdrop-filter: blur(16px) saturate(1.35);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--pad) calc(var(--pad) + 8px);
  box-shadow: var(--shadow), var(--inset-hi);
  animation: rise .5s cubic-bezier(.16,.8,.3,1) both;
}
.card::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 1px;
  border-radius: var(--radius) var(--radius) 0 0;
  background: linear-gradient(90deg, transparent 4%, rgba(255,255,255,.18) 50%, transparent 96%);
  pointer-events: none;
}
@media (prefers-color-scheme: light) {
  .card::before { background: linear-gradient(90deg, transparent 4%, rgba(255,255,255,.7) 50%, transparent 96%); }
}

h1 {
  color: #f4f4f5;
  font-size: clamp(1.25rem, 2vw, 1.35rem); font-weight: 650; letter-spacing: -.01em;
  line-height: 1.3; margin: 0 0 6px;
}
@media (prefers-color-scheme: light) { h1 { color: #18181b; } }
.subtitle { color: var(--muted); margin: 0 0 26px; font-size: .8125rem; line-height: 1.5; }

.blocks > :first-child { margin-top: 0; }
.blocks > :last-child { margin-bottom: 0; }
.blocks > * + * { margin-top: calc(var(--gap) * .9); }
.blocks h2, .blocks h3, .blocks h4 { letter-spacing: -.012em; }
.blocks h2 { font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--faint); margin: 30px 0 10px; }
.blocks h3 { font-size: .875rem; font-weight: 600; letter-spacing: -.008em; color: var(--text); margin: 24px 0 8px; }
.blocks h4 { font-size: .8125rem; font-weight: 600; color: var(--muted); margin: 20px 0 6px; }
.blocks h2:first-child, .blocks h3:first-child, .blocks h4:first-child,
.blocks > :first-child:is(h2,h3,h4) { margin-top: 0; }
.blocks > :first-child { margin-top: 0; }
/* keep tighter rhythm for paragraphs/code vs headings handled above */
.blocks p { margin: 0; color: var(--text); line-height: 1.6; max-width: 68ch; }
.md p + p { margin-top: 11px; }
.blocks strong { font-weight: 600; }
.blocks pre {
  background: rgba(0,0,0,.28); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 14px 16px; overflow-x: auto; font-size: 12.5px; line-height: 1.55;
  font-variant-ligatures: none;
  box-shadow: var(--inset-hi);
}
@media (prefers-color-scheme: light) { .blocks pre { background: rgba(255,255,255,.55); } }
.blocks code { font-family: var(--mono); font-size: 12px; font-weight: 500; color: var(--accent); padding: .14em .45em; border-radius: 6px; background: var(--accent-soft); border: 1px solid var(--border); font-variant-ligatures: none; }
.blocks pre code { padding: 0; background: none; border: 0; font-size: 1em; color: var(--text); font-weight: 400; }
.blocks ul { margin: 0; padding-left: 4px; list-style: none; }
.blocks ul li { position: relative; padding-left: 21px; margin-top: 7px; line-height: 1.55; max-width: 68ch; }
.blocks ul li::before {
  content: ""; position: absolute; left: 2px; top: .6em;
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255,255,255,.30);
}
@media (prefers-color-scheme: light) { .blocks ul li::before { background: rgba(24,24,27,.25); } }
.blocks ol { margin: 0; padding-left: 22px; }
.blocks ol li { margin-top: 7px; line-height: 1.55; max-width: 68ch; }
.blocks ol li::marker { color: var(--faint); font-weight: 600; }
.blocks a { color: var(--accent-2); text-decoration: none; border-bottom: 1px solid transparent; }
.blocks a:hover { border-bottom-color: var(--accent-2); }
.blocks blockquote {
  margin: 0; padding: 10px 16px; border-left: 2px solid var(--accent);
  background: var(--accent-soft); border-radius: 0 var(--radius-xs) var(--radius-xs) 0; color: var(--muted);
}
.blocks hr { border: 0; height: 1px; margin: 28px 0;
  background: linear-gradient(90deg, transparent, var(--border-strong), transparent); }

/* Callouts: accent spine on the left — deliberately unlike choice cards */
.callout {
  border: 1px solid var(--border); border-left: 3px solid var(--accent-2);
  border-radius: 6px var(--radius-sm) var(--radius-sm) 6px;
  padding: 13px 17px; background: var(--info-soft);
  font-size: .95em; line-height: 1.6; color: var(--muted);
}
.callout.warn { border-left-color: var(--warn); background: var(--warn-soft); }
.callout.success { border-left-color: var(--success); background: var(--success-soft); }

.steps { margin: 0; padding-left: 0; list-style: none; counter-reset: step; }
.steps li { counter-increment: step; padding: 6px 0 6px 42px; position: relative; line-height: 1.55; }
.steps li + li { margin-top: 3px; }
.steps li::before {
  content: counter(step); position: absolute; left: 0; top: 5px;
  width: 27px; height: 27px; border-radius: 9px;
  background: var(--accent-soft); color: var(--accent);
  border: 1px solid var(--border);
  font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center;
}

.table-scroll { overflow-x: auto; border: 1px solid var(--well-border); border-radius: var(--radius-sm); background: var(--well); box-shadow: inset 0 1px 0 rgba(255,255,255,.03); }
table { width: 100%; border-collapse: collapse; font-size: .93em; }
th, td { text-align: left; padding: 10px 15px; border-bottom: 1px solid var(--border); line-height: 1.5; }
tr:last-child td { border-bottom: 0; }
th { color: var(--faint); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
  border-bottom: 1px solid var(--border-strong); background: rgba(255,255,255,.04); }
@media (prefers-color-scheme: light) { th { background: rgba(20,26,45,.04); } }
tbody tr { transition: background .15s ease; }
tbody tr:hover { background: var(--glass-hi); }

.option-card {
  border: 1px solid var(--well-border); border-radius: var(--radius-sm);
  padding: 13px 16px; background: var(--well);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.03);
}
.option-card .meta { margin-left: 2px; }

/* Choice cards: the interactive core — tighter between related rows */
.choice-list { display: flex; flex-direction: column; gap: 10px; }
.choice {
  position: relative;
  display: flex; gap: 14px; align-items: flex-start; padding: 15px 18px;
  border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer;
  background: var(--control); box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 1px 2px rgba(0,0,0,.14);
  transition: border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease;
  animation: rise .45s cubic-bezier(.16,.8,.3,1) both;
}
.choice-list .choice:nth-child(1) { animation-delay: .04s; }
.choice-list .choice:nth-child(2) { animation-delay: .08s; }
.choice-list .choice:nth-child(3) { animation-delay: .12s; }
.choice-list .choice:nth-child(4) { animation-delay: .16s; }
.choice-list .choice:nth-child(5) { animation-delay: .2s; }
.choice-list .choice:nth-child(6) { animation-delay: .24s; }
.choice-list .choice:nth-child(n+7) { animation-delay: .28s; }
.choice:hover { border-color: var(--border-strong); background: var(--control-hover); transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 4px 14px rgba(0,0,0,.18); }
.choice input {
  appearance: none; -webkit-appearance: none; flex: none;
  width: 21px; height: 21px; margin: 1px 0 0; cursor: pointer;
  border: 2px solid var(--control-border); background: transparent;
  transition: border-color .16s ease, background .16s ease, box-shadow .16s ease;
}
.choice:hover input { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.choice input[type="radio"] { border-radius: 50%; }
.choice input[type="checkbox"] { border-radius: 7px; }
.choice input[type="radio"]:checked {
  border-color: var(--accent);
  background: radial-gradient(circle at center, var(--accent) 0 42%, transparent 47%);
  box-shadow: 0 0 0 3px var(--accent-soft), 0 0 14px var(--accent-glow);
}
.choice input[type="checkbox"]:checked {
  border-color: var(--accent);
  background: var(--accent-grad);
  background-size: 100% 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M3.5 8.5l3 3 6-7' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  box-shadow: 0 0 0 3px var(--accent-soft), 0 0 14px var(--accent-glow);
}
.choice .choice-title { font-weight: 600; font-size: 1em; display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px 9px; letter-spacing: -.005em; }
.choice-meta {
  padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: .02em;
  background: var(--accent-soft); color: var(--accent); border: 1px solid rgba(129,140,248,.35);
}
.choice-meta.success { background: var(--success-soft); color: var(--success); border-color: rgba(16,185,129,.30); }
.choice-meta.warn { background: var(--warn-soft); color: var(--warn); border-color: rgba(255,199,87,.30); }
@media (prefers-color-scheme: light) {
  .choice-meta.success { background: rgba(5,150,105,.10); border-color: rgba(5,150,105,.22); }
  .choice-meta.warn { background: rgba(180,83,9,.10); border-color: rgba(180,83,9,.22); }
}
.choice .choice-desc { color: var(--muted); font-size: 13px; margin-top: 5px; line-height: 1.55; }
.choice .choice-desc code { font-size: .92em; }
/* Selected: gradient border ring + left accent bar + opaque tinted fill + right-edge check badge */
.choice.selected {
  border-color: transparent;
  background-image: linear-gradient(var(--sel-fill), var(--sel-fill)), var(--accent-grad);
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
  box-shadow: inset 3px 0 0 var(--accent), 0 0 0 1px rgba(129,140,248,.35), 0 10px 30px var(--accent-glow), var(--inset-hi);
  transform: translateY(-1px);
}
.choice.selected::after {
  content: ""; position: absolute; top: 13px; right: 13px; width: 20px; height: 20px; border-radius: 50%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='10' fill='%236366f1'/%3E%3Cpath d='M5.5 10.5l3 3 6-7' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");
  background-size: 100% 100%;
  opacity: 0; transform: scale(.5); transition: opacity .18s ease, transform .18s ease;
}
.choice.selected::after { opacity: 1; transform: scale(1); }
.choice.selected .choice-desc { color: rgba(255,255,255,.68); }
@media (prefers-color-scheme: light) { .choice.selected .choice-desc { color: rgba(24,24,27,.68); } }

.choice-count {
  margin-top: 10px; font-size: .85em; color: var(--muted);
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 11px; border-radius: 999px;
  background: var(--glass-2); border: 1px solid var(--border);
}
.choice-count[hidden] { display: none; }

.field { margin-bottom: 14px; }
.field label { display: block; font-weight: 500; margin-bottom: 7px; font-size: .8125rem; color: var(--label); }
.field .req { color: var(--danger); }
.field input[type="text"], .field input[type="email"], .field input[type="number"],
.field input[type="url"], .field input[type="date"], .field textarea, .field select {
  width: 100%; padding: 11px 14px; border: 1px solid var(--border); border-radius: var(--radius-xs);
  background: var(--control); color: var(--text); font: inherit;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 1px 2px rgba(0,0,0,.12);
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.field input::placeholder, .field textarea::placeholder { color: var(--faint); }
.field select { height: calc(1.55em + 24px); }
.field select option { background: #131316; color: var(--text); }
@media (prefers-color-scheme: light) { .field select option { background: #fff; } }
.field input:focus, .field textarea:focus, .field select:focus {
  outline: none; border-color: rgba(129,140,248,.7);
  box-shadow: 0 0 0 3px var(--accent-soft), 0 0 16px var(--accent-glow);
}
.field-error { color: var(--danger); font-size: .87em; margin-top: 6px; display: none; line-height: 1.5; }
.field.invalid .field-error { display: block; }
.field.invalid input, .field.invalid textarea, .field.invalid select { border-color: var(--danger); box-shadow: 0 0 0 3px var(--danger-soft); }
/* Inline boolean: same material as inputs, same check metaphor as choice cards */
.check-row {
  display: flex; align-items: center; gap: 11px; cursor: pointer;
  padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-xs);
  background: var(--control); box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 1px 2px rgba(0,0,0,.12);
  font-weight: 500; font-size: .8125rem; color: var(--label);
  transition: border-color .15s ease, background .15s ease;
}
.check-row:hover { border-color: var(--border-strong); background: var(--control-hover); }
.check-row:has(input:checked) { border-color: rgba(129,140,248,.55); }
@media (prefers-color-scheme: light) { .check-row:has(input:checked) { border-color: rgba(99,102,241,.5); } }
.check-row input {
  appearance: none; -webkit-appearance: none; flex: none; margin: 0; cursor: pointer;
  width: 20px; height: 20px; border: 2px solid var(--control-border); background: transparent;
  border-radius: 6px;
  transition: border-color .16s ease, background .16s ease, box-shadow .16s ease;
}
.check-row input:checked {
  border-color: var(--accent);
  background: var(--accent-grad);
  background-size: 100% 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M3.5 8.5l3 3 6-7' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.note-area { margin: 2px 0 0; }
.note-area textarea { width: 100%; min-height: 78px; resize: vertical; }
#choice-error { margin-top: 10px; }

#input-region { margin-top: 32px; }

.actions {
  position: sticky; bottom: 0; z-index: 5;
  display: flex; gap: 12px; flex-wrap: wrap;
  margin: 32px calc(-1 * var(--pad) - 9px) calc(-1 * var(--pad)) calc(-1 * var(--pad) - 9px);
  padding: 14px calc(var(--pad) + 8px) 16px;
  border-top: 1px solid var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
  background: rgba(10,10,12,.86);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
}
@media (prefers-color-scheme: light) { .actions { background: rgba(245,245,246,.85); } }
button {
  font: inherit; font-weight: 600; padding: 11px 20px;
  border-radius: var(--radius-xs); border: 1px solid transparent; cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease, filter .15s ease, background .15s ease;
}
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button:active:not(:disabled) { transform: translateY(1px); }
.btn-primary {
  min-width: 120px;
  background: var(--accent-grad); color: #fff;
  box-shadow: 0 4px 14px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.25);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 22px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.25); }
.btn-danger {
  background: var(--danger-soft); color: var(--danger); border-color: rgba(244,63,94,.4);
}
.btn-danger:hover:not(:disabled) { background: rgba(244,63,94,.22); }
.btn-secondary {
  background: var(--glass-2); color: var(--muted); border-color: var(--border);
  box-shadow: var(--inset-hi);
}
.btn-secondary:hover:not(:disabled) { color: var(--text); border-color: var(--border-strong); background: var(--glass-hi); }
button:disabled { opacity: .45; cursor: not-allowed; }

.status {
  display: none; margin-top: 22px; padding: 13px 18px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--glass-2);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  align-items: center; gap: 11px; box-shadow: var(--inset-hi);
  font-size: .97em;
}
.status.show { display: flex; }
.status .spinner {
  width: 17px; height: 17px; flex: none; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.status.done { border-color: rgba(16,185,129,.4); color: var(--success); background: var(--success-soft); }
.status.done .spinner { display: none; }
.status.err { border-color: rgba(244,63,94,.45); color: var(--danger); background: var(--danger-soft); }
.status.err .spinner { display: none; }

body.terminal .actions { display: none; }
body.terminal #input-region { opacity: .5; pointer-events: none; user-select: none; }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
[hidden] { display: none !important; }
`.trim()
}
