# Admin panel

ask-mcp ships a token-gated admin surface at `/admin` for managing asks, config, and templates. It reuses the same primitives as the ask tool itself — the pending store, the artifact trail, SSE fan-out, and the glass rendering pipeline — so the panel is ask-mcp rendering *its own state*.

## Enabling

The panel is **disabled by default** and hidden: every `/admin*` route returns `404` until an admin token is configured.

```bash
npx -y @pylotlight/ask-mcp --admin-token my-secret   # or --auth-token (admin falls back to it)
# env: ASK_MCP_ADMIN_TOKEN=... / ASK_MCP_AUTH_TOKEN=...
# or in config.json: { "adminToken": "..." }
```

Open `http://127.0.0.1:8787/admin`, paste the token once; the browser keeps an `HttpOnly` session cookie (SameSite=Strict, 7 days). Login attempts are rate-limited per client (10 failures/minute).

## What the panel shows

| Tab | Contents |
| --- | --- |
| **Live asks** | Every in-memory ask (pending first) with title, input kind, age, status, and the form URL. Pending asks can be cancelled — the agent receives `{action: "cancel"}` exactly as if the tab was closed. Updates stream over SSE (`/admin/events`), no polling. |
| **History** | Day-partitioned artifact browser (`~/.config/ask-mcp/YYYY-MM-DD/<token>/`): pick a day, pick an ask, view `spec.json`/`response.json` side by side, open the archived `render.html`. |
| **Config** | A form over `config.json` (below). Save writes the file (previous version backed up to `config.json.bak`). `timeoutMs`, `retentionDays`, `settleViewMs`, `theme`, `themeStars`, `themeMotion`, and `browser` apply to the live process immediately; `port`/`host`/`baseUrl`/`dataDir`/`surface` are marked *restart required*. Tokens are deliberately not editable here. |
| **Templates** | CRUD for ask templates ("recipes") used by the `ask` tool, `POST /api/ask`, and the slash commands. Specs are validated with the same pipeline as live asks — invalid JSON or unknown block types are rejected with the zod error. |

## Config file

Settings resolve with precedence **CLI > environment > config file > defaults**.

Location: `~/.config/ask-mcp/config.json` (override with `--config <path>`).

```jsonc
{
  "port": 8787,
  "host": "127.0.0.1",
  "baseUrl": "http://127.0.0.1:8787",
  "dataDir": "~/.config/ask-mcp",       // ~ is not expanded; use absolute paths
  "retentionDays": 30,                   // 0 = keep artifacts forever
  "timeoutMs": 600000,
  "settleViewMs": 3000,                // post-answer auto-close delay; 0 = stay open
  "browser": "Google Chrome",          // non-default browser for forms; omit = system default
  "theme": "starfield",                // form background: minimal | starfield | dots | contour
  "themeStars": 1000,                  // star count for starfield (0–5000)
  "themeMotion": "full",               // theme animation: full | subtle | still
  "surface": "auto",
  "authToken": "…",                      // bearer for /mcp and /api/*
  "adminToken": "…",                     // unlocks /admin (falls back to authToken)
  "noOpen": false
}
```

Environment variables: `ASK_MCP_PORT`, `ASK_MCP_HOST`, `ASK_MCP_BASE_URL`, `ASK_MCP_DATA_DIR`, `ASK_MCP_RETENTION_DAYS`, `ASK_MCP_TIMEOUT_MS`, `ASK_MCP_SETTLE_VIEW_MS`, `ASK_MCP_BROWSER`, `ASK_MCP_THEME`, `ASK_MCP_THEME_STARS`, `ASK_MCP_THEME_MOTION`, `ASK_MCP_SURFACE`, `ASK_MCP_AUTH_TOKEN`, `ASK_MCP_ADMIN_TOKEN`, `ASK_MCP_NO_OPEN`.

The **Browser** field is a dropdown grouped by OS — macOS app names (`Google Chrome`, `Orion`, …), Windows aliases (`msedge`, `chrome`), Linux commands (`google-chrome`, `firefox`) — with `System default` and a `Custom…` escape hatch for anything else (exe paths, niche browsers). It applies live like the other runtime fields, so a personal IDE install can pop a personal browser while work tools keep the default Edge. The header line shows the server OS so you know which group applies.

The **Form background** field picks the ask form's backdrop texture — `Minimal` (current flat gradient + grain), `Starfield` (pinprick dots), `Dot grid` (engineering dot-matrix), or `Contour lines` (faint topographic curves). All four are monochrome and low-contrast by design, with light-mode variants. Applies live; also settable per-install via `--theme` or `ASK_MCP_THEME`.

**Stars** sets the starfield density (0–5000, default 1000; stars are generated at load, sized to the viewport). **Theme motion** gates animation: `Full` (twinkle + drift + shooting stars + dot drift), `Subtle` (twinkle only), or `Still` (`prefers-reduced-motion` also forces still). Both apply live; per-install via `--theme-stars`/`ASK_MCP_THEME_STARS` and `--theme-motion`/`ASK_MCP_THEME_MOTION`.

## HTTP API (cookie session required)

| Route | Purpose |
| --- | --- |
| `POST /admin/login` | `{token}` → session cookie |
| `POST /admin/logout` | clear cookie |
| `GET /admin/api/server` | version, uptime, pending count, config summary (tokens redacted) |
| `GET /admin/api/pending` | ask list (pending first, capped at 100) |
| `POST /admin/api/pending/:token/cancel` | cancel a pending ask |
| `GET /admin/api/history` | artifact day dirs (newest first) |
| `GET /admin/api/history/:date` | ask summaries for a day |
| `GET /admin/api/history/:date/:token` | full spec + response record |
| `GET /admin/api/history/:date/:token/render` | archived rendered HTML |
| `GET/PUT /admin/api/config` | read / patch `config.json` |
| `GET /admin/api/templates` | list templates (full specs) |
| `PUT /admin/api/templates/:id` | upsert a template `{title, description?, spec}` |
| `DELETE /admin/api/templates/:id` | remove a template |
| `GET /admin/events` | SSE stream of pending-ask snapshots |

## Security model

- Loopback-bound by default; the panel is only as reachable as the server itself.
- The session cookie is a SHA-256 digest of the admin token — the raw token is never stored in the cookie, and comparison is constant-time. `GET /admin/api/server` never echoes token material.
- Writes are conservative: config saves are schema-validated and versioned (`.bak`); template saves run through the ask validation pipeline; ask cancellation reuses the single-shot store transition.
- The panel only appears when a token is configured; there is no unauthenticated probe that reveals its existence.

## Deliberately not included (yet)

Per [admin-roadmap.md](admin-roadmap.md): re-ask cloning, SIGHUP live reload of all fields, webhook routing, and multi-agent quotas. The panel is one hand-rolled page (no framework) — same policy as the form pages.
