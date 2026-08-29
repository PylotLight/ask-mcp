import { adminClientScript } from "./adminClient.js"
import { pageStyles } from "./styles.js"

const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:"

function adminStyles(): string {
  return `
.admin-wrap { max-width: 1060px; }
.admin-head { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin: 6px 6px 18px; }
.admin-head .title { font-size: 1.15rem; font-weight: 650; letter-spacing: -.01em; }
.admin-head .meta { color: var(--faint); font-size: .8125rem; }
.admin-head .spacer { flex: 1; }
.pill { display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px; border: 1px solid var(--border); border-radius: 999px; background: var(--glass-2); color: var(--muted); font-size: .78rem; }
.pill b { color: var(--text); font-weight: 600; }

nav.tabs { display: flex; gap: 6px; margin: 0 0 18px; flex-wrap: wrap; }
nav.tabs button {
  background: var(--glass-2); color: var(--muted); border: 1px solid var(--border);
  padding: 8px 18px; border-radius: 999px; font-size: .8125rem; font-weight: 600;
}
nav.tabs button.active { color: var(--text); border-color: rgba(129,140,248,.55); background: var(--accent-soft); }
@media (prefers-color-scheme: light) { nav.tabs button.active { border-color: rgba(99,102,241,.5); } }

section[data-tab] { display: block; }
.muted { color: var(--faint); font-size: .85rem; }

.pending-row, .history-row, .template-row {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--glass-2); padding: 13px 16px; box-shadow: var(--inset-hi);
}
.pending-row + .pending-row, .history-row + .history-row, .template-row + .template-row { margin-top: 10px; }
.pending-main { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; flex: 1; min-width: 220px; }
.pending-title { font-weight: 600; }
.pending-meta { width: 100%; color: var(--faint); font-size: .75rem; padding-left: 2px; }
.pending-actions { display: flex; gap: 8px; align-items: center; margin-left: auto; }
.pending-done { color: var(--faint); }
.btn-sm { padding: 6px 14px; font-size: .78rem; min-width: 0; border-radius: 8px; }

.badge {
  font-size: .68rem; font-weight: 600; letter-spacing: .05em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); background: var(--glass-2);
}
.badge.st.pending { color: var(--warn); border-color: rgba(255,199,87,.4); background: var(--warn-soft); }
.badge.st.submitted, .badge.st.consumed, .badge.st.approve { color: var(--success); border-color: rgba(16,185,129,.4); background: var(--success-soft); }
.badge.st.cancelled, .badge.st.reject { color: var(--danger); border-color: rgba(244,63,94,.4); background: var(--danger-soft); }
.badge.st.expired, .badge.st.timeout { color: var(--muted); }

.chip {
  background: var(--glass-2); color: var(--muted); border: 1px solid var(--border);
  padding: 6px 13px; border-radius: 999px; font-size: .78rem; font-weight: 600;
}
.chip.active { color: var(--text); border-color: rgba(129,140,248,.55); background: var(--accent-soft); }
@media (prefers-color-scheme: light) { .chip.active { border-color: rgba(99,102,241,.5); } }

.history-row { cursor: pointer; text-align: left; font: inherit; color: var(--text); width: 100%; }
.history-row:hover { border-color: var(--border-strong); background: var(--control-hover); }
.history-time { color: var(--faint); font-size: .75rem; font-family: var(--mono); }
.history-title { font-weight: 600; flex: 1; min-width: 160px; }

.panel {
  border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--glass-2);
  padding: 18px; margin-top: 18px; box-shadow: var(--inset-hi);
}
.panel-head { display: flex; align-items: center; gap: 12px; margin: 0 0 12px; }
.panel-head h2 { margin: 0; font-size: .95rem; }

.json-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 760px) { .json-grid { grid-template-columns: 1fr; } }
.json-grid h3 { margin: 0 0 8px; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; color: var(--faint); }
pre.json {
  margin: 0; padding: 14px 16px; overflow: auto; max-height: 420px;
  background: var(--well); border: 1px solid var(--well-border); border-radius: var(--radius-xs);
  font-family: var(--mono); font-size: 12px; line-height: 1.5; color: var(--text);
}

form.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 700px) { form.grid { grid-template-columns: 1fr; } }
form .full { grid-column: 1 / -1; }
.field label { display: block; font-size: .72rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--faint); margin: 0 0 6px; }
.field input, .field select, .field textarea {
  width: 100%; margin: 0; font: inherit; color: var(--text);
  background: var(--control); border: 1px solid var(--border); border-radius: var(--radius-xs);
  padding: 10px 12px; transition: border-color .15s ease, background .15s ease;
}
.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.field textarea { font-family: var(--mono); font-size: 12.5px; min-height: 320px; resize: vertical; }
.form-foot { display: flex; gap: 10px; align-items: center; margin-top: 16px; flex-wrap: wrap; }

#flash {
  position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%) translateY(20px);
  opacity: 0; pointer-events: none; transition: opacity .2s ease, transform .2s ease;
  background: var(--sel-fill); color: var(--text); border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm); padding: 11px 18px; font-size: .85rem; z-index: 50;
  box-shadow: var(--shadow); max-width: min(90vw, 640px);
}
#flash.show { opacity: 1; transform: translateX(-50%) translateY(0); }
#flash.ok { border-color: rgba(16,185,129,.5); }
#flash.err { border-color: rgba(244,63,94,.55); }

.login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
.login-card { width: min(400px, 100%); text-align: center; }
.login-card .brand { justify-content: center; margin-bottom: 22px; }
.login-card h1 { margin-bottom: 8px; }
.login-card .subtitle { margin-bottom: 24px; }
.login-card form { display: flex; flex-direction: column; gap: 12px; }
.login-card input {
  font: inherit; color: var(--text); text-align: center;
  background: var(--control); border: 1px solid var(--border); border-radius: var(--radius-xs);
  padding: 12px 14px;
}
.login-card input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.login-error { color: var(--danger); font-size: .82rem; min-height: 1.2em; }
`
}

