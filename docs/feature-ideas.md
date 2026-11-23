# ask-mcp feature ideas — the big list

*Brainstorm inventory for expanding the tool's usability and functionality. Nothing here is committed; items graduate into [admin-roadmap.md](admin-roadmap.md) phases or straight to implementation when picked up.*

**How to read:** each item is a one-liner with an effort tag — `[S]` small (hours), `[M]` medium (a day or two), `[L]` large (multi-day / architectural). Items already shipped or already designed in the roadmap are marked ✅ / 🚧. The renderer's invariants hold for everything below: lenient-at-the-edge, strict-inside schemas; single-shot store; best-effort artifacts; no framework in `render/`.

**Current state (v0.4.0) for orientation:** 5 input kinds (`approve`, `single_choice`, `multi_choice`, `text`, `form`), 10 info blocks (heading, paragraph, markdown, callout, steps, option_card, table, diff, tree, divider), Other escape hatch, templates with merge, admin panel (live / history / config / templates), day-partitioned artifacts, SSE live pages, `/api/ask` HTTP twin, stdio + Streamable HTTP transports, `install-commands`.

---

## 1. Input kinds & controls

**Choice & selection**
- [S] `select` — compact dropdown for >6 options (choice cards don't scale past ~10; MAX_OPTIONS is 20).
- [S] Per-option `disabled` flag with a reason — show "unavailable: tests failing" greyed out instead of hiding options.
- [S] Per-option `meta` badge color override (currently keyword-guessed warn/success).
- [M] Option groups — nested optgroups inside choices (`"group": "Databases"`).
- [M] `rating` — 1–N scale with star/number UI and label anchors ("bad" … "great"). *(roadmap)*
- [M] `checklist` — per-item booleans in one control (code-review sign-off: each line gets a checkbox). *(roadmap)*
- [M] `sort`/`rank` — drag to order options; result is the ordered id list. *(roadmap)*
- [M] `pairwise` — head-to-head comparisons ("which diff is better, A or B?") for ranking N items with ceil(N log N) questions.
- [M] Image choices — `option_card` with a `imageUrl` (data-URI) thumbnail; click the picture, not the label.
- [M] Emoji/icon per option — small glyph next to the label for faster scanning.
- [L] Cascading selects — dependent options ("region → availability zone") with a declarative mapping.
- [L] Tree picker — select node(s) from a hierarchy (files, org units, menus).
- [L] Combobox — search-as-you-type over large option sets (>20 without a dropdown).

**Text & data entry**
- [S] `password`/secret input — masked text field whose value is masked in artifacts too (see §13).
- [S] `number` stepper widget for form fields (currently a bare number input).
- [S] Input `pattern` (regex) + custom per-field error message for form fields.
- [M] `datetime` / `time` / `duration` fields using native pickers. *(roadmap: datetime)*
- [M] `color` picker field.
- [M] Tag input — array of short strings with chips ("labels: bug, ui").
- [M] Key-value editor — pairs for env vars, headers, metadata.
- [M] `range`/slider — numeric with min/max/step and live value display.
- [M] `currency`/unit-suffixed numbers (prefix/suffix adornment: `$, ms, %`).
- [M] Code field — monospace textarea with tab support, optional line numbers, language hint for the validation UX (not highlighting).
- [M] Repeatable field groups — array of sub-forms ("add another server"), result as an array of objects.
- [L] Rich-text field — limited markdown editor with toolbar (bold/list/code), stored as markdown.
- [L] JSON field — textarea with live schema validation and pretty-print button.
- [L] File upload — drag/drop or picker, size+MIME allowlist, delivered as base64 with hash; artifacts store the file separately.
- [L] Image paste — clipboard paste of screenshots into a `file` field (great for "which one looks broken?").
- [L] Sketch/annotate pad — canvas draw or mark up a provided screenshot; result is a PNG data-URI ("circle the broken part").
- [L] Signature pad — stylized canvas draw, result as SVG/PNG (approval with a human touch).
- [?] Voice input — Web Speech API dictation into text fields (progressive enhancement, graceful fallback).

**Approval extensions**
- [S] `typeToConfirm` — destructive approves require typing a string ("type `production` to confirm").
- [S] Countdown-gated confirm — approve button disabled for N seconds ("read the diff first").
- [M] Approve with checkboxes — require ticking "I verified the checklist" items before Approve lights up.
- [M] Split approve — three-way: approve / approve-with-note / reject (rejection reasons as structured choices, not free text).
- [M] `quorum` approve — N of M named humans must approve (see §10 multi-user).
- [S] `escalate` button — "wake me later" returns `{action: "snooze"}` with a delay the agent should honor.

## 2. Blocks & content presentation

- [S] `diff` block — +/- line styling, file headers, unified or split; content plain-text (escaped), no highlighting needed. *(roadmap)*
- [S] `code` block — language-hinted monospace with copy button; optional naive token coloring via a tiny highlighter. *(roadmap)*
- [S] `image` block — data-URI images with alt text and optional caption. *(roadmap)*
- [S] `link` block / link buttons — labeled outbound links (rel=noopener) for "open the PR", "view the logs".
- [S] `key_value` block — definition list of label→value rows (build info, params).
- [S] `badges` block — row of status chips (counts, envs, tags).
- [M] `metrics` block — inline SVG sparklines / big-number stats. *(roadmap)*
- [M] `chart` block — simple bar/line charts from inline data (hand-rolled SVG, no deps).
- [M] `progress` block — static progress bar in context ("3 of 5 steps done so far").
- [M] `list` block — ordered/unordered with optional per-item icons (check/cross/warn), nested one level.
- [M] `quote` block — attribution-styled citation.
- [M] `collapsible` block — accordion-wrapped markdown ("details" summary) for long content that shouldn't dominate.
- ✅ `tree` block — branch flow (org-chart) or indented hierarchy, with per-node status dots, notes, and meta badges. *(shipped)*
- [M] `log` block — monospace tail with auto-scroll cap and "show all" expander.
- [L] `mermaid` block — diagrams; client-side render from a pinned, CSP-safe bundled renderer, or accept pre-rendered SVG only (safer).
- [L] `comparison` block — two-column pro/con or A/B layout (option cards generalize, but side-by-side reads better).
- [S] Block anchors — stable ids so links/notifications can deep-link to a specific block ("see table above").

## 3. Form engine

- [S] Conditional visibility — `visibleIf: {field: value}` show/hide rules with re-validation on change.
- [S] Per-field `help` text and examples below the input (description exists; add richer hint slot).
- [S] Cross-field validation — `minimum <= maximum` style field-pair rules.
- [S] Autofocus first required field on load.
- [S] Enter submits single-line text; Cmd/Ctrl+Enter submits multiline and forms.
- [M] Multi-step wizard — form split into `steps: [{title, fields}]` with per-step validation and a progress indicator.
- [M] Draft autosave — localStorage per ask token; reopen restores partial answers after accidental close/refresh.
- [M] Prefill overrides — caller supplies `defaults` at ask time (agent knows half the answers; user corrects).
- [M] Field `unit` + `placeholder` + `prefix`/`suffix` adornments.
- [M] Input masks — light phone/date/credit-card style formatting on entry.
- [M] Server-side draft persistence for cross-device resume (draft saved with the spec).
- [M] Sections/groups — form fields grouped under sub-headings with dividers.
- [M] `requiredIf` — conditional required (same shape as visibleIf).
- [L] Computed/read-only fields — display-only values mixed into forms (echo resolved config back).
- [L] Inline table editor — edit rows of a table block in place (the "review this CSV" ask).
- [L] Schema composition — `allOf`/`oneOf`-ish branches in the form schema for polymorphic answers.

## 4. Ask lifecycle & flow

- [S] Extend button on the expiring page — "give me 5 more minutes" bumps the deadline once (result notes the extension).
- [S] Countdown timer visible on the page ("expires in 9:32") with a subtle progress bar.
- [M] `onTimeout` policy — `default: <optionId>` / `auto_approve: false` / `auto_reject` — timeout returns a *declared* default instead of a bare timeout, so agents can plan for it.
- [M] `remind` — re-nudge via desktop notification after N minutes of no interaction (page is still open).
- [M] Re-ask from admin — clone any history/pending spec as a fresh ask ("that timed out, ask again"). *(roadmap)*
- [M] Amend window — allow the user to edit their answer for N seconds after submit (store keeps `submitted` → `amended` transition, result notes the edit).
- [M] Batch asks — one page, several independent inputs ("approve deploy + pick region + rate the plan"); result is a keyed map of results.
- [M] Sequential chained asks — a `flow` template: answer to Q1 selects which Q2 template fires, all in one blocking call.
- [L] Multi-user approval chains — route to person A, escalate to B on timeout, require both (needs identity, see §10).
- [L] Deferred asks — schedule the *ask* for later ( cron or delay), result stored for the agent to fetch (see `ask_results`).
- [S] `dryRun`/preview flag — validate + render + archive the spec but return immediately without blocking (agent can check its own form before the real ask).
- [M] `echo` result — include the resolved spec (post-template-merge) in the response so callers see exactly what was asked.

## 5. Actions & result shape

- [S] Custom action buttons — `actions: [{id, label, style, confirm?}]` rendered alongside/instead of the primary input; result is `{action: "custom", id}` ("Run tests again", "Open dashboard", "Skip this step").
- [S] `confirm` flag on actions — secondary confirmation dialog before firing.
- [S] Result metadata block — time-to-answer, extension count, amend count, answering device (from UA) appended to structured content.
- [M] Per-option follow-up — answer "Later" and the page immediately asks the follow-up defined on that option (`then: {…mini-spec}`), single blocking call.
- [M] Structured note prompts on choices — choosing an option can require per-option note ("why not now?").
- [M] `answer_summary` override — caller-provided format string for the `content[0].text` line (e.g. `"Chose {optionId} at {time}"`).
- [L] Result attachments — files/URLs the user attaches to any action (screenshot of the error, link to the run).

## 6. Non-blocking & parallel surfaces

- [S] `notify` tool — fire-and-forget toast/card, auto-dismiss, no blocking. *(roadmap)*
- [M] `ask_async` / `ask_result` — queue a question, keep working, collect the answer later or next turn. *(roadmap)*
- [M] Progress asks — agent pushes progress updates to a pending/ask page (`POST /f/:token/progress`, agent-authenticated): "step 2/5: running migrations…". *(roadmap)*
- [M] Live blocks — agent appends/updates a block on a *pending* ask (a streaming log the user watches while deciding).
- [M] Multi-ask inbox — one URL listing all pending asks across clients, answerable in place (the admin "Live" tab, promoted to a user-facing surface).
- [L] Streaming partial result — submit happens, agent gets `submitted` early, final `consumed` update later (needs MCP progress notifications).
- [L] Conversation mode — a persistent page where the user and agent exchange multiple asks/messages in one session (turns into a mini chat surface).

## 7. Templates & authoring

- [S] Template preview button in admin — render the spec to HTML in a modal before saving.
- [S] Template `examples` field — sample arguments the model can imitate when invoking.
- [M] Template parameters — `"{{branch}}"` placeholders filled from call-time `args` (template becomes a function).
- [M] Template inheritance — `extends: "deploy-confirm"` with overlay patches (DRY for variants).
- [M] Import/export — JSON download/upload buttons; share template packs as files.
- [M] Template versioning — `version` field + history of edits stored alongside; pin callers to versions.
- [M] Per-template overrides — a template can carry its own `timeoutMs`, `density`, `openBrowser: false` (push-based asks shouldn't pop a tab).
- [M] Usage stats per template surfaced in the Templates tab (times used, approval rate, last used).
- [L] Visual form builder — drag/drop block and field composition in admin; emits the same JSON (no framework rule may bend here — evaluate honestly).
- [L] Template lint suggestions — "this choice has 14 options; consider a select", "noteRequired always but notePlaceholder missing".
- [L] Shared template registry — fetch/install curated packs from a git repo or npm (`ask-mcp install-templates <pkg>`).

## 8. Analytics & reporting

- [S] Stats computed from artifacts at request time — approval rate, cancel rate, timeout rate, median/p95 response time (admin Server tab already promises "health of last N asks").
- [S] Per-day and per-template filters on those stats.
- [M] Option distribution — which choice ids win, per template (spot dead options).
- [M] Response-time heatmap by hour/day — when is the human actually at the keyboard.
- [M] Breakdown by caller — group stats by agent/client identity (needs per-agent tokens, §13).
- [M] Export — CSV/JSON download of filtered history.
- [M] Digest — weekly summary notify ("34 asks, 88% approved, median 41s, 3 timed out").
- [M] Signal detection — asks re-asked within 5 minutes or immediately cancelled by the agent = friction flags surfaced in admin.
- [L] Full-text search over notes and specs (needs an index — see §14).
- [L] Prometheus `/metrics` endpoint — counters/histograms for scrape-based monitoring.
- [L] OpenTelemetry spans around the ask lifecycle for distributed tracing setups.

## 9. Admin panel

- [S] Search/filter on history (by title, action, template, status).
- [S] Tag/label asks; filter by tag.
- [S] Clone/edit-from-history — open an old spec in the Templates editor.
- [S] Theme toggle (light/dark/system) for the panel.
- [M] Re-ask + cancel-all + bulk actions on the pending list. *(re-ask: roadmap)*
- [M] Config hot reload — SIGHUP + panel button reloads everything reloadable. *(roadmap)*
- [M] Token management UI — generate/revoke per-agent tokens (backs §13), stored in the config file.
- [M] Audit log tab — every admin write (config change, template edit, cancel, login) as an event stream, exportable.
- [M] Storage usage view — bytes per day, projection to retention horizon, one-click wipe of a day.
- [M] Artifact download — a day or a range as a zip.
- [M] Webhooks config UI — manage the §11 outbound hooks from the panel.
- [M] Mobile layout pass for the panel (answer-on-your-phone administration).
- [M] Command palette / keyboard shortcuts in the panel (jump to tabs, copy form URLs).
- [L] Multi-instance switcher — point the panel at several running ask-mcp servers (home + work + CI).
- [L] Live render preview pane — click any pending ask and see the exact form the user sees, side by side with the spec.
- [L] Admin activity2FA — TOTP step on login for panel access.
- [L] i18n of the panel (same strings, locale files).

## 10. Delivery channels & devices

- [S] Desktop notification on new ask (Notification API from an open admin tab or a tiny service worker page).
- [S] Tab title flash + favicon badge while pending ("(1) Deploy? — ask-mcp").
- [S] QR code for the form URL — pop a terminal/panel QR to answer from the phone (essential when host ≠ loopback).
- [M] Sound cues — config: chime on open, different tone on submit (respect reduced-motion/sound preferences).
- [M] Email delivery — SMTP or transactional-API webhook sends the form link (form still served by ask-mcp; token is the capability).
- [M] Slack/Discord/Telegram bots — message with buttons; button press posts back to `/f/:token/submit` (each channel is a small adapter + message-format mapper).
- [M] Multi-user identity — named users with their own capability links; result records who answered (unlocks quorum, escalation, per-person stats).
- [L] Native shell — menu-bar/tray app (macOS/Windows) listing pending asks with native notifications.
- [L] PWA manifest for form pages — installable, own window, badge count.
- [L] Browser extension — toolbar badge + popup listing pending asks on any page.
- [L] IDE plugins — VS Code/JetBrains surface pending asks as a native dialog that proxies to the same endpoints.
- [L] TUI mode — render the ask in the terminal (ANSI) for SSH/headless-adjacent workflows; same store, different renderer.
- [L] iOS/Android shortcuts integration — "Ask ask-mcp" share-sheet action.
- [L] Watch/companion glanceable approve (approve/deny only, full form on phone).

## 11. Hooks, automation & running code during asks

- [S] `onAsk` / `onSettle` shell hooks — configured commands run on lifecycle events with a JSON payload on stdin (the general "extra code during calls" primitive; webhooks are a special case).
- [S] Outbound webhooks — POST result JSON to configured URLs on settle; HMAC-signed, allowlisted hosts, retry with backoff. *(roadmap)*
- [M] `runOnAnswer` — per-ask or per-template command executed after settle with the result as input (`"open the dashboard if approved"`), output appended to the result as `sideEffect` info.
- [M] Scheduled asks — cron inside the server fires template asks proactively; results stored for agent retrieval via `ask_results(since=…)`. *(roadmap)*
- [M] Auto-responder policy engine — rules like "template `ci-approve` with meta low-risk auto-approves in CI hours" (explicit, logged, auditable; never for `noteRequired` asks).
- [M] Env-gated CI mode — `ASK_MCP_AUTO_APPROVE=template-id` auto-settles matching asks for pipelines, with a banner recorded in the artifact.
- [L] Plugin system — JS modules loaded at boot extending blocks, inputs, hooks, and renderers behind the same schemas (`registerBlock("chart", …)`).
- [L] Scripted asks — a `script` field on a template runs a sandboxed function at ask time to compute defaults/blocks (template becomes a program; needs a hardened interpreter — vm/worker + resource caps).

## 12. Integrations & ecosystem

- [M] GitHub Actions step — official `ask-mcp-approval` action: gate a workflow on a human answer (pairs with CI mode).
- [M] MCP resources — expose history/templates as `resources/read` so clients can browse artifacts natively.
- [M] MCP prompts — ship canned prompt templates ("review this deploy ask output and summarize").
- [M] OpenAPI schema for `/api/*` — generated spec + hosted docs page.
- [M] n8n / Zapier / Make nodes — webhook-first integration is cheap once §11 lands.
- [M] Home Assistant integration — approve-from-the-wall-panel via the HA webhook/notify path.
- [M] Raycast / Alfred extensions — global shortcut shows pending asks.
- [L] Client libraries — thin Python/Go/TS wrappers over `/api/ask` for non-MCP scripts.
- [L] Linear/Jira/GitHub issue creation from ask results (via runOnAnswer recipes rather than hard-coded integrations).
- [L] Obsidian plugin — append ask/response artifacts to daily notes (decision journal).
- [L] `ask` CLI — `ask-mcp ask "Ship it?" --choice a,b` for humans in shells (uses the same HTTP API).

## 13. Security & multi-agent

- [M] Per-agent tokens — distinct credentials per client with: allowed templates, max pending, rate limit, and identity shown on the form ("asked by deploy-bot"). *(quotas: roadmap)*
- [M] Admin action audit trail — append-only, per-event records with hash chaining (tamper-evident).
- [M] Secret masking — `password`/`secret` field values stored redacted in artifacts (form still works; disk keeps `***`).
- [M] PII redaction mode — regex-based scrubbing of artifacts on write.
- [M] Artifact encryption at rest — age/X25519-encrypted JSON files, key from env/file.
- [M] CSRF hardening for form posts — per-ask nonce embedded in the page and required on submit (token URLs are already capabilities; this adds origin safety).
- [S] Short-lived capability URLs — form links expire with the ask (they already do implicitly via store TTL; make the page itself 410 after settle instead of a status view, config-gated).
- [L] Remote-host hardening pack — mTLS, signed pages, per-link one-time tokens for non-loopback deployments.
- [L] Encrypted transport for LAN use — self-signed cert generation + `--https` flag.
- [L] Scope-limited ask tokens — an agent whose token allows only templates can never render arbitrary content (content-injection containment).

## 14. Storage & search

- [M] Optional SQLite index alongside JSON artifacts — fast queries for history search/stats without changing the artifact trail (the trail stays the source of truth).
- [M] JSONL event log — append-only stream of every lifecycle event (feeds audit, analytics, replay).
- [M] Per-template retention overrides — approvals kept 90 days, casual text asks 7.
- [L] Full-text search index over notes/answers/blocks (FTS5 or a tiny inverted index over JSON).
- [L] Remote artifact sink — mirror artifacts to S3/GCS/B2 for durability beyond the laptop.
- [L] Export/import — full data-dir archive/restore (machine migration).
- [L] Decision journal view — render history as a human-readable markdown timeline of decisions made.

## 15. Rendering, themes & UX polish

- [S] System dark/light adaptation via `prefers-color-scheme` (pages are dark-glass today; a light variant broadens appeal).
- [S] Accent color per ask (subtle brand/hue shift per template or caller).
- [S] "Your answer was recorded" settle view — show what was answered + a permalink, with a config-gated auto-close delay (current behavior slams shut in 600ms).
- [S] Copy buttons on code/table/diff blocks.
- [M] Light theme + full theme tokens in config (`accent`, `radius`, `density` beyond current comfortable/compact).
- [M] Custom CSS injection — config-provided stylesheet appended last (escaped, CSP-allowlisted via a hash).
- [M] Branding — logo/title-suffix/footer per config (white-labeling for teams).
- [M] i18n of the chrome — UI strings (buttons, status messages) in locale files; ask content stays as-authored.
- [M] RTL layout support.
- [M] Reduced-motion respect across all animations; larger touch targets on mobile.
- [M] Table block pagination/sort/long-value truncation with expand.
- [M] Image lightbox for image blocks.
- [L] Print stylesheet — artifact `render.html` prints as a clean one-pager (attachment for audit docs).
- [L] A11y audit pass — full keyboard nav order, ARIA live regions for status, focus trapping in dialogs.
- [L] Animation personality pack — subtle motion presets per theme (still no framework; CSS only).

## 16. MCP platform features

- [S] Tool annotations — declare `readOnlyHint`, `destructiveHint`, `idempotencyHint` on `ask`/`ask_templates` for smarter clients.
- [S] Server `instructions` field — tell clients how to author good asks (the README's authoring guidance, machine-readable).
- [M] Cancellation propagation — MCP `notifications/cancelled` from the client should cancel the matching pending ask (currently the call just dies; the ask lingers to timeout).
- [M] Progress notifications during the blocking call — periodic MCP progress messages so clients don't show a dead spinner ("still waiting, 3m elapsed").
- [M] Session-bound asks — optionally bind a pending ask to the MCP session that created it; results only consumable by that session.
- [M] Dynamic tool listing — expose `ask_templates` only when templates exist; expose `notify`/`ask_async` per config.
- [L] MCP elicitation support — where the client supports the 2025 elicitation primitive, use it first and fall back to browser pages (opposite priority of today's browser-first).
- [L] MCP Apps surface — the designed-but-deferred in-client rendering (see [surface-a-mcp-apps.md](surface-a-mcp-apps.md)).
- [L] Sampling integration — let the *user's* answer trigger a model call (summarize their note, normalize their form data) before returning.

## 17. Ops, DX & distribution

- [S] `--print-url` / `openBrowser: "print"` — log the form URL instead of opening a browser (SSH dev boxes).
- [S] `doctor` subcommand — checks port, data dir writability, config validity, token presence, prints a health report.
- [S] Structured logging — `--log-format json`, log levels, optional log file; request logging for /api and /mcp.
- [M] `stats` subcommand — print the §8 summary in the terminal.
- [M] Homebrew formula + npm dist-tags workflow; Docker image with volume docs.
- [M] `--dev` mode — hot-reload render/* on change (local development ergonomics; the restart-to-see-changes gotcha disappears).
- [M] Update check — flag + notify when a newer npm version exists (no phone-home beyond a registry HEAD request).
- [L] Portable mode — data dir resolved next to the binary when `--data-dir .` (USB/ephemeral runs).
- [L] Windows service / launchd / systemd unit generators (`ask-mcp install-service`).
- [L] Bench harness — scripted 1k-ask soak to pin memory/latency characteristics in CI.

## 18. Wilder ideas (moonshots)

- Prediction calibration asks — tiny "will tests pass? yes/no" asks logged over time; analytics chart the user's and the agent's calibration.
- Meeting/kiosk mode — project an ask full-screen with giant touch targets for standup voting.
- Deliberation mode — ask → user requests "show me option A's diff" (agent pushes a live block) → then answer; a two-turn dance inside one blocking call.
- Crowd asks — one ask URL, N respondents, aggregated result with per-person breakdown.
- Ask templates from history — "make this a template" button mines past ad-hoc asks into recipes automatically.
- Agent-authored asks with human review — agents draft new templates via a special ask; approval publishes them.
- Offline PWA queue — answer on a plane; page syncs when connectivity returns (single-shot semantics get interesting).
- Emotion/urgency signals — explicit urgency field on asks drives channel choice (urgent → SMS + sound; casual → passive badge).
- Barge-in — the user injects a message into the agent *through* a pending ask page ("actually, also update the docs") delivered as an extra result field.
- Time-travel replay — scrub through a day's asks as a slideshow of archived renders (screen-recording of decisions).

---

## Picking next

High value ÷ low effort candidates if picking a next release: §5 custom action buttons, §1 typeToConfirm + countdown approve, §2 diff/code/image blocks, §15 settle-view fix, §16 tool annotations + cancellation propagation, §11 onSettle webhooks. These deepen the core loop (better asks, safer destructive ops, more honest results) before widening the surface (channels, multi-user, automation).
