# ask-mcp

A blocking **"ask the user"** MCP tool that renders questions as beautiful HTML forms in the user's browser — options, approvals, tables, markdown, and short forms — and returns structured answers to the agent.

Instead of forcing models to guess at weak interactive conventions, `ask` gives every question a proper surface: the tool call **blocks** until the person answers, cancels, or the timeout fires.

```
agent ── tools/call("ask", {...}) ──► ask-mcp ──► renders form + opens browser
                                                     │
agent ◄── structured result ──── submit/cancel/timeout ◄┘
```

## Features

- **Five input kinds** — `approve`, `single_choice`, `multi_choice`, `text`, `form`. The `type` field is optional; it's inferred from the fields you provide.
- **Info blocks** — headings, paragraphs, markdown (safe subset), callouts, steps, option cards, tables, dividers.
- **Blocking semantics** — the MCP call stays open until the user responds; results come back as `structuredContent` plus a human-readable summary.
- **Live pages** — forms poll status over SSE: submitted → delivered, cancelled, expired; the page locks and tries to dismiss itself when done.
- **Auto-open** — the form URL opens in the default browser on ask (disable with `--no-open`).
- **Artifacts** — every ask is persisted (`spec.json`, `response.json`, `render.html`) under `~/.config/ask-mcp/YYYY-MM-DD/<token>/`, with optional retention pruning.
- **Safe by construction** — HTML-escaped rendering, strict zod schemas, per-ask 128-bit capability tokens, CSP, loopback-by-default binding.

## Quick start

```bash
bun install
bun start                       # listens on http://127.0.0.1:8787
```

