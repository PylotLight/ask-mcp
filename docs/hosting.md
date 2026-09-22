# Hosted mode (reverse proxy)

Run ask-mcp where the agent lives — a NAS, a container, an OpenChamber pod — and answer its forms from your own browser. No new flags were needed: `--host`, `--port`, and `--base-url` already cover it. This page wires them together.

## How it splits

Two planes, one process:

| Plane | What | Local default | Hosted |
| --- | --- | --- | --- |
| MCP control | `ask` / `ask_templates` tool calls | stdio (client-spawned, no network) | stdio still — the agent spawns the process next to itself, so MCP needs no proxy |
| Form UI | `/f/:token`, `/admin`, `/api/*` | loopback HTTP, auto-opened | same HTTP server bound to `0.0.0.0`, exposed through your reverse proxy at a public origin |

Only the form UI goes through the proxy. Keep MCP on stdio and you avoid exposing a tool endpoint at all.

## Quick start

```bash
bunx @pylotlight/ask-mcp --stdio --host 0.0.0.0 --port 3050 \
  --base-url https://ask.example.com \
  --auth-token <secret> --admin-token <secret> --no-open
```

Env equivalents: `ASK_MCP_HOST`, `ASK_MCP_PORT`, `ASK_MCP_BASE_URL`, `ASK_MCP_AUTH_TOKEN`, `ASK_MCP_ADMIN_TOKEN`, `ASK_MCP_NO_OPEN=1`. Precedence is CLI > env > config file > defaults.

What each flag does:

- `--host 0.0.0.0` — bind all interfaces so the proxy (or pod network) can reach the HTTP server. Default `127.0.0.1` is loopback-only.
- `--port 3050` — fixed port for the proxy to target. (In `--stdio` mode a busy port falls back to a random one and logs it — pin the port and make sure it is free.)
- `--base-url https://ask.example.com` — **required** when hosted. This origin is baked into every logged form URL and every admin-panel link. Without it the server prints `http://127.0.0.1:…` links that only work on the NAS itself. Trailing slashes are stripped.
- `--auth-token` / `--admin-token` — **required** when exposed. `--auth-token` guards `/mcp` + `/api/*` (Bearer); `--admin-token` gates `/admin` (falls back to `--auth-token`). A network bind without a token shows setup instructions instead of the panel.
- `--no-open` — implied on non-loopback binds (there is no local browser to open), but pass it explicitly to document intent.

## OpenChamber on the NAS

Simplest shape: OpenChamber spawns ask-mcp over stdio inside its own pod; only the form pages go out through the proxy.

```jsonc
{
  "mcpServers": {
    "ask": {
      "command": "bunx",
      "args": [
        "@pylotlight/ask-mcp",
        "--stdio",
        "--host", "0.0.0.0",
        "--port", "3050",
        "--base-url", "https://ask.example.com",
        "--no-open"
      ],
      "env": {
        "ASK_MCP_AUTH_TOKEN": "…",
        "ASK_MCP_ADMIN_TOKEN": "…"
      }
    }
  }
}
```

Prefer `npx`? Use `"command": "npx", "args": ["-y", "@pylotlight/ask-mcp", "--stdio", …]`. Prefer Bun runtime? Use `"command": "bunx", "args": ["--bun", "-y", "@pylotlight/ask-mcp", "--stdio", …]`.

Alternative — shared server: run `bunx @pylotlight/ask-mcp --host 0.0.0.0 --port 3050 --base-url https://ask.example.com …` as its own deployment and point the client at `https://ask.example.com/mcp` with `Authorization: Bearer …`. Same flags, but now the tool endpoint is network-reachable, so the auth token is load-bearing.

## Reverse proxy

Use a subdomain (`https://ask.example.com → http://<nas>:3050`). Subpaths (`https://example.com/ask-mcp/`) are **not** supported — the server assumes root paths (`/f/:token`, `/admin`, `/api/*`, `/mcp`).

Caddy:

```caddy
ask.example.com {
	reverse_proxy 127.0.0.1:3050
}
```

Nginx:

```nginx
server {
    server_name ask.example.com;

    location / {
        proxy_pass http://127.0.0.1:3050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # The ask call blocks (up to --timeout-ms, default 10 min) and
        # streams status over SSE — don't buffer, don't time out early.
        proxy_buffering off;
        proxy_read_timeout 660s;
        proxy_send_timeout 660s;
    }
}
```

In Kubernetes that `proxy_pass` target becomes the Service (`http://ask-mcp.<namespace>.svc.cluster.local:3050`); expose `containerPort: 3050` on the OpenChamber/ask-mcp pod first.

## Auto open / auto close, honestly

- **Auto-open cannot work remotely.** On a loopback bind the server runs `open` / `xdg-open` on your machine and the tab appears. On the NAS that would open a browser on the NAS (or fail headless) — never your laptop. So `openBrowser` is `false` whenever the host is non-loopback or `--no-open` is set, and the server logs `[ask] form ready: https://ask.example.com/f/<token>` instead. The agent sees that URL in the tool-call log — surface it to the user and they open it manually.
- **Auto-close mostly cannot work remotely either.** `window.close()` is only allowed for script-opened windows. A tab the user opened by hand refuses, so after answering the page shows the settle view ("Answer recorded" + permalink) with a `Close now` button that retries, a countdown that attempts close, and the fallback hint `Done — press ⌘W / Ctrl+W to close this tab`. If that countdown annoys, set `--settle-view-ms 0`: the page stays open until the user closes it, with `Stay open` / `Copy link` controls.

## Checklist

1. Pick a port, bind `0.0.0.0`, set `--base-url` to the public origin.
2. Set `--auth-token` and `--admin-token` (or at least `--auth-token`; admin falls back to it).
3. Expose the port to the proxy; create DNS + TLS at the proxy.
4. Trigger an ask, confirm the logged URL uses the public origin, open it from your laptop, answer, confirm the agent unblocks.
5. Open `/admin` at the public origin and sign in with the admin token.

## Limits

- Root-path proxying only; no subpath base.
- No built-in TLS — terminate at the proxy.
- One ask blocks one tool call up to `--timeout-ms`; size proxy timeouts accordingly.
- Through a proxy, only the **form UI** should cross it. The wait itself stays
  inside the cluster (stdio MCP, or `/mcp` called from inside). Don't hold
  `POST /api/ask` open through Cloudflare's CDN proxy — it kills idle
  connections after ~100 s (HTTP 524) while the ask itself stays pending.
  Verified live: a proxied `/api/ask` wait died at 100 s even as the user
  answered fine; the in-cluster waiter received the result normally.
