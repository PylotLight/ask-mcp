# The `ask` tool

Reference for the `ask` MCP tool: example, input kinds, inference rules, result shapes, and templates.

## Example

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
  }
}
```

## Input kinds

Five kinds, chosen by `input.type` (optional — usually inferred):

- `approve` — a single recommended plan. Extras: `approveLabel`, `rejectLabel`, `noteRequired` (`never`/`on_reject`/`always`), `notePlaceholder`. A rejection reason flows through `note`.
- `single_choice` — pick one of `options`. Extras: `other: { placeholder }` for the free-text escape hatch. Selecting Other focuses its inline text field; typing auto-selects it.
- `multi_choice` — pick several. Extras: `other` (Selecting Other focuses its inline field; it counts toward `min`/`max`), plus `min`/`max`. Never inferred — pass it explicitly.
- `text` — free text. Extras: `placeholder`, `multiline`, `minLength`, `maxLength`, `submitLabel`.
- `form` — typed fields via a JSON-schema-ish `schema` (string/number/integer/boolean, `enum`, `format`, bounds, `required`).

Put alternatives in `option_card` blocks and reference the same ids in choice options — cards become the clickable choices automatically. One primary input per ask; follow-ups go in subsequent calls. Keep blocks concise — this is a decision surface, not a report.

## Tree block

`tree` renders a hierarchy above the input — a plan, idea map, dependency tree, or file tree. `layout: "flow"` (default) draws a branching org-chart; `layout: "list"` renders a compact indented list. Nodes carry an optional `note`, `meta` badge, and `status` (`neutral`, `active`, `done`, `warn`, `muted`).

```jsonc
{
  "type": "tree",
  "layout": "flow",
  "root": {
    "title": "Ship the feature",
    "status": "active",
    "children": [
      { "title": "Renderer", "meta": "2 files", "status": "done" },
      { "title": "Docs", "children": [{ "title": "README" }] }
    ]
  }
}
```

Limits: 60 nodes, 5 levels, 8 children per node. On narrow screens the flow collapses to an indented list. Pair a tree with `single_choice` options when the user should pick a branch — nodes themselves are not interactive.

## Input inference

| Fields present | Resolved type |
| --- | --- |
| `schema` | `form` |
| `options` | `single_choice` |
| `placeholder` / `multiline` / `minLength` / `maxLength` / `submitLabel` | `text` |
| anything else (or nothing) | `approve` |

Submissions are re-validated server-side against the original ask before they're accepted.

## Results

`structuredContent` carries the machine-readable answer:

```jsonc
{ "action": "choose", "optionId": "now", "note": "optional" }
{ "action": "choose", "optionIds": ["a", "b"] }
{ "action": "choose", "optionId": "__other__", "otherText": "custom answer" }
{ "action": "submit", "value": "free text" }
{ "action": "submit", "values": { "field": "value", "count": 3, "ok": true } }
{ "action": "approve" | "reject" }        // note included when provided
{ "action": "cancel" }                    // user cancelled (nothing was sent)
{ "action": "timeout" }                   // treat the question as unanswered
```

`content[0].text` is a one-line summary (e.g. `User chose "Deploy now".`) for clients that surface text. If the client cancels the call, the pending ask is cancelled too instead of lingering until timeout. Pass `dryRun: true` to validate, render, and archive without blocking, opening, or prompting.

## Templates

Recurring asks live as named recipes (`~/.config/ask-mcp/templates/<id>.json`, editable in the admin panel) — explicit fields override the template:

```jsonc
{ "template": "deploy-confirm", "title": "Deploy to staging?" }
```

Discover them with the `ask_templates` tool. Recipe file format and the HTTP twin are in [commands.md](commands.md).
