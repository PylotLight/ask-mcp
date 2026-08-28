# Surface A — MCP Apps (deferred)

Status: **Deferred** — do not start until Surface B is stable and battle-tested.
Last updated: 2026-08-28
Related: `README.md`, `src/schema/` (shared core), `docs/` (this file)

## 1. What is deferred and why

Surface B (blocking browser form over plain HTTP) is the universal path: it works
in every host (opencode, Claude Code, any CLI) because it only needs the host to
perform a normal blocking `tools/call`.

Surface A renders the ask **inline inside MCP Apps-capable hosts** (Claude Desktop,
VS Code-family hosts, LibreChat) using the MCP Apps extension: the host embeds our
UI in a sandboxed iframe and the user answers without leaving the chat.

It is deferred because:

1. The stable npm SDK (`@modelcontextprotocol/sdk@1.30.0`, protocol up to
   `2025-11-25`) does not yet speak the newest MCP Apps protocol revision
   (`2026-07-28`). The Apps extension ships separately as
   `@modelcontextprotocol/ext-apps` (1.7.5 at time of writing) — expect churn.
2. Surface B must be rock-solid first; it is the fallback for every host that
   lacks Apps support.
3. Host support is uneven; we need a real host (LibreChat was the user's pick for
   spike) to validate against.

## 2. Goal

In an Apps-capable host, calling `ask` renders the form **inline in the host UI**
(no browser tab, no tab-switching). In non-Apps hosts, everything falls back to
Surface B automatically. The tool contract, schema core, artifacts, and result
shape stay identical across both surfaces.

## 3. Architecture

```
┌────────────────────────────── Host (Claude Desktop / VS Code / LibreChat) ─────────────┐
│                                                                                       │
│  chat UI ──── tool call ask(args) ───► MCP client                                     │
│     ▲                                        │ streamable HTTP (per-request, stateless)│
│     │                                        ▼                                        │
│  iframe ◄── resource ui://ask/app ── ask-mcp server  ──► PendingStore ──► artifacts   │
│     │              (text/html)            (port 8787)                                 │
│     └── POST /f/:token/submit (same-origin; iframe src is our server)                 │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

Key insight that keeps this cheap: **the iframe `src` points at our own server**
(`http://127.0.0.1:8787/app?token=…`), so the form is same-origin with the submit
endpoint. The existing `client.ts` fetch/SSE logic works unchanged inside the
iframe. The App bridge (postMessage handshake) is needed only for host-side
concerns: theme, preferred size, open/close lifecycle, and tool-result delivery
signals.

## 4. Server changes (Surface A)

1. **New route `GET /app?token=…`** — same HTML as `/f/:token` minus page chrome
   (no `<title>`, compact padding) and with the bridge shim loaded.
2. **Resource registration** — `ui://ask/app` with `mimeType: text/html`. Because
   the transport is per-request stateless, resources are static metadata; the
   actual page is fetched by URL. If a host insists on `resources/read`, return
   the HTML shell (token is passed as query param by the host per MCP Apps spec).
3. **Tool `ask` returns an Apps payload when negotiated**: normal `content` blocks
   (for hosts without Apps) plus `_meta.ui.resourceUri: "ui://ask/app"` and
   `_meta.ui.csp` per the MCP Apps spec. Negotiation = the host declares Apps
   capability during `initialize`; cache the flag per session/connection.
4. **Blocking semantics unchanged** — the `tools/call` stays open (same as Surface
   B), and the iframe submit resolves it. Hosts that kill long tool calls force
   the Option 2 flow below.

### Option 2 fallback (non-blocking) if hosts cap tool duration

- `ask` returns immediately: `{ requestId, formUrl, expiresAt }` +
  `_meta.ui.resourceUri`.
- The iframe collects the answer and POSTs it; the **next** `ask_result`
  (or `ask_poll`) tool call returns the stored result to the model.
- The App bridge's `onTeardown`/message channel can push a "user answered"
  notification so the host re-prompts the model.
- Reuse `PendingStore` as-is; add a `awaited` status transition
  (`pending → submitted → consumed` already exists).

## 5. Client changes (renderer)

- `client.ts` gains an embedded-mode branch, detected via
  `document.body.dataset.surface === "app"`:
  - Skip `window.close()` (iframe cannot close itself; send `ui/close-host` /
    resize signal through the bridge instead).
  - Listen for host theme changes (`bridge.subscribe`) and toggle
    `data-theme` on `<html>`; honor `prefers-reduced-motion` and host density.
  - Resize: post content height on every render/state change.
- Bridge implementation lives in `src/render/bridge.ts` (new), loading the
  `@modelcontextprotocol/ext-apps` iframe shim only in app mode — Surface B pages
  must stay dependency-free single-file HTML.
- CSP for the app route must allow the bridge postMessage origins documented by
  the spec (host origin forwarded as query param, validated server-side).

## 6. Security

- The app route enforces the same token rules as `/f/:token` (unknown/expired →
  terminal page, not 404 JSON).
- `--auth-token` bearer must also cover `/app` when bound to non-loopback.
- Validate `hostOrigin` query param (exact match, no wildcards) before echoing it
  into CSP `frame-ancestors`/postMessage targets.
- iframe sandbox: rely on host defaults; do not request `allow-same-origin`
  beyond what the spec requires (our page needs fetch + SSE only).

## 7. Host matrix to validate

| Host | Apps support | Notes |
| --- | --- | --- |
| Claude Desktop | yes | primary target for Surface A |
| LibreChat | yes (user-confirmed) | spike host — self-hosted, easy to iterate |
| VS Code (Copilot Chat MCP) | partial/preview | verify protocol revision support |
| opencode / Claude Code | no | stays on Surface B by design |

Detection must be capability-based (`initialize` result), never user-agent
sniffing; unknown hosts silently get Surface B.

## 8. Milestones

- **A1 — Spike in LibreChat**: run server, register as remote MCP, confirm host
  negotiates Apps, render a static `/app` page in the iframe, confirm
  `tools/call` blocking resolves on iframe submit.
- **A2 — Bridge integration**: theme + resize + close signals; embedded-mode
  client branch behind `data-surface="app"`.
- **A3 — Non-blocking fallback** (Option 2) behind `--surface auto` default.
- **A4 — Negotiation + `_meta.ui` payloads** in `src/server/mcp.ts`; resources
  registered; capability caching per connection.
- **A5 — Docs + host matrix update**; README "Inline mode" section.

## 9. Open questions

1. Does LibreChat impose a tool-call wall-clock limit that forces Option 2? (A1 answers this.)
2. Do hosts require the resource HTML to be served via `resources/read` instead of URL fetch?
3. Protocol churn: pin `ext-apps` and re-verify against SDK upgrades each milestone.
4. Multi-window hosts: does one iframe per ask hold up when two asks are pending
   in parallel conversations? (PendingStore is already token-keyed, so likely fine.)
