# Admin panel

The dashboard at `/admin`: live asks, history, config, and templates. On the default localhost bind it opens without sign-in — there is nothing to set up.

## Access

| Setup | `/admin` shows |
| --- | --- |
| Default (loopback bind, no token) | The panel, immediately |
| Token set (`--admin-token`, or `--auth-token` as fallback) | Sign-in page — paste the token once, the browser keeps a session cookie (`HttpOnly`, `SameSite=Strict`, 7 days) |
| Network bind (`--host 0.0.0.0`) without a token | Setup instructions, not the panel |

The token is opt-in hardening for shared machines, and required when exposing the server to the network. Login attempts are rate-limited per client (10/minute).

```bash
ask-mcp --admin-token <secret>   # or --auth-token (admin falls back to it)
# env: ASK_MCP_ADMIN_TOKEN=... / ASK_MCP_AUTH_TOKEN=...
# or in config.json: { "adminToken": "..." }
```

Then restart and open `/admin`.

## Tabs

| Tab | Contents |
| --- | --- |
| **Live asks** | Every in-memory ask (pending first) with title, input kind, age, status, and form URL. Pending asks can be cancelled — the agent receives `{action: "cancel"}` exactly as if the tab was closed. Streams over SSE (`/admin/events`), no polling. |
| **History** | Day-partitioned artifact browser (`~/.config/ask-mcp/YYYY-MM-DD/<token>/`): pick a day, pick an ask, view `spec.json`/`response.json` side by side, open the archived `render.html`. |
| **Config** | A form over `config.json` (below). Save writes the file (previous version kept as `config.json.bak`). `timeoutMs`, `retentionDays`, `settleViewMs`, `theme`, `themeStars`, `themeMotion`, and `browser` apply live; `port`/`host`/`baseUrl`/`dataDir`/`surface` need a restart. Tokens are deliberately not editable here. |
| **Templates** | CRUD for ask recipes used by the `ask` tool, `POST /api/ask`, and the slash command. Specs are validated with the same pipeline as live asks. |

## Config file

Precedence: **CLI > environment > config file > defaults**. Location: `~/.config/ask-mcp/config.json` (override with `--config <path>`).

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
  "adminToken": "…",                     // sign-in gate for /admin (falls back to authToken)
  "noOpen": false
}
```

Environment variables: `ASK_MCP_PORT`, `ASK_MCP_HOST`, `ASK_MCP_BASE_URL`, `ASK_MCP_DATA_DIR`, `ASK_MCP_RETENTION_DAYS`, `ASK_MCP_TIMEOUT_MS`, `ASK_MCP_SETTLE_VIEW_MS`, `ASK_MCP_BROWSER`, `ASK_MCP_THEME`, `ASK_MCP_THEME_STARS`, `ASK_MCP_THEME_MOTION`, `ASK_MCP_SURFACE`, `ASK_MCP_AUTH_TOKEN`, `ASK_MCP_ADMIN_TOKEN`, `ASK_MCP_NO_OPEN`.

**Browser** is a dropdown grouped by OS — macOS app names (`Google Chrome`, `Orion`, …), Windows aliases (`msedge`, `chrome`), Linux commands (`google-chrome`, `firefox`) — with `System default` and a `Custom…` escape hatch (exe paths, niche browsers). Applies live; the header shows the server OS so you know which group applies. Handy per-install: a personal IDE pops a personal browser while work tools keep the default.

**Form background** picks the ask form's backdrop — `Minimal`, `Starfield`, `Dot grid`, or `Contour lines`. All four are monochrome and low-contrast by design, with light-mode variants. **Stars** sets starfield density (0–5000, default 1000; generated at load, sized to the viewport). **Theme motion** gates animation: `Full`, `Subtle` (twinkle only), or `Still` (`prefers-reduced-motion` also forces still). All apply live.

## HTTP API (sign-in required only when a token is set)

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

- Loopback-bound by default; without a token the panel is only as reachable as the server itself (anyone reaching it is already on the machine).
- With a token set, the session cookie is a SHA-256 digest of it — the raw token is never stored client-side, comparison is constant-time, and APIs never echo token material.
- Writes are conservative: config saves are schema-validated and versioned (`.bak`); template saves run through the ask validation pipeline; cancellation reuses the single-shot store transition.

## Deliberately not included (yet)

Per [admin-roadmap.md](admin-roadmap.md): re-ask cloning, SIGHUP live reload of all fields, webhook routing, and multi-agent quotas. The panel is one hand-rolled page (no framework) — same policy as the form pages.
