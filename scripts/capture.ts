import { renderPage } from "../src/render/page.ts";
import { mkdirSync, writeFileSync } from "node:fs";

type Viewport = { name: string; width: number; height: number };
type Fixture = Record<string, any>;

const fixtures: Record<string, Fixture> = {
  "approve-min": {
    title: "Deploy confirmation",
    subtitle: "Staging looks good — proceed to prod?",
    blocks: [
      { type: "paragraph", text: "CI passed (23 checks), image sha 9f3a1c, no migrations. Prod deploy will take ~4 min." },
      { type: "callout", variant: "info", text: "Approve to deploy now, or reject with a note." },
    ],
    input: { type: "approve" as const },
    options: { density: "comfortable" as const },
  },
  "single-2": {
    title: "Pick a region",
    blocks: [{ type: "paragraph", text: "Where should we deploy?" }],
    input: {
      type: "single_choice" as const,
      options: [
        { id: "us", label: "US East", description: "Low latency for most users", meta: "recommended" },
        { id: "eu", label: "EU West", description: "GDPR-friendly", meta: "low risk" },
      ],
    },
    options: { density: "comfortable" as const },
  },
  "multi-4": {
    title: "Select features for beta",
    subtitle: "Pick 1–3 to ship next week",
    blocks: [{ type: "paragraph", text: "Bundle size budget is tight." }],
    input: {
      type: "multi_choice" as const,
      min: 1,
      max: 3,
      options: [
        { id: "search", label: "Search", description: "Full-text with filters", meta: "ready" },
        { id: "realtime", label: "Realtime sync", description: "Live cursors, presence", meta: "beta" },
        { id: "offline", label: "Offline mode", description: "Queue writes, replay on reconnect", meta: "risky" },
        { id: "themes", label: "Themes", description: "Dark/light + custom", meta: "low effort" },
      ],
    },
    options: { density: "comfortable" as const },
  },
  "choice-other": {
    title: "Choose a release channel",
    subtitle: "Pick one — or define your own",
    blocks: [{ type: "paragraph", text: "Typing in the Other field auto-selects it; empty Other blocks submit." }],
    input: {
      type: "single_choice" as const,
      options: [
        { id: "stable", label: "Stable", description: "Monthly cadence, fully baked", meta: "recommended" },
        { id: "canary", label: "Canary", description: "Weekly, early features" },
        { id: "lts", label: "LTS", description: "Quarterly, security-only" },
      ],
      other: { placeholder: "e.g. shadow — mirror prod traffic, zero responses" },
    },
    options: { density: "comfortable" as const },
  },
  "form-6": {
    title: "New service scaffold",
    blocks: [{ type: "paragraph", text: "Fill the service manifest — required fields marked *." }],
    input: {
      type: "form" as const,
      submitLabel: "Create",
      schema: {
        type: "object" as const,
        properties: {
          name: { type: "string" as const, title: "Service name", minLength: 3 },
          port: { type: "integer" as const, title: "Port", minimum: 1024, maximum: 65535, default: 8787 },
          replicas: { type: "number" as const, title: "Replicas", minimum: 1, maximum: 10 },
          contact: { type: "string" as const, title: "Contact email", format: "email" as const },
          env: {
            type: "string" as const,
            title: "Environment",
            enum: ["dev", "staging", "prod"] as any,
            enumNames: ["Development", "Staging", "Production"],
          },
          public: { type: "boolean" as const, title: "Public endpoint", default: false },
        },
        required: ["name", "port", "env"],
      },
    },
    options: { density: "comfortable" as const },
  },
  "blocks-full": {
    title: "Full block showcase",
    subtitle: "Every block type at comfortable density",
    blocks: [
      { type: "heading", level: 2, text: "Overview" },
      { type: "paragraph", text: "This fixture exercises all info block types." },
      { type: "callout", variant: "warn", text: "Warn callout — irreversible action inside." },
      { type: "callout", variant: "success", text: "Success callout — checks passed." },
      { type: "table", headers: ["Phase", "Scope", "Owner"], rows: [["1", "Gateway", "you"], ["2", "Migration", "platform"]] },
      { type: "steps", items: ["Land PR", "Add admin view", "Dual-read 24h"] },
      { type: "markdown", markdown: "### Details\n\n- PendingStore keeps map + promise\n- `pruneTerminal()` after TTL." },
      { type: "divider" },
      { type: "option_card", id: "opt-a", title: "Option A", description: "Description for A", meta: "low risk" },
    ],
    input: { type: "text" as const, multiline: true, placeholder: "Add notes…", submitLabel: "Submit" },
    options: { density: "comfortable" as const },
  },
  "longPlan": {
    title: "Migration plan — Consolidate auth, billing, and search",
    subtitle: "Review the 3-phase rollout + risks before approving.",
    blocks: [
      { type: "heading", level: 2, text: "Summary" },
      {
        type: "paragraph",
        text: "We will consolidate three legacy services (auth-v1, billing-worker, search-proxy) into a single gateway (api-gateway v2). Total scope: ~1,400 lines, 23 endpoints, 3 DB migrations. Timeline: 11 days across 3 phases.",
      },
      { type: "callout", variant: "warn", text: "Risks: Phase 2 drops legacy_token column (irreversible without PITR). Phase 3 enables public endpoints — requires WAF review." },
      { type: "heading", level: 3, text: "Phase breakdown" },
      {
        type: "table",
        headers: ["Phase", "Scope", "Owner", "Days", "Risk"],
        rows: [
          ["1 — Gateway", "Route auth/billing through v2", "you", "3", "low"],
          ["2 — Migration", "ALTER TABLE users DROP COLUMN legacy_token", "platform", "4", "high — irreversible"],
          ["3 — Cutover", "DNS → v2, deprecate v1", "infra", "4", "medium — WAF"],
        ],
      },
      {
        type: "steps",
        items: [
          "Land visual overhaul + store event emitter (this PR)",
          "Add /admin live view gated by admin token",
          "Run dual-read 24h, compare p95, error budget <0.2%",
          "Execute DROP COLUMN with 8s downtime window",
          "Cutover DNS, monitor 5xx",
          "Announce, archive v1",
        ],
      },
      { type: "heading", level: 3, text: "Detailed design" },
      {
        type: "markdown",
        markdown:
          "### Storage\n\n- **PendingStore** keeps map + promise, `pruneTerminal()` after TTL.\n- Artifacts write `spec.json` best-effort.\n\n```\nPOST /f/:token/submit → store.finish() → MCP structuredContent\n```\n\n> Note: Current glass + indigo gradient feels generic — high blur, low contrast.",
      },
      {
        type: "callout",
        variant: "info",
        text: "Blocking ask keeps agent paused until you answer. If you close tab, server cancels (res.on close) and agent proceeds.",
      },
      { type: "divider" },
    ],
    input: {
      type: "approve" as const,
      approveLabel: "Approve plan",
      rejectLabel: "Request changes",
      noteRequired: "on_reject" as const,
      notePlaceholder: "What needs to change? Be specific.",
    },
    options: { density: "comfortable" as const },
  },
};