Requires [Bun](https://bun.sh) ≥ 1.2 (or Node ≥ 22 via `npm run build && node dist/index.js`). **The server must be running** before an MCP client connects — it is a normal local process, not spawned per-session.

### Register with opencode

`~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "ask": {
      "type": "remote",
      "url": "http://127.0.0.1:8787/mcp",
      "enabled": true
    }
  },
  "experimental": { "mcp_timeout": 600000 }
}
```

`mcp_timeout` matters: clients default to ~30 s tool timeouts, which kills any blocking ask. Ten minutes is a good starting point; match it with `--timeout-ms` if you want the server and client to agree.

### Register with Claude Code

```bash
claude mcp add --transport http ask http://127.0.0.1:8787/mcp
```

### Other clients (Claude Desktop, LibreChat, …)

Any client that speaks MCP Streamable HTTP can point at `http://<host>:8787/mcp`. Clients that only spawn stdio servers can bridge with `supergateway`/`mcp-proxy` — or simply keep the server remote and use the HTTP endpoint.

## CLI

```
ask-mcp [options]

  --port <n>           HTTP port (default: 8787)
  --host <addr>        Bind address (default: 127.0.0.1)
  --base-url <url>     Public base URL for form links
  --data-dir <dir>     Artifact directory (default: ~/.config/ask-mcp)
  --retention-days <n> Prune artifacts older than n days at startup + every 6 h (default: 0 = forever)
  --timeout-ms <n>     Ask blocking timeout (default: 600000, min 1000)
  --surface <mode>     auto | apps | browser (MCP Apps is deferred; see docs/)
  --auth-token <t>     Require Bearer auth on the MCP endpoint
  --no-open            Don't auto-open forms in a browser
  -h, --help           Show help
```

## The `ask` tool

```jsonc
{
  "title": "Deploy to production?",           // required, ≤ 120 chars
  "subtitle": "12 checks passed",             // optional
  "blocks": [                                 // context shown above the input
    { "type": "markdown", "markdown": "**3 files** changed (+142 −38)" },
    { "type": "option_card", "id": "now", "title": "Deploy now", "meta": "~4 min", "description": "Blue-green, instant rollback" },
    { "type": "option_card", "id": "later", "title": "Wait for Friday", "description": "Lower traffic window" }
  ],
  "input": {                                  // `type` optional — inferred
    "options": [
      { "id": "now", "label": "Deploy now" },
      { "id": "later", "label": "Later" }
    ]
  },
  "options": { "density": "comfortable", "allowCancel": true }  // optional
}
```

### Input inference

| Fields present                      | Resolved type   |
| ----------------------------------- | --------------- |
| `schema`                            | `form`          |
| `options`                           | `single_choice` |
| `placeholder` / `multiline` / `minLength` / `maxLength` / `submitLabel` | `text` |
| anything else (or nothing)          | `approve`       |

Per-kind extras: `approve` accepts `approveLabel`, `rejectLabel`, `noteRequired` (`never|on_reject|always`), `notePlaceholder`; `multi_choice` accepts `min`/`max`; `text` accepts `placeholder`, `multiline`, `minLength`, `maxLength`, `submitLabel`; `form` takes a JSON-schema-ish object (string/number/integer/boolean fields, `enum`, `format`, bounds, `required`).

### Results

`structuredContent` depends on the interaction:

```jsonc
{ "action": "choose", "optionId": "now", "note": "optional" }
{ "action": "choose", "optionIds": ["a", "b"] }
{ "action": "submit", "value": "free text" }
{ "action": "submit", "values": { "field": "value", "count": 3, "ok": true } }
{ "action": "approve" | "reject" }        // note included when provided
{ "action": "cancel" }                    // user cancelled (nothing was sent)
{ "action": "timeout" }                   // treat the question as unanswered
```

The `content[0].text` is a one-line summary (e.g. `User chose "Deploy now".`), so clients that surface text get a readable answer too. Submissions are re-validated server-side against the original ask before they're accepted.

## Authoring guidance for models

- Put alternatives in `option_card` blocks and reference the same ids in choice options — cards become the clickable choices automatically (no duplication).
- `approve` is for a single recommended plan; a rejection reason flows through `note` (require it with `noteRequired`).
- Use `form`/`text` to collect data, choices to pick between plans.
- One primary input per ask; ask follow-ups in subsequent calls.
- Keep blocks concise — this is a decision surface, not a report.

## Security model

- Binds to loopback by default; set `--host 0.0.0.0` only with `--auth-token`.
- The MCP endpoint accepts optional Bearer auth (constant-time compare). Form pages rely on their unguessable 128-bit per-ask token as a capability URL — that's what makes browser auto-open work without headers.
- Pages ship a strict CSP (`default-src 'none'`, no framing), `no-referrer`, and every string is escaped before rendering; markdown is sanitized by whitelist, never passed through.
- Form POSTs are re-validated against the ask's schema; cancel/submit are single-shot state transitions.

## Development

```bash
bun run typecheck     # tsc --noEmit
bun test              # vitest — schemas, semantic validation, renderer, store
bun run build         # emit dist/ for node/bun
```

Source layout:

```
src/
  index.ts            entrypoint: config, stores, http server, signals
  config.ts           CLI parsing + validation (--help has the full list)
  version.ts          single version constant
  schema/             zod: blocks, input spec (+ lenient inference), args, results
  server/             http routes, mcp endpoint (stateless Streamable HTTP), summary, validation
  store/              pending asks (in-memory, TTL/pruning), artifact persistence
  render/             page/styles/client script/blocks/markdown/escaping
  util/               tokens, open-in-browser
```

Artifacts land in `--data-dir` (default `~/.config/ask-mcp`) as `YYYY-MM-DD/<token>/{spec.json,response.json,render.html}` — a full audit trail of every question asked, shown, and answered.

## Roadmap

An exploration of an admin panel (live ask monitor, history, re-asks), richer interaction blocks, and config management lives in [docs/admin-roadmap.md](docs/admin-roadmap.md). MCP Apps (rendering the ask inside the MCP client itself) is designed but intentionally deferred — see [docs/surface-a-mcp-apps.md](docs/surface-a-mcp-apps.md).
