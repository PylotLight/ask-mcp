/** Client script for the /admin dashboard. All data arrives via /admin/api/* + SSE. */
export function adminClientScript(): string {
  return `
(() => {
  "use strict";
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const fmtAge = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m " + (s % 60) + "s";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h " + (m % 60) + "m";
    return Math.floor(h / 24) + "d";
  };
  const api = async (path, opts) => {
    const res = await fetch(path, opts);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || res.status + " " + res.statusText);
    return body;
  };
  const flash = (msg, ok) => {
    const box = $("#flash");
    box.textContent = msg;
    box.classList.toggle("ok", !!ok);
    box.classList.toggle("err", !ok);
    box.classList.add("show");
    clearTimeout(flash.timer);
    flash.timer = setTimeout(() => box.classList.remove("show"), 5000);
  };

  /* ---- tabs ---- */
  const tabs = ["live", "history", "config", "templates"];
  const show = (name) => {
    for (const t of tabs) {
      $("section[data-tab=" + t + "]").hidden = t !== name;
      $("nav button[data-tab=" + t + "]").classList.toggle("active", t === name);
    }
    if (name === "history") loadDays();
    if (name === "config") loadConfig();
    if (name === "templates") loadTemplates();
  };
  document.querySelectorAll("nav button[data-tab]").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));

  /* ---- server info ---- */
  const loadServer = async () => {
    try {
      const info = await api("/admin/api/server");
      $("#server-version").textContent = "v" + info.version;
      $("#server-pending").textContent = String(info.pending);
      $("#server-uptime").textContent = fmtAge(info.uptimeSeconds * 1000);
      const c = info.config;
      $("#server-config").textContent =
        c.baseUrl + " · " + c.configPath + " · retention " + c.retentionDays + "d · timeout " + Math.round(c.timeoutMs / 1000) + "s" +
        (c.authTokenConfigured ? " · auth on" : "");
    } catch (err) { flash("server info failed: " + err.message); }
  };

  /* ---- live pending ---- */
  const KIND_LABEL = { approve: "approve", single_choice: "choice", multi_choice: "multi", text: "text", form: "form" };
  const renderPending = (entries) => {
    const list = $("#pending-list");
    list.textContent = "";
    $("#pending-empty").hidden = entries.length > 0;
    for (const e of entries) {
      const row = el("div", "pending-row");
      const main = el("div", "pending-main");
      main.append(
        el("span", "pending-title", e.title),
        el("span", "badge kind", KIND_LABEL[e.inputType] || e.inputType),
        el("span", "badge st " + e.status, e.status),
      );
      const meta = el("div", "pending-meta", e.requestId + " · age " + fmtAge(e.ageMs) + (e.action ? " · " + e.action : ""));
      row.append(main, meta);
      const actions = el("div", "pending-actions");
      if (e.status === "pending") {
        const open = el("a", "btn-secondary btn-sm", "Open");
        open.href = e.url; open.target = "_blank"; open.rel = "noopener";
        const cancel = el("button", "btn-danger btn-sm", "Cancel");
        cancel.addEventListener("click", async () => {
          try { await api("/admin/api/pending/" + e.token + "/cancel", { method: "POST" }); flash("Cancelled " + e.token, true); }
          catch (err) { flash("cancel failed: " + err.message); }
        });
        actions.append(open, cancel);
      } else {
        actions.append(el("span", "pending-done", "—"));
      }
      row.append(actions);
      list.append(row);
    }
    $("#server-pending").textContent = String(entries.filter((e) => e.status === "pending").length);
  };
  const connectEvents = () => {
    const es = new EventSource("/admin/events");
    es.addEventListener("pending", (ev) => {
      try { renderPending(JSON.parse(ev.data).entries || []); } catch { /* ignore malformed */ }
    });
    es.onerror = () => { es.close(); setTimeout(connectEvents, 3000); };
  };

  /* ---- history ---- */
  let currentDay = null;
  const loadDays = async () => {
    try {
      const { days } = await api("/admin/api/history?limit=30");
      const wrap = $("#history-days");
      wrap.textContent = "";
      if (!days.length) { wrap.append(el("span", "muted", "No artifacts yet.")); return; }
      if (!currentDay || !days.includes(currentDay)) currentDay = days[0];
      for (const d of days) {
        const chip = el("button", "chip" + (d === currentDay ? " active" : ""), d);
        chip.addEventListener("click", () => { currentDay = d; loadDays(); });
        wrap.append(chip);
      }
      await loadAsks();
    } catch (err) { flash("history failed: " + err.message); }
  };
  const loadAsks = async () => {
    const { asks } = await api("/admin/api/history/" + currentDay);
    const list = $("#history-list");
    list.textContent = "";
    $("#history-empty").hidden = asks.length > 0;
    for (const a of asks) {
      const row = el("button", "history-row");
      row.append(
        el("span", "history-time", (a.savedAt || "").replace("T", " ").slice(0, 19)),
        el("span", "history-title", a.title || a.token),
        el("span", "badge kind", KIND_LABEL[a.inputKind] || a.inputKind || "?"),
        el("span", "badge st " + (a.hasResponse ? a.responseAction || "answered" : "no-response"), a.hasResponse ? a.responseAction || "answered" : "open"),
      );
      row.addEventListener("click", () => showRecord(a));
      list.append(row);
    }
  };
  const showRecord = async (a) => {
    try {
      const rec = await api("/admin/api/history/" + a.date + "/" + a.token);
      $("#history-detail").hidden = false;
      $("#history-detail-title").textContent = rec.spec?.args?.title || a.token;
      $("#record-spec").textContent = JSON.stringify(rec.spec, null, 2);
      $("#record-response").textContent = JSON.stringify(rec.response, null, 2);
      const renderLink = $("#record-render");
      renderLink.href = "/admin/api/history/" + a.date + "/" + a.token + "/render";
      renderLink.hidden = !rec.hasRender;
    } catch (err) { flash("record failed: " + err.message); }
  };
  $("#history-detail-close").addEventListener("click", () => { $("#history-detail").hidden = true; });

  /* ---- config ---- */
  const loadConfig = async () => {
    try {
      const info = await api("/admin/api/config");
      const v = info.values;
      const form = $("#config-form");
      form.elements.port.value = v.port;
      form.elements.host.value = v.host;
      form.elements.baseUrl.value = v.baseUrl;
      form.elements.dataDir.value = v.dataDir;
      form.elements.retentionDays.value = v.retentionDays;
      form.elements.timeoutMs.value = v.timeoutMs;
      form.elements.surface.value = v.surface;
      $("#config-path").textContent = info.configPath;
      $("#config-notes").textContent = "runtime-applied: " + info.notes.runtimeApplied.join(", ") + " · restart required for: " + info.notes.restartRequired.join(", ") + " · " + info.notes.tokens;
    } catch (err) { flash("config load failed: " + err.message); }
  };
  $("#config-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const payload = {
      port: f.elements.port.value,
      host: f.elements.host.value,
      baseUrl: f.elements.baseUrl.value,
      dataDir: f.elements.dataDir.value,
      retentionDays: f.elements.retentionDays.value,
      timeoutMs: f.elements.timeoutMs.value,
      surface: f.elements.surface.value,
    };
    try {
      const out = await api("/admin/api/config", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const restart = out.restartRequired.length ? " · restart to apply: " + out.restartRequired.join(", ") : "";
      flash("Config saved" + (out.appliedRuntime.length ? " (live: " + out.appliedRuntime.join(", ") + ")" : "") + restart, true);
      loadServer();
    } catch (err) { flash("save failed: " + err.message); }
  });

  /* ---- templates ---- */
  const loadTemplates = async () => {
    try {
      const { templates } = await api("/admin/api/templates");
      const list = $("#template-list");
      list.textContent = "";
      for (const t of templates) {
        const row = el("button", "template-row");
        row.append(
          el("span", "template-id", t.id),
          el("span", "template-title", t.title),
        );
        row.addEventListener("click", () => editTemplate(t));
        list.append(row);
      }
    } catch (err) { flash("templates failed: " + err.message); }
  };
  const editTemplate = (t) => {
    const form = $("#template-form");
    form.elements.id.value = t.id;
    form.elements.title.value = t.title;
    form.elements.description.value = t.description || "";
    form.elements.spec.value = JSON.stringify(t.spec, null, 2);
    form.elements.id.disabled = !!t.id;
    $("#template-editor").hidden = false;
    $("#template-new").hidden = !!t.id;
  };
  $("#template-new").addEventListener("click", () => {
    editTemplate({ id: "", title: "", description: "", spec: { title: "", blocks: [{ type: "paragraph", text: "" }], input: { type: "approve" } } });
  });
  $("#template-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    let spec;
    try { spec = JSON.parse(f.elements.spec.value); }
    catch { return flash("spec is not valid JSON"); }
    try {
      await api("/admin/api/templates/" + encodeURIComponent(f.elements.id.value), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: f.elements.title.value, description: f.elements.description.value, spec }),
      });
      flash("Template saved", true);
      loadTemplates();
    } catch (err) { flash("save failed: " + err.message); }
  });
  $("#template-delete").addEventListener("click", async () => {
    const f = $("#template-form");
    if (!f.elements.id.value) return;
    try {
      await api("/admin/api/templates/" + encodeURIComponent(f.elements.id.value), { method: "DELETE" });
      flash("Template deleted", true);
      $("#template-editor").hidden = true;
      loadTemplates();
    } catch (err) { flash("delete failed: " + err.message); }
  });

  /* ---- logout ---- */
  $("#logout").addEventListener("click", async () => {
    await api("/admin/logout", { method: "POST" }).catch(() => {});
    location.reload();
  });

  /* ---- boot ---- */
  loadServer();
  connectEvents();
  setInterval(loadServer, 30_000);
  show("live");
})();
`;
}
