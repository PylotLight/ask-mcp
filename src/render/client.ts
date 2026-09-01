import { esc } from "./escape.js"
import type { AskArgs } from "../schema/index.js"

export function clientScript(args: AskArgs, settleViewMs = 8000): string {
  const inputType = args.input.type
  const noteRequired = inputType === "approve" ? args.input.noteRequired ?? "never" : "never"
  const json = (v: unknown): string => JSON.stringify(v).replace(/</g, "\\u003c")
  return `
(function () {
  var CFG = {
    token: document.body.dataset.token,
    initialStatus: document.body.dataset.status,
    inputType: ${json(inputType)},
    noteRequired: ${json(noteRequired)},
    settleViewMs: ${json(settleViewMs)}
  };
  var $ = function (id) { return document.getElementById(id); };
  var statusBox = $("status-box"), statusMsg = $("status-msg");
  var busy = false;
  var es = null;
  var lastResult = null;

  function setStatus(kind, msg, spinner) {
    statusBox.className = "status show" + (kind === "done" ? " done" : kind === "err" ? " err" : "");
    statusMsg.textContent = msg;
    $("status-spinner").style.display = spinner ? "block" : "none";
  }

  function lockUi() {
    document.body.classList.add("terminal");
    document.querySelectorAll("button, input, textarea, select").forEach(function (el) {
      if (el.id !== "btn-close") el.disabled = true;
    });
  }

  function tryClose() {
    window.open("", "_self");
    window.close();
  }

  function clip(text, max) {
    var clean = String(text).replace(/\\s+/g, " ").trim();
    return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
  }

  function describeResult(r) {
    try {
      if (!r) return "";
      if (r.action === "approve") return "Approved." + (r.note ? " Note recorded: " + clip(r.note, 200) : "");
      if (r.action === "reject") return "Rejected." + (r.note ? " Note recorded: " + clip(r.note, 200) : "");
      if (r.action === "choose") {
        var ids = r.optionIds || (r.optionId ? [r.optionId] : []);
        var labels = ids.map(function (id) {
          if (id === "__other__") return "Other: " + (r.otherText ? clip(r.otherText, 120) : "(empty)");
          var el = document.querySelector('input[name="choice"][value="' + id + '"]');
          var title = el && el.closest(".choice") && el.closest(".choice").querySelector(".choice-title");
          return title ? title.textContent.trim() : id;
        });
        return "Chose " + labels.join(", ") + ".";
      }
      if (r.action === "submit" && r.value !== undefined) return "Answer: " + clip(r.value, 300);
      if (r.action === "submit" && r.values) {
        var pairs = Object.keys(r.values).map(function (k) { return k + ": " + clip(r.values[k], 80); });
        return "Submitted " + (pairs.length ? pairs.join(" · ") : "(empty form)");
      }
      return "";
    } catch (e) { return ""; }
  }

  function settle(kind, title, summary) {
    if (document.body.classList.contains("terminal")) return;
    lockUi();
    var view = $("settle-view");
    view.classList.toggle("err", kind === "err");
    $("settle-title").textContent = title;
    $("settle-summary").textContent = summary || "";
    $("settle-permalink").textContent = window.location.href;
    view.hidden = false;
    statusBox.className = "status";
    statusMsg.textContent = "";
    if (CFG.settleViewMs > 0) setTimeout(tryClose, CFG.settleViewMs);
  }

  function showResultState(status) {
    if (status === "consumed") {
      settle("done", "Answer recorded", describeResult(lastResult) || "Your answer was delivered to the agent. Safe to close this tab.");
    } else if (status === "submitted") {
      setStatus("", "Answer sent — waiting for the agent to pick it up…", true);
      document.querySelectorAll("button").forEach(function (b) { if (b.id !== "btn-close") b.disabled = true; });
      listen();
    } else if (status === "expired") {
      settle("err", "This question expired", "No answer was sent. Safe to close this tab.");
    } else if (status === "cancelled") {
      settle("err", "Cancelled — nothing was sent", "The question was withdrawn. Safe to close this tab.");
    }
  }

  function validate() {
    var type = CFG.inputType;
    if (type === "approve") {
      var required = CFG.noteRequired === "always";
      var ok = !required || ($("ask-note").value.trim().length > 0);
      $("note-field").classList.toggle("invalid", !ok);
      return ok;
    }
    if (type === "single_choice") {
      var sel = document.querySelector('input[name="choice"]:checked');
      var ok1 = !!sel;
      if (ok1 && sel.value === "__other__") ok1 = !!$("other-input") && $("other-input").value.trim().length > 0;
      $("choice-list").classList.toggle("invalid", !ok1);
      return ok1;
    }
    if (type === "multi_choice") {
      var checked = Array.prototype.slice.call(document.querySelectorAll('input[name="choice"]:checked'));
      var n = checked.length;
      var min = Number($("choice-list").dataset.min || 0), max = Number($("choice-list").dataset.max || Infinity);
      var otherSel = checked.some(function (c) { return c.value === "__other__"; });
      var okOther = !otherSel || (!!$("other-input") && $("other-input").value.trim().length > 0);
      var ok2 = n >= min && n <= max && okOther;
      $("choice-error").style.display = (n >= min && n <= max) ? "none" : "block";
      return ok2;
    }
    if (type === "text") {
      var el = $("text-input"), v = el.value, minL = Number(el.dataset.min || 0), maxL = Number(el.dataset.max || 20000);
      var ok3 = v.length >= minL && v.length <= maxL;
      $("text-field").classList.toggle("invalid", !ok3);
      return ok3;
    }
    if (type === "form") {
      var allOk = true;
      document.querySelectorAll(".field[id^='field-']").forEach(function (field) {
        var id = field.id.replace("field-", ""), input = $("f-" + id), err = $("fe-" + id);
        var bad = false, val = input.type === "checkbox" ? (input.checked ? "1" : "") : input.value;
        if (input.dataset.required && !val) bad = true;
        if (input.dataset.min !== undefined && input.dataset.min !== "" && input.type !== "checkbox") {
          if (input.type === "number") { if (val !== "" && Number(val) < Number(input.dataset.min)) bad = true; }
          else if (val.length < Number(input.dataset.min)) bad = true;
        }
        if (input.dataset.max !== undefined && input.dataset.max !== "" && input.type !== "checkbox") {
          if (input.type === "number") { if (val !== "" && Number(val) > Number(input.dataset.max)) bad = true; }
          else if (val.length > Number(input.dataset.max)) bad = true;
        }
        if (input.type === "email" && val && !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(val)) bad = true;
        field.classList.toggle("invalid", bad);
        err.textContent = bad ? "Please provide a valid value." : "";
        if (bad) allOk = false;
      });
      return allOk;
    }
    return true;
  }

  function buildResult(action) {
    var type = CFG.inputType;
    if (type === "approve") {
      var note = $("ask-note").value.trim();
      var r = { action: action };
      if (note) r.note = note;
      return r;
    }
    if (type === "single_choice") {
      var sel = document.querySelector('input[name="choice"]:checked');
      var r = { action: "choose", optionId: sel.value };
      if (sel.value === "__other__") r.otherText = $("other-input").value.trim();
      return r;
    }
    if (type === "multi_choice") {
      var ids = Array.prototype.map.call(document.querySelectorAll('input[name="choice"]:checked'), function (c) { return c.value; });
      var r = { action: "choose", optionIds: ids };
      if (ids.indexOf("__other__") !== -1) r.otherText = $("other-input").value.trim();
      return r;
    }
    if (type === "text") return { action: "submit", value: $("text-input").value };
    if (type === "form") {
      var values = {};
      Object.keys(${json(inputType === "form" ? args.input.schema.properties : {})}).forEach(function (k) {
        var el = $("f-" + k);
        values[k] = el.type === "checkbox" ? el.checked : el.type === "number" ? (el.value === "" ? null : Number(el.value)) : el.value;
      });
      return { action: "submit", values: values };
    }
    return { action: "submit" };
  }

  function send(result) {
    if (busy) return;
    if (!validate()) return;
    busy = true;
    fetch("/f/" + CFG.token + "/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(result)
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (e) { throw new Error(e.error || "submit failed"); });
      return res.json();
    }).then(function () {
      lastResult = result;
      setStatus("", "Answer sent — waiting for the agent to pick it up…", true);
      listen();
    }).catch(function (err) {
      busy = false;
      setStatus("err", "Could not submit: " + err.message, false);
    });
  }

  var listenErrors = 0;
  function listen() {
    if (es) es.close();
    listenErrors = 0;
    es = new EventSource("/f/" + CFG.token + "/events");
    es.addEventListener("status", function (ev) {
      listenErrors = 0;
      var s = JSON.parse(ev.data).status;
      if (s === "submitted") {
        setStatus("", "Answer sent — waiting for the agent to pick it up…", true);
      } else if (s !== "pending") {
        es.close();
        es = null;
        showResultState(s);
      }
    });
    es.addEventListener("consumed", function () { es.close(); es = null; showResultState("consumed"); });
    es.onerror = function () {
      listenErrors++;
      if (listenErrors > 5) {
        es.close();
        es = null;
        setStatus("err", "Connection lost — reload this page.", false);
      }
    };
  }

  document.querySelectorAll("[data-action]").forEach(function (btn) {
    btn.addEventListener("click", function () { send(buildResult(btn.dataset.action)); });
  });
  var cancelBtn = $("btn-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", function () {
    if (busy) return;
    busy = true;
    fetch("/f/" + CFG.token + "/cancel", { method: "POST" }).then(function () {
      showResultState("cancelled");
    });
  });
  $("btn-close").addEventListener("click", tryClose);
  document.querySelectorAll("#choice-list .choice input").forEach(function (c) {
    c.addEventListener("change", function () {
      document.querySelectorAll("#choice-list .choice").forEach(function (card) {
        card.classList.toggle("selected", card.querySelector("input").checked);
      });
      var counter = $("choice-count");
      if (counter) {
        var nSel = document.querySelectorAll('input[name="choice"]:checked').length;
        var maxN = Number($("choice-list").dataset.max || 0);
        counter.hidden = nSel === 0;
        counter.textContent = maxN ? nSel + " of max " + maxN + " selected" : nSel + " selected";
      }
      if (CFG.inputType === "single_choice") validate();
    });
  });

  var otherInput = $("other-input");
  if (otherInput) {
    otherInput.addEventListener("input", function () {
      var box = document.querySelector('input[name="choice"][value="__other__"]');
      if (!box || box.checked) return;
      if (CFG.inputType === "single_choice") {
        box.checked = true;
        box.dispatchEvent(new Event("change"));
      } else {
        var n = document.querySelectorAll('input[name="choice"]:checked').length;
        var maxN = Number($("choice-list").dataset.max || Infinity);
        if (n < maxN) {
          box.checked = true;
          box.dispatchEvent(new Event("change"));
        }
      }
    });
  }

  if (CFG.initialStatus === "pending") {
    listen();
  } else {
    showResultState(CFG.initialStatus);
  }
})();
`
}