function shell(body: string, script = ""): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>Admin — ask-mcp</title>
<style>${pageStyles("comfortable")}</style>
<style>${adminStyles()}</style>
</head>
<body>
<div class="bg" aria-hidden="true"></div>
${body}
${script ? `<script>${script}</script>` : ""}
</body>
</html>`
}

export function renderAdminLogin(opts: { lockedOut?: boolean } = {}): string {
  const note = opts.lockedOut
    ? `<p class="login-error">The admin panel is not enabled on this server. Start ask-mcp with <code>--admin-token</code> to unlock it.</p>`
    : `<p class="login-error" id="login-error" role="alert"></p>`
  const script = opts.lockedOut
    ? ""
    : `(() => {
  const form = document.getElementById("login-form");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const err = document.getElementById("login-error");
    err.textContent = "";
    try {
      const res = await fetch("/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: form.elements.token.value }),
      });
      if (res.ok) { location.reload(); return; }
      const body = await res.json().catch(() => ({}));
      err.textContent = body.error || "login failed";
    } catch { err.textContent = "login failed"; }
  });
})();`
  return shell(
    `<div class="wrap login-wrap">
<main class="card login-card">
<header class="brand"><span class="dot"></span>ask<span class="sep">/</span>mcp <span style="color:var(--accent)">admin</span></header>
<h1>Admin sign-in</h1>
<p class="subtitle">Enter the admin token to manage asks, config, and templates.</p>
${note}
<form id="login-form" autocomplete="off">
<input type="password" name="token" placeholder="Admin token" autofocus aria-label="Admin token" required>
<button type="submit" class="btn-primary">Unlock</button>
</form>
</main>
</div>`,
    script,
  )
}

export function renderAdminPage(): string {
  return shell(
    `<div class="wrap admin-wrap">
<header class="admin-head">
  <header class="brand" style="margin:0"><span class="dot"></span>ask<span class="sep">/</span>mcp <span style="color:var(--accent)">admin</span></header>
  <span class="title">Control panel</span>
  <span class="meta" id="server-version"></span>
  <span class="spacer"></span>
  <span class="pill">pending <b id="server-pending">…</b></span>
  <span class="pill">uptime <b id="server-uptime">…</b></span>
  <button class="btn-secondary btn-sm" id="logout" type="button">Sign out</button>
