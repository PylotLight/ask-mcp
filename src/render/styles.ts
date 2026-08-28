export function pageStyles(density: "comfortable" | "compact"): string {
  const pad = density === "compact" ? "16px" : "26px"
  const gap = density === "compact" ? "12px" : "20px"
  return `
:root {
  --text: #eef0f6; --muted: #a9b1c9; --faint: #7d859c;
  --glass: rgba(255,255,255,.055); --glass-2: rgba(255,255,255,.035);
  --glass-hi: rgba(255,255,255,.09);
  --border: rgba(255,255,255,.10); --border-strong: rgba(255,255,255,.20);
  --control-border: rgba(255,255,255,.34);
  --shadow: 0 24px 70px rgba(2,6,18,.55), 0 2px 8px rgba(2,6,18,.4);
  --inset-hi: inset 0 1px 0 rgba(255,255,255,.09);
  --accent: #8b93ff; --accent-2: #45c8ff;
  --accent-grad: linear-gradient(135deg, #8b93ff 0%, #6366f1 48%, #38bdf8 100%);
  --accent-soft: rgba(129,140,248,.16); --accent-glow: rgba(99,102,241,.38);
  --sel-fill: #1e2148;
  --danger: #ff7d92; --danger-soft: rgba(244,63,94,.14);
  --success: #3ce0a7; --success-soft: rgba(16,185,129,.13);
  --warn: #ffc757; --warn-soft: rgba(245,158,11,.13);
  --info-soft: rgba(56,189,248,.10);
  --radius: 28px; --radius-sm: 17px; --radius-xs: 11px;
  --pad: ${pad}; --gap: ${gap};
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color-scheme: dark;
}
@media (prefers-color-scheme: light) {
  :root {
    --text: #191d2b; --muted: #4d5468; --faint: #6d7488;
    --glass: rgba(255,255,255,.62); --glass-2: rgba(255,255,255,.42);
    --glass-hi: rgba(255,255,255,.8);
    --border: rgba(20,26,45,.10); --border-strong: rgba(20,26,45,.22);
    --control-border: rgba(20,26,45,.38);
    --shadow: 0 24px 70px rgba(31,41,80,.18), 0 2px 8px rgba(31,41,80,.08);
    --inset-hi: inset 0 1px 0 rgba(255,255,255,.65);
    --accent: #5157d8; --accent-2: #0284c7;
    --accent-grad: linear-gradient(135deg, #6d72f6 0%, #5458e8 48%, #0ea5e9 100%);
    --accent-soft: rgba(99,102,241,.12); --accent-glow: rgba(99,102,241,.25);
    --sel-fill: #edecfc;
    --danger: #dc2626; --danger-soft: rgba(220,38,38,.10);
    --success: #059669; --success-soft: rgba(5,150,105,.10);
    --warn: #b45309; --warn-soft: rgba(217,119,6,.12);
    --info-soft: rgba(2,132,199,.08);
    color-scheme: light;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; min-height: 100vh; color: var(--text);
  font-family: var(--font); font-size: 15px; line-height: 1.6;
  letter-spacing: .005em;
  background: #0a0c14;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: light) { body { background: #edf0f8; } }

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

.bg { position: fixed; inset: 0; z-index: -1; overflow: hidden; background: linear-gradient(180deg, #0b0e18 0%, #0a0c14 55%, #0c0a16 100%); }
.bg::before, .bg::after { content: ""; position: absolute; border-radius: 50%; filter: blur(90px); }
.bg::before {
  width: 60vmax; height: 60vmax; top: -28vmax; left: -12vmax;
  background: radial-gradient(circle at 35% 40%, rgba(99,102,241,.5), rgba(99,102,241,0) 62%);
}
.bg::after {
  width: 55vmax; height: 55vmax; bottom: -26vmax; right: -14vmax;
  background: radial-gradient(circle at 60% 55%, rgba(56,189,248,.34), rgba(168,85,247,.22) 55%, rgba(56,189,248,0) 72%);
}
.bg-glow-2 {
  position: absolute; width: 34vmax; height: 34vmax; top: -10vmax; right: -8vmax; border-radius: 50%;
  filter: blur(80px);
  background: radial-gradient(circle at 50% 50%, rgba(168,85,247,.26), rgba(236,72,153,.10) 55%, transparent 75%);
}
@media (prefers-color-scheme: light) {
  .bg { background: linear-gradient(180deg, #f2f4fb 0%, #eceffb 55%, #f0ecf9 100%); }
  .bg::before { background: radial-gradient(circle at 35% 40%, rgba(99,102,241,.30), rgba(99,102,241,0) 62%); }
  .bg::after { background: radial-gradient(circle at 60% 55%, rgba(56,189,248,.22), rgba(168,85,247,.14) 55%, rgba(56,189,248,0) 72%); }
}

.wrap { max-width: 740px; margin: 0 auto; padding: clamp(18px, 4vw, 42px) 18px 76px; }
.brand {
  display: flex; align-items: center; gap: 9px; margin: 0 6px 16px;
  font-size: 12.5px; font-weight: 650; letter-spacing: .14em; text-transform: uppercase;
  color: var(--muted);
}
.brand .dot {
  width: 10px; height: 10px; border-radius: 4px; background: var(--accent-grad);
  box-shadow: 0 0 14px var(--accent-glow);
}
.brand .sep { color: var(--border-strong); font-weight: 400; }

.card {
  position: relative;
  background: var(--glass);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  backdrop-filter: blur(28px) saturate(1.6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--pad) calc(var(--pad) + 8px);
  box-shadow: var(--shadow), var(--inset-hi);
  animation: rise .5s cubic-bezier(.16,.8,.3,1) both;
}
.card::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 1px;
  border-radius: var(--radius) var(--radius) 0 0;
  background: linear-gradient(90deg, transparent 4%, rgba(255,255,255,.28) 50%, transparent 96%);
  pointer-events: none;
}
@media (prefers-color-scheme: light) {
  .card::before { background: linear-gradient(90deg, transparent 4%, rgba(255,255,255,.9) 50%, transparent 96%); }
}

h1 {
  font-size: clamp(1.42rem, 2.8vw, 1.68rem); font-weight: 750; letter-spacing: -.021em;
  line-height: 1.22; margin: 0 0 8px;
}
.subtitle { color: var(--muted); margin: 0 0 26px; font-size: 1.02em; line-height: 1.55; }

.blocks > :first-child { margin-top: 0; }
.blocks > :last-child { margin-bottom: 0; }
.blocks > * + * { margin-top: calc(var(--gap) * .9); }
.blocks h2, .blocks h3, .blocks h4 { margin: 0 0 7px; letter-spacing: -.012em; }
.blocks p { margin: 0; color: var(--text); line-height: 1.65; }
.md p + p { margin-top: 11px; }
.blocks strong { font-weight: 680; }
.blocks pre {
  background: rgba(0,0,0,.28); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 14px 16px; overflow-x: auto; font-size: .88em; line-height: 1.55;
  box-shadow: var(--inset-hi);
}
@media (prefers-color-scheme: light) { .blocks pre { background: rgba(255,255,255,.55); } }
.blocks code { font-family: var(--mono); font-size: .88em; padding: .14em .45em; border-radius: 6px; background: var(--accent-soft); border: 1px solid var(--border); }
.blocks pre code { padding: 0; background: none; border: 0; font-size: 1em; }
.blocks ul { margin: 0; padding-left: 4px; list-style: none; }
.blocks ul li { position: relative; padding-left: 21px; margin-top: 7px; line-height: 1.55; }
.blocks ul li::before {
  content: ""; position: absolute; left: 2px; top: .6em;
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent-grad); opacity: .85;
}
.blocks ol { margin: 0; padding-left: 22px; }
.blocks ol li { margin-top: 7px; line-height: 1.55; }
.blocks ol li::marker { color: var(--accent); font-weight: 650; }
.blocks a { color: var(--accent-2); text-decoration: none; border-bottom: 1px solid transparent; }
.blocks a:hover { border-bottom-color: var(--accent-2); }
.blocks blockquote {
  margin: 0; padding: 10px 16px; border-left: 2px solid var(--accent);
  background: var(--accent-soft); border-radius: 0 var(--radius-xs) var(--radius-xs) 0; color: var(--muted);
}
.blocks hr { border: 0; height: 1px; margin: calc(var(--gap) + 2px) 0;
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
  font-size: .78rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
}

.table-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--glass-2); }
table { width: 100%; border-collapse: collapse; font-size: .93em; }
th, td { text-align: left; padding: 10px 15px; border-bottom: 1px solid var(--border); line-height: 1.5; }
tr:last-child td { border-bottom: 0; }
th { color: var(--muted); font-weight: 650; font-size: .76em; text-transform: uppercase; letter-spacing: .08em;
  border-bottom: 1px solid var(--border-strong); background: var(--glass-2); }
tbody tr { transition: background .15s ease; }
tbody tr:hover { background: var(--glass-hi); }

.option-card {
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 13px 16px; background: var(--glass-2);
  box-shadow: var(--inset-hi);
}
.option-card .meta { margin-left: 2px; }

/* Choice cards: the interactive core */
.choice-list { display: flex; flex-direction: column; gap: 12px; }
.choice {
  position: relative;
  display: flex; gap: 14px; align-items: flex-start; padding: 15px 18px;
  border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer;
  background: var(--glass-2); box-shadow: var(--inset-hi);
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
.choice:hover { border-color: var(--border-strong); background: var(--glass-hi); transform: translateY(-1px); }
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
.choice .choice-title { font-weight: 660; font-size: 1.02em; display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px 9px; letter-spacing: -.005em; }
.choice-meta {
  padding: 2px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 650; letter-spacing: .02em;
  background: var(--accent-soft); color: var(--accent); border: 1px solid rgba(129,140,248,.35);
}
.choice .choice-desc { color: var(--muted); font-size: .9em; margin-top: 5px; line-height: 1.58; }
.choice .choice-desc code { font-size: .92em; }
/* Selected: gradient border ring + opaque tinted fill + right-edge check badge */
.choice.selected {
  border-color: transparent;
  background-image: linear-gradient(var(--sel-fill), var(--sel-fill)), var(--accent-grad);
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;
  box-shadow: 0 0 0 1px rgba(129,140,248,.35), 0 10px 30px var(--accent-glow), var(--inset-hi);
  transform: translateY(-1px);
}
.choice.selected::after {
  content: ""; position: absolute; top: 13px; right: 13px; width: 20px; height: 20px; border-radius: 50%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='10' fill='%236366f1'/%3E%3Cpath d='M5.5 10.5l3 3 6-7' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");
  background-size: 100% 100%;
  opacity: 0; transform: scale(.5); transition: opacity .18s ease, transform .18s ease;
}
.choice.selected::after { opacity: 1; transform: scale(1); }
.choice.selected .choice-desc { color: var(--text); opacity: .78; }

.choice-count {
  margin-top: 10px; font-size: .85em; color: var(--muted);
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 11px; border-radius: 999px;
  background: var(--glass-2); border: 1px solid var(--border);
}
.choice-count[hidden] { display: none; }

.field { margin-bottom: 16px; }
.field label { display: block; font-weight: 650; margin-bottom: 7px; font-size: .95em; letter-spacing: -.005em; }
.field .req { color: var(--danger); }
.field input[type="text"], .field input[type="email"], .field input[type="number"],
.field input[type="url"], .field input[type="date"], .field textarea, .field select {
  width: 100%; padding: 11px 14px; border: 1px solid var(--border); border-radius: var(--radius-xs);
  background: var(--glass-2); color: var(--text); font: inherit;
  box-shadow: var(--inset-hi);
  transition: border-color .15s ease, box-shadow .15s ease;
}
.field input::placeholder, .field textarea::placeholder { color: var(--faint); }
.field select option { background: #141828; color: var(--text); }
.field input:focus, .field textarea:focus, .field select:focus {
  outline: none; border-color: rgba(129,140,248,.7);
  box-shadow: 0 0 0 3px var(--accent-soft), 0 0 16px var(--accent-glow);
}
.field-error { color: var(--danger); font-size: .87em; margin-top: 6px; display: none; line-height: 1.5; }
.field.invalid .field-error { display: block; }
.field.invalid input, .field.invalid textarea, .field.invalid select { border-color: var(--danger); box-shadow: 0 0 0 3px var(--danger-soft); }
.note-area { margin: 2px 0 0; }
.note-area textarea { width: 100%; min-height: 78px; resize: vertical; }
#choice-error { margin-top: 10px; }

#input-region { margin-top: calc(var(--gap) + 6px); }

.actions {
  display: flex; gap: 12px; margin-top: 24px; padding-top: 20px;
  border-top: 1px solid var(--border); flex-wrap: wrap;
}
button {
  font: inherit; font-weight: 660; letter-spacing: .005em; padding: 11px 24px;
  border-radius: 13px; border: 1px solid transparent; cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease, filter .15s ease, background .15s ease;
}
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button:active:not(:disabled) { transform: translateY(1px); }
.btn-primary {
  min-width: 128px;
  background: var(--accent-grad); color: #fff; font-size: 1.02em;
  box-shadow: 0 4px 18px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.25);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 26px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.25); }
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
  display: none; margin-top: 22px; padding: 13px 18px; border-radius: 14px;
  border: 1px solid var(--border); background: var(--glass-2);
  -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
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
