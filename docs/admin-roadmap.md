# ask-mcp admin panel & interaction roadmap

*Exploration document — what ask-mcp becomes when the camera turns around.*

## The core idea

ask-mcp is already four things stapled together:

1. an in-memory **pending store** (state machine per ask),
2. an **artifact trail** on disk (every spec/response/render),
3. an **SSE fan-out** to live pages,
4. a **rendering pipeline** with a strict, validated spec language.

An admin panel is not a new product — it's ask-mcp rendering *its own state* through the same pipeline. The human becomes the client that inspects and drives the server, instead of the one being asked. Everything below reuses those four primitives; nothing needs a rewrite.

## Phase 1 — Admin dashboard (read-mostly)

A single page at `/admin`, same glass design system, gated by its own token.

- **Auth**: `--admin-token` (falls back to `--auth-token`). Browser-friendly: `POST /admin/login` sets an `HttpOnly` cookie (constant-time compare); all `/admin*` routes check it. No cookie without a configured token → 404 (don't reveal the surface).
- **Live view**: pending asks with title, age, input kind, requestId; deep-link opens the form; one-click cancel (uses the existing `store.cancel` — the agent gets `{action: "cancel"}` exactly as if the person closed the tab).
- **History**: day-partitioned artifact browser — list days → asks, filter by status/action, view `spec.json`/`response.json` side by side, open `render.html` or re-render live from spec (the renderer is pure: `renderPage(args, …)`).
- **Server**: version, uptime, flags, pending count, artifact disk usage, health of the last N asks (approval rate, median response time — computed from artifacts).
- **Prereq**: `PendingStore` gains a tiny event emitter (`onCreate/onSettle`) so `/admin/events` can be a real SSE stream instead of polling; the existing per-form polling stays as-is.

## Phase 2 — Actions & config management

- **Actions**: cancel pending, *re-ask* (clone a spec as a fresh ask — great for "that timed out, ask me again"), token rotation, retention wipe (both confirmed through ask-mcp's own `approve` pipeline — the panel dogfoods the tool for every destructive op).
- **Config file**: `~/.config/ask-mcp/config.json` (timeout, retention, tokens, density, open behavior) with CLI > env > file precedence; `SIGHUP`/panel button reloads. The admin panel becomes a *form over config* — the exact thing ask-mcp renders best.
- **Ask templates ("recipes")**: named, hand-tuned specs (`deploy-confirm`, `db-migration`) the agent can reference by id: `{ "input": { "template": "deploy-confirm" } }`. Templates are edited in the panel, stored in the data dir, and validated with the same schemas. This turns one-off prompt engineering into durable, reviewable interaction assets.

## Phase 3 — Richer interaction surface

New tool shapes (each is small on top of the existing state machine):

- **`notify`** — the missing non-blocking counterpart: show a toast/card, return immediately. Approve-style surface with auto-dismiss; no form, no blocking.
- **`ask_async` / `ask_result`** — queue a question, keep working, fetch the answer later (or have it delivered next turn). Enables parallel asks and "collect these three decisions while you're at it".
- **Progress asks** — a long tool call renders a progress card the agent can update via an agent-authenticated `POST /f/:token/progress`; the page finally shows *what* is happening instead of a spinner.
- **New input kinds**: `checklist` (per-item booleans — code review sign-off), `rating` (1–N scale with labels), `datetime` (native pickers), and `sort/rank` (drag to order options).
- **New blocks**: `diff` (with +/- line styling), `image` (data-URI; CSP already allows `img-src data:`), `code` (highlighted, the renderer already has a safe escape-first pipeline to build on), `metrics` (inline SVG sparklines).

## Phase 4 — Beyond the tab

- **Webhook routing**: POST every result to a configured URL (Slack webhook, n8n, a log pipeline) — ask-mcp becomes a general human-in-the-loop bus, not just a tab.
- **Scheduled asks**: cron inside the server fires asks proactively ("confirm the 9am deploy"); results stored for agent retrieval via `ask_results(since=…)`.
- **Reverse asks** (experimental): MCP's Streamable HTTP allows server→client requests. Where a client supports it, the *human* could inject context into the agent session from the panel. Design carefully — this inverts the trust model.
- **Multi-agent**: per-client tokens + quotas (max pending asks, rate limits) so several agents can share one ask-mcp without stampeding the user.

## Security posture per phase

| Phase | New surface | Mitigations |
| --- | --- | --- |
| 1 | `/admin` read + cookie auth | token-gated, HttpOnly, no enumeration, read-only |
| 2 | writes (cancel/re-ask/config) | destructive ops re-confirmed through the ask pipeline; config writes versioned (`config.json.bak`) |
| 3 | new tools/routes | same schema-strict, capability-token model; progress updates authenticated to the calling client |
| 4 | outbound + multi-tenant | webhook allowlist, per-token quotas, secrets never rendered into pages |

## What we deliberately don't do

- No database — the artifact trail *is* the store; retention handles growth.
- No framework for the panel — one hand-rolled page, same pattern as the form (a `render` module + one client script). If it outgrows that, it earns a framework.
- No remote-first design — loopback stays the default; anything else is an explicit `--host` + token decision.