</header>
<p class="muted" id="server-config" style="margin:0 6px 16px"></p>
<nav class="tabs" role="tablist">
  <button type="button" data-tab="live" class="active">Live asks</button>
  <button type="button" data-tab="history">History</button>
  <button type="button" data-tab="config">Config</button>
  <button type="button" data-tab="templates">Templates</button>
</nav>

<section data-tab="live">
  <div id="pending-empty" class="panel muted">No asks yet — live updates arrive automatically.</div>
  <div id="pending-list"></div>
</section>

<section data-tab="history" hidden>
  <div id="history-days" class="panel" style="display:flex;gap:8px;flex-wrap:wrap"></div>
  <div id="history-empty" class="panel muted" hidden>No asks recorded for this day.</div>
  <div id="history-list" style="margin-top:14px"></div>
  <div class="panel" id="history-detail" hidden>
    <div class="panel-head">
      <h2 id="history-detail-title"></h2>
      <span class="spacer" style="flex:1"></span>
      <a id="record-render" class="btn-secondary btn-sm" href="#" target="_blank" rel="noopener" hidden>View render</a>
      <button type="button" class="btn-secondary btn-sm" id="history-detail-close">Close</button>
    </div>
    <div class="json-grid">
      <div><h3>Spec</h3><pre class="json" id="record-spec"></pre></div>
      <div><h3>Response</h3><pre class="json" id="record-response"></pre></div>
    </div>
  </div>
</section>

<section data-tab="config" hidden>
  <div class="panel">
    <div class="panel-head"><h2>Server config</h2><span class="muted" id="config-path"></span></div>
    <form id="config-form" class="grid" autocomplete="off">
      <div class="field"><label for="cfg-port">Port</label><input id="cfg-port" name="port" inputmode="numeric"></div>
      <div class="field"><label for="cfg-host">Host</label><input id="cfg-host" name="host"></div>
      <div class="field full"><label for="cfg-baseurl">Base URL</label><input id="cfg-baseurl" name="baseUrl"></div>
      <div class="field full"><label for="cfg-datadir">Data dir</label><input id="cfg-datadir" name="dataDir"></div>
      <div class="field"><label for="cfg-retention">Retention days (0 = forever)</label><input id="cfg-retention" name="retentionDays" inputmode="numeric"></div>
      <div class="field"><label for="cfg-timeout">Ask timeout (ms)</label><input id="cfg-timeout" name="timeoutMs" inputmode="numeric"></div>
      <div class="field"><label for="cfg-surface">Surface</label>
        <select id="cfg-surface" name="surface">
          <option value="auto">auto</option>
          <option value="apps">apps</option>
          <option value="browser">browser</option>
        </select>
      </div>
      <div class="form-foot full">
        <button type="submit" class="btn-primary">Save config</button>
        <span class="muted" id="config-notes"></span>
      </div>
    </form>
  </div>
</section>

<section data-tab="templates" hidden>
  <div class="panel">
    <div class="panel-head">
      <h2>Ask templates</h2>
      <span class="muted">referenced by id from the ask tool and /api/ask</span>
      <span style="flex:1"></span>
      <button type="button" class="btn-secondary btn-sm" id="template-new">New template</button>
    </div>
    <div id="template-list"></div>
  </div>
  <div class="panel" id="template-editor" hidden>
    <form id="template-form" autocomplete="off">
      <div class="form-foot" style="margin:0 0 14px">
        <div class="field" style="width:220px"><label for="tpl-id">Template id</label><input id="tpl-id" name="id" pattern="[a-z0-9][a-z0-9_\-]*" required></div>
        <div class="field" style="flex:1;min-width:220px"><label for="tpl-title">Title</label><input id="tpl-title" name="title" required></div>
        <div class="field full"><label for="tpl-desc">Description</label><input id="tpl-desc" name="description"></div>
      </div>
      <div class="field"><label for="tpl-spec">Spec (lenient ask args as JSON)</label><textarea id="tpl-spec" name="spec" spellcheck="false"></textarea></div>
      <div class="form-foot">
        <button type="submit" class="btn-primary">Save template</button>
        <button type="button" class="btn-danger" id="template-delete">Delete</button>
      </div>
    </form>
  </div>
</section>

<div id="flash" role="status" aria-live="polite"></div>
</div>`,
    adminClientScript(),
  )
}
