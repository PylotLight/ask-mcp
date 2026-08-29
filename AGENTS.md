# AGENTS.md — ask-mcp

Dev guide for coding agents working in this repo. Read this first; only open source files when you need the details behind a claim.

## What this is

`@pylotlight/ask-mcp` — a local MCP server whose one tool, `ask`, blocks the calling agent until the user answers an HTML form in their browser. Same primitives are exposed over plain HTTP (`POST /api/ask`) and via an admin panel (`/admin`), so the interaction pipeline is shared, not duplicated. ESM TypeScript, zod v4, MCP SDK, Bun or Node >= 22, vitest.

Docs: `README.md` (usage) · `docs/admin.md` (panel + config file + admin API) · `docs/commands.md` (templates, /api/ask, /ask-admin) · `docs/admin-roadmap.md` (future ideas) · `docs/surface-a-mcp-apps.md` (deferred MCP Apps design).

## Commands

```bash
bun run typecheck   # tsc --noEmit — run before declaring done
bun run build       # tsc emit → dist/
bun run test        # vitest. NOT `bun test` — bun's runner fails on a pre-existing vitest .resolves test
bun src/index.ts [flags]   # run the server from source
```

`--help` on the server prints the full CLI; `src/config.ts` is the source of truth for flags/env.

## Architecture map

```
src/index.ts        entrypoint: config → stores → http server → signals. Dispatches `install-commands`.
src/config.ts       CLI > env > config file > defaults. zod-validated. writeConfigFile() saves with .bak.
src/version.ts      single VERSION constant (keep in sync with package.json).
src/schema/         zod schemas: blocks, input spec (lenient inference), args, results.
src/server/
  http.ts           routing: /mcp, /api/ask, /api/templates, /admin*, /f/:token/* (form pages).
  mcp.ts            MCP endpoint: stateless Streamable HTTP transport; `ask` + `ask_templates` tools.
  ask-flow.ts       THE shared pipeline: normalizeAskArgs (lenient→strict), resolveAskArgs (template merge), runAsk (block + artifacts + open browser). MCP tool and /api/ask both call runAsk.
  admin.ts          /admin/api/* routes + cookie auth (sha256 digest cookie, constant-time compare, brute-force guard).
  api-ask.ts        POST /api/ask → resolveAskArgs → runAsk, streaming nothing until settled.
  http-util.ts      sendJson / readBody / sendHtml helpers.
src/store/
  pending.ts        in-memory single-shot ask store; event emitter (create|settle|consume) for SSE.
  artifacts.ts      day-partitioned JSON records: <dataDir>/<YYYY-MM-DD>/<token>/{spec,response,render}.json + retention pruning. Path regexes guard traversal.
  templates.ts      <dataDir>/templates/*.json; seeded on first run; validation reuses normalizeAskArgs.
src/render/         hand-rolled HTML/CSS/JS (no framework). styles.ts holds the glass design tokens; page.ts/client.ts are the ask form; admin.ts/adminClient.ts the panel.
src/commands/       install-commands: writes ask-admin.md to ~/.config/opencode/commands (all ask flows are agent-driven via MCP).
src/util/           token generation, open-in-browser.
```

Request flow: caller → validate lenient args → resolve template (explicit fields override template spec) → strict `askArgsSchema` → PendingStore.create → persist spec → open browser → caller awaits → user submits/cancels/expires (single-shot transition) → persist response → structured result.

## Invariants & conventions

- **Lenient at the edge, strict inside.** LLM-facing inputs (`input.type` omitted, `title`/`blocks` optional, templates fill gaps) are normalized then re-validated against `askArgsSchema`. Never loosen the strict schema without updating tests on purpose.
- **Single-shot store.** Every pending ask settles exactly once (submitted/cancelled/expired/consumed). Don't add code paths that mutate a terminal entry.
- **Artifact persistence is best-effort.** Disk failures log and continue; a live interaction must never break on write errors (`bestEffort()` in ask-flow.ts).
- **No framework in render/**. Plain DOM + the design tokens in `src/render/styles.ts`. New UI reuses `pageStyles()` and existing block renderers.
- **No comments in code** unless the user asks; explain in commit messages or docs instead.
- Auth model: `authToken` guards `/mcp` + `/api/*` (Bearer); `adminToken` (falls back to authToken) unlocks `/admin` via hashed session cookie. Tokens are never echoed back by APIs and never editable through the panel.
- Config precedence CLI > env > file > defaults; `timeoutMs`/`retentionDays` apply live, `port`/`host`/`baseUrl`/`dataDir`/`surface` need restart.

## Testing

- All server tests start HTTP servers on port 0 with temp data dirs and **`openBrowser: false`** (otherwise tests spawn your browser via `src/util/open.ts`).
- vitest + `fetch`. See `test/admin-http.test.ts` for the cookie-login helper pattern and `test/config.test.ts` for config precedence cases.
- Manual smoke recipe (isolated, never pollutes `~/.config`):
  ```bash
  bun src/index.ts --port 8790 --data-dir /tmp/ask-smoke --config /tmp/ask-smoke.json --admin-token t --no-open
  curl -s localhost:8790/healthz    # {"ok":true,"version":…} — confirms the build actually running
  ```
  Then: `POST /api/ask` with `{"template":"deploy-confirm"}` (blocks ~10 min — background it with `nohup … & disown`, a plain `&` makes the shell wait), drive it via `/admin` or `POST /f/:token/submit`.
- After changing anything in `src/render/*`, restart the server before browser-checking — it serves the code loaded at boot (verify via `/healthz` version).

## Gotchas

- The user's real server usually runs on port 8787 (`~/repos/Personal/ask-mcp` per their global config); don't touch it — smoke-test on another port.
- Blocking calls (`POST /api/ask`, `runAsk`) honor `timeoutMs` (default 600000); use `curl --max-time` above that when testing.
- `~` in `dataDir` config values is NOT expanded — absolute paths only.
- The config file is a global singleton (`~/.config/ask-mcp/config.json` by default) — with a custom `--data-dir` it still writes to the default config path unless `--config` is passed.
- Repo is clean-tree by policy; commit only when asked.
