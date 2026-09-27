# Reference

CLI flags, security model, development setup, and roadmap for ask-mcp.

## CLI reference

```
ask-mcp [options]
ask-mcp install [--client <name>] [--bun] [--force]
ask-mcp install-commands [--dir <target>] [--force]

  --port <n>           HTTP port (default: 8787)
  --host <addr>        Bind address (default: 127.0.0.1; 0.0.0.0 for hosted / containers)
  --base-url <url>     Public base URL for form links (required when hosted, e.g. https://ask.example.com)
  --config <path>      Config file (default: ~/.config/ask-mcp/config.json; CLI > env > file > defaults)
  --data-dir <dir>     Artifact directory (default: ~/.config/ask-mcp)
  --retention-days <n> Prune artifacts older than n days at startup + every 6 h (default: 0 = forever)
  --timeout-ms <n>     Ask blocking timeout (default: 600000, min 1000)
  --settle-view-ms <n> Post-answer settle view auto-close delay (default: 3000, 0 = stay open)
  --surface <mode>     auto | apps | browser (MCP Apps is deferred; see docs/)
  --browser <name>     Open forms in a non-default browser (macOS app name, Windows alias/exe, Linux command)
  --theme <name>       Form background: minimal | starfield | dots | contour (default: minimal)
  --theme-stars <n>    Star count for the starfield theme (default: 1000, max 5000)
  --theme-motion <m>   Theme animation: full | subtle | still (default: full)
  --auth-token <t>     Require Bearer auth on the MCP endpoint
  --admin-token <t>    Sign-in gate for the /admin panel (falls back to --auth-token; only needed off localhost)
  --no-open            Don't auto-open forms in a browser (implied on non-loopback binds)
  --stdio              Serve MCP over stdin/stdout (client-spawned mode); form pages still served over HTTP
  -h, --help           Show help
```

Every flag has an `ASK_MCP_*` env equivalent; persistent settings live in the config file (managed in the admin panel's **Config** tab). Hosted / reverse-proxy setup (NAS, containers, OpenChamber): [hosting.md](hosting.md).

## Security model

- Loopback-bound by default; only expose (`--host 0.0.0.0`) with `--auth-token` (plus `--admin-token` for the panel).
- `/admin` opens without sign-in when no token is set on loopback. A configured token always gates it; an exposed bind without one shows setup instructions instead of the panel.
- Form pages rely on their unguessable per-ask token as a capability URL — that's what makes browser auto-open work without headers.
- Strict CSP, `no-referrer`, everything escaped; markdown sanitized by whitelist; form POSTs re-validated; cancel/submit are single-shot.

## Development

```bash
git clone https://github.com/PylotLight/ask-mcp && cd ask-mcp
bun install
bun run build        # single-file bundle → dist/index.js, zero runtime deps
bun run typecheck    # tsc --noEmit
bun run test         # vitest
bun src/index.ts     # run from source (or: node dist/index.js)
```

Artifacts land in `--data-dir` as `YYYY-MM-DD/<token>/{spec.json,response.json,render.html}` — the full audit trail of every question asked, shown, and answered.

## Releasing

Publishing is automated: cutting a GitHub release runs the `publish` workflow (typecheck → tests → tag/package.json version check → build → `npm publish --provenance`). Pushing to `main` or opening a PR runs the lighter `ci` workflow (typecheck → tests → build).

No npm token lives in GitHub secrets — automated publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC), which mints a short-lived token per run. Long-lived 2FA-bypass tokens are deprecated for publishing (npm removes direct publish through them around January 2027), so don't add one.

One-time setup (interactive, with 2FA — do it in the browser, not via a token):

1. npmjs.com → `@pylotlight/ask-mcp` → Settings → Trusted Publisher → Manage Trusted Publishers → add GitHub Actions with organization `PylotLight`, repository `ask-mcp`, workflow file name `publish.yml`.
2. Done. No GitHub-side secret required.

Per release:

```bash
# bump both (they must stay in sync — CI enforces tag == package.json)
# package.json "version" and src/version.ts VERSION
bun run typecheck && bun run test && bun run build
git commit -am "…"
git tag -a vX.Y.Z -m "vX.Y.Z — …" && git push origin main vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z — …" --notes "…" --latest
```

If a release already exists but its version never reached npm (e.g. predates this automation), backfill it from the Actions tab: run the `publish` workflow manually (`workflow_dispatch` skips the tag check).

## Roadmap

Shipped: admin panel, `/ask-admin`. Deferred: MCP Apps ([design](surface-a-mcp-apps.md)). Ideas: [admin-roadmap.md](admin-roadmap.md), [feature-ideas.md](feature-ideas.md).
