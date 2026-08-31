# Templates, API & the admin slash command

The primary surface is the MCP tools (`ask`, `ask_templates`) and the plain-HTTP twin (`POST /api/ask`, `GET /api/templates`). The only user-facing slash command is the admin opener — all `ask` flows are agent-driven (the agent decides when to ask).

## Installing the slash command

```bash
npx -y @pylotlight/ask-mcp install-commands          # → ~/.config/opencode/commands/ask-admin.md (global)
npx -y @pylotlight/ask-mcp install-commands --force  # overwrite existing file
npx -y @pylotlight/ask-mcp install-commands --dir .opencode/commands --base-url http://127.0.0.1:8787
```

Installed file (skipped if it already exists, unless `--force`; restart the client afterwards):

| Command | What it does |
| --- | --- |
| `/ask-admin` | Opens the [admin panel](admin.md) in the browser. |

The command bakes in the base URL (`--base-url`, default `http://127.0.0.1:8787`).

## Direct ask API

`POST /api/ask` is the plain-HTTP twin of the MCP `ask` tool — same validation, same artifacts, same structured result, but trivially callable from scripts and shell injections:

```bash
curl -sS -X POST http://127.0.0.1:8787/api/ask \
  -H 'content-type: application/json' \
  -d '{"template":"deploy-confirm"}'

# ad-hoc, without a template (same lenient shape as the MCP tool — `blocks` is
# optional; a title-only approve ask is valid):
curl -sS -X POST http://127.0.0.1:8787/api/ask \
  -H 'content-type: application/json' \
  -d '{"title":"Ship it?","blocks":[{"type":"markdown","markdown":"**3 files** changed"}],"input":{"type":"approve"}}'
```

- **Blocks** until the user answers, cancels, or the ask times out; responds with the result JSON (`{action, optionId?, note?, …}`).
- The form URL opens in the browser automatically (respecting `openBrowser` config).
- If `--auth-token` is set, send `Authorization: Bearer …` (same as `/mcp`).
- `GET /api/templates` lists `{id, title, description}` for every installed template.

## Templates ("recipes")

Templates are named, validated ask specs stored at `~/.config/ask-mcp/templates/<id>.json`. They turn one-off prompt engineering into durable, reviewable interaction assets:

```jsonc
{
  "id": "deploy-confirm",
  "title": "Confirm a deployment",
  "description": "Approve-style gate; rejection requires a reason.",
  "spec": {
    "title": "Deploy to production?",
    "blocks": [ … ],
    "input": { "type": "approve", "approveLabel": "Deploy", "noteRequired": "on_reject" }
  }
}
```

- Seeded on first run with `deploy-confirm`, `pick-region`, `review-signoff`; edits are never clobbered.
- The admin panel's **Templates** tab is the editor (spec JSON is validated on save).
- Template ids: lowercase letters, digits, `-`, `_` (max 64 chars).

### From the agent

The MCP surface is template-aware too:

1. `ask_templates` — lists ids, titles, descriptions so the model can discover recipes.
2. `ask` with `template` — supplies defaults; explicit fields override:

```jsonc
{
  "template": "deploy-confirm",
  "title": "Deploy to staging?",          // overrides the template title
  "blocks": [{ "type": "markdown", "markdown": "**staging** · 2 files" }]
}
```

### Precedence for a resolved ask

`explicit fields > template spec > input-type inference > schema defaults` — the merged spec still passes the full validation pipeline, so a bad merge is rejected with a precise error instead of rendering something odd.