const defaultViewports: Viewport[] = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop13", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "mac-1727", width: 1727, height: 1117 },
];

function parseArgs() {
  const only = Bun.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
  const w = Bun.argv.find((a) => a.startsWith("--w="))?.split("=")[1];
  const h = Bun.argv.find((a) => a.startsWith("--h="))?.split("=")[1];
  return { only, w: w ? Number(w) : undefined, h: h ? Number(h) : undefined };
}

const { only, w, h } = parseArgs();

let viewports = defaultViewports;
if (w && h) viewports = [{ name: `custom-${w}x${h}`, width: w, height: h }];
else if (Bun.argv.includes("--mac-only")) viewports = [{ name: "mac-1727", width: 1727, height: 1117 }];

const fixtureEntries = only ? ([[only, fixtures[only]]] as const) : (Object.entries(fixtures) as [string, Fixture][]);
if (only && !fixtures[only]) {
  console.error(`unknown fixture ${only}, known: ${Object.keys(fixtures).join(", ")}`);
  process.exit(1);
}

mkdirSync("/tmp/captures", { recursive: true });
mkdirSync("/tmp/ask-fixtures", { recursive: true });

for (const [k, args] of fixtureEntries) {
  const html = renderPage(args as any, "tok-" + k, "pending", (args as any).options?.density ?? "comfortable");
  writeFileSync(`/tmp/ask-fixtures/${k}.html`, html);
  writeFileSync(`/tmp/captures/${k}.html`, html);
}
console.log(`wrote ${fixtureEntries.length} fixtures → /tmp/ask-fixtures/*.html + /tmp/captures/*.html`);

const t0 = performance.now();

const jobs: Promise<string>[] = [];
for (const [k] of fixtureEntries) {
  for (const vp of viewports) {
    jobs.push(
      (async () => {
        await using view: any = new (Bun as any).WebView({ width: vp.width, height: vp.height });
        await view.navigate(`file:///tmp/ask-fixtures/${k}.html`);
        // settle: allow rise animation (.5s) + fonts
        await new Promise((r) => setTimeout(r, 620));
        try {
          await view.evaluate("document.fonts.ready");
        } catch {}
        await new Promise((r) => setTimeout(r, 60));
        const png = await view.screenshot();
        const out = `/tmp/captures/${k}-${vp.name}-${vp.width}x${vp.height}.png`;
        await Bun.write(out, png);
        return out;
      })(),
    );
  }
}

const results = await Promise.all(jobs);
const dt = ((performance.now() - t0) / 1000).toFixed(2);
console.log(`captured ${results.length} screenshots in ${dt}s`);
for (const r of results) console.log(r);

// Quick layout assertions using a dedicated view (avoids polluting the capture set)
try {
  await using probe: any = new (Bun as any).WebView({ width: 1727, height: 1117 });
  // Probe longPlan: sticky bar in viewport at scroll 0?
  await probe.navigate(`file:///tmp/ask-fixtures/longPlan.html`);
  await new Promise((r) => setTimeout(r, 620));
  const longCheck = await probe.evaluate(`JSON.stringify({
    approveTop: document.querySelector('#btn-approve')?.getBoundingClientRect().top ?? null,
    approveInViewport: (()=>{ const r=document.querySelector('#btn-approve')?.getBoundingClientRect(); return r ? r.top >=0 && r.top < window.innerHeight : null })(),
    innerH: window.innerHeight,
    cardBlur: getComputedStyle(document.querySelector('.card')).backdropFilter || getComputedStyle(document.querySelector('.card')).webkitBackdropFilter || null,
    radii: getComputedStyle(document.querySelector('.card')).borderRadius,
    btnRadius: getComputedStyle(document.querySelector('.btn-primary')).borderRadius,
    actionsSticky: getComputedStyle(document.querySelector('.actions')).position
  })`);
  console.log("assert:longPlan", longCheck);

  // Hardened probe: pin check mid-page (while the card still extends past the viewport),
  // plus end-of-page check that the bar sits flush on the card's bottom shelf.
  await probe.evaluate(`(function(){
    var cardBottomAbs = document.querySelector('.card').getBoundingClientRect().bottom + window.scrollY;
    var maxPin = Math.max(0, cardBottomAbs - window.innerHeight); // last scroll pos where the bar can still pin
    window.scrollTo({ top: maxPin * 0.5, behavior: "instant" });
    return maxPin;
  })()`);
  await new Promise((r) => setTimeout(r, 300));
  const midScrollCheck = await probe.evaluate(`JSON.stringify((function(){
    var a = document.querySelector('.actions').getBoundingClientRect();
    var c = document.querySelector('.card').getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      actionsBottom: Math.round(a.bottom),
      innerH: window.innerHeight,
      pinned: Math.abs(a.bottom - window.innerHeight) <= 2,
      approveVisible: (()=>{ var r=document.querySelector('#btn-approve').getBoundingClientRect(); return r.top >= a.top && r.bottom <= a.bottom })()
    };
  })())`);
  console.log("assert:longPlan@midScroll", midScrollCheck);
  await probe.evaluate('window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" })');
  await new Promise((r) => setTimeout(r, 300));
  const endScrollCheck = await probe.evaluate(`JSON.stringify((function(){
    var a = document.querySelector('.actions').getBoundingClientRect();
    var c = document.querySelector('.card').getBoundingClientRect();
    return { scrollY: Math.round(window.scrollY), barFlushWithCard: Math.abs(a.bottom - c.bottom) <= 2 };
  })())`);
  console.log("assert:longPlan@endScroll", endScrollCheck);

  // Probe form-6: inline boolean
  await probe.navigate(`file:///tmp/ask-fixtures/form-6.html`);
  await new Promise((r) => setTimeout(r, 620));
  const formCheck = await probe.evaluate(`JSON.stringify({
    checkRow: !!document.querySelector('.check-row'),
    checkRowBorderRadius: document.querySelector('.check-row') ? getComputedStyle(document.querySelector('.check-row')).borderRadius : null,
    checkInput: document.querySelector('.check-row input') ? getComputedStyle(document.querySelector('.check-row input')).width : null,
    selectHeight: document.querySelector('.field select') ? Math.round(document.querySelector('.field select').getBoundingClientRect().height) : null,
    inputHeight: document.querySelector('.field input[type="email"]') ? Math.round(document.querySelector('.field input[type="email"]').getBoundingClientRect().height) : null
  })`);
  console.log("assert:form-6", formCheck);

  // Probe choice-other: type into Other -> pseudo-option auto-selects via client JS
  await probe.navigate(`file:///tmp/ask-fixtures/choice-other.html`);
  await new Promise((r) => setTimeout(r, 620));
  await probe.evaluate(`(function(){ var i=document.getElementById('other-input'); i.value='shadow traffic'; i.dispatchEvent(new Event('input')); })()`);
  const otherCheck = await probe.evaluate(`JSON.stringify({
    otherInputPresent: !!document.getElementById('other-input'),
    autoSelected: (function(){ var b=document.querySelector('input[name="choice"][value="__other__"]'); return b ? b.checked : null })(),
    selectedClassApplied: !!document.querySelector('.choice-other.selected'),
    emptyOtherBlocked: (function(){
      var b=document.querySelector('input[name="choice"][value="__other__"]');
      b.checked = false; b.dispatchEvent(new Event('change'));
      return document.getElementById('choice-list').classList.contains('invalid');
    })()
  })`);
  console.log("assert:choice-other", otherCheck);
} catch (e) {
  console.warn("assert probe failed", e);
}
