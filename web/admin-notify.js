/* ADMIN: Notify residents, and "New" labels on the resident list.
   - Announcements page: "Notify residents" sends a notice to all residents or only to chosen residents. The notice is an
     announcement, so it shows on the resident dashboard and in the app; one for chosen residents is shown only to their units.
     The administrator can also get the chosen residents' mobile numbers and the message to send as a text message.
   - Access page: residents whose account was created in the last 7 days get a "New" label, and a line counts how many have no mobile number.
   Loaded by admin.html after admin-more.js. It uses the same helpers as the pages (put, list, openForm, logAct...). */
(function () {
  if (window.RH_ROLE !== "admin") return;

  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  function residentsList() {
    return (DB.accounts || []).filter(function (a) { return a.role !== "admin" && !a.suspended; })
      .sort(function (x, y) { return String(x.unit || "").localeCompare(String(y.unit || ""), undefined, { numeric: true }) || String(x.name).localeCompare(String(y.name)); });
  }

  /* ---------------------------------------------------------------- Notify residents */
  window.rhNotify = async function () {
    try { await loadAccounts(); } catch (e) { return toast(errText(e)); }
    var res = residentsList(), picked = {};
    if (!res.length) return toast("There are no resident accounts yet.");
    openForm({
      title: "Notify residents",
      intro: "Choose who gets this notice. It appears under Announcements on their dashboard and in their app.",
      submit: "Send notice",
      fields: [
        { name: "audience", label: "Send to", type: "select", options: [["all", "All residents (" + res.length + ")"], ["pick", "Choose residents…"]], value: "all" },
        { name: "channel", label: "How", type: "select", options: [["app", "Dashboard and app"], ["sms", "Dashboard, app and text message (numbers are shown after sending)"]], value: "app" },
        { name: "title", label: "Title", value: "" },
        { name: "body", label: "Message", type: "textarea", value: "" }
      ],
      onSubmit: async function (d) {
        if (!d.title) return { error: "Enter a title." };
        var targets = d.audience === "all" ? res : res.filter(function (a) { return picked[a.id]; });
        if (!targets.length) return { error: "Choose at least one resident." };
        var units = null;
        if (d.audience !== "all") { units = []; targets.forEach(function (a) { if (a.unit && units.indexOf(a.unit) < 0) units.push(a.unit); }); }
        var nid = nextId(), v = { id: nid, title: d.title, body: d.body || "—", date: shortDate(new Date()), status: "Published", type: "General" };
        if (units) v.units = units;
        await put("announcement", nid, "", v);
        var withPhone = targets.filter(function (a) { return a.phone; });
        var to = units ? plural(targets.length, "resident") + " in " + plural(units.length, "unit") : "all residents (" + targets.length + ")";
        logAct("Notice sent to " + to + ": " + d.title, "Announcements");
        toast("Notice sent to " + to + ".");
        if (d.channel === "sms") setTimeout(function () { textForm(withPhone, targets.length - withPhone.length, d.title, d.body); }, 250);
      }
    });
    var form = document.getElementById("rhForm"); if (!form) return;
    var aud = form.querySelector('select[name="audience"]'), chn = form.querySelector('select[name="channel"]'), lab = aud.parentNode;
    var box = document.createElement("div"); box.style.cssText = "display:none;border:1px solid #d9d2c3;border-radius:12px;padding:8px;background:#fff";
    box.innerHTML = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px"><input type="search" id="ntPickQ" placeholder="Search name or unit" style="flex:1;min-width:140px;height:34px;border:1px solid #d9d2c3;border-radius:999px;padding:0 12px;font:inherit;font-size:13px">' +
      '<button type="button" class="btn" id="ntPickAll" style="min-height:34px;padding:0 10px;font-size:12px">Select shown</button><button type="button" class="btn" id="ntPickNone" style="min-height:34px;padding:0 10px;font-size:12px">Clear</button></div>' +
      '<div id="ntPickList" style="max-height:220px;overflow:auto"></div>';
    lab.parentNode.insertBefore(box, lab.nextSibling);
    var info = document.createElement("div"); info.className = "hint"; info.style.cssText = "margin:0;font-size:13px"; box.parentNode.insertBefore(info, chn.parentNode.nextSibling);
    var qEl = box.querySelector("#ntPickQ"), listEl = box.querySelector("#ntPickList");
    function shown() { var q = qEl.value.trim().toLowerCase(); return res.filter(function (a) { return !q || (a.name + " " + (a.unit || "") + " " + (a.phone || "")).toLowerCase().indexOf(q) >= 0; }); }
    function summary() {
      var tg = aud.value === "all" ? res : res.filter(function (a) { return picked[a.id]; }), ph = tg.filter(function (a) { return a.phone; }).length;
      info.innerHTML = "Will reach <b>" + plural(tg.length, "resident") + "</b> on the dashboard and in the app" +
        (chn.value === "sms" ? ". <b>" + ph + "</b> " + (ph === 1 ? "has" : "have") + " a mobile number to text" + (tg.length - ph ? ' <span class="chip warn">' + (tg.length - ph) + " without</span>" : "") : "") + ".";
    }
    function draw() {
      listEl.innerHTML = shown().map(function (a) {
        return '<label style="display:flex;gap:10px;align-items:center;padding:6px 4px;cursor:pointer;border-radius:8px"><input type="checkbox" data-id="' + escAttr(a.id) + '"' + (picked[a.id] ? " checked" : "") + '><span style="font-size:13px;line-height:1.35"><b>' + esc(a.name) + "</b> · " + esc(a.unit || "no unit") +
          '<br><span style="color:var(--muted)">' + (a.phone ? esc(a.phone) : "No mobile number") + "</span></span></label>";
      }).join("") || '<div class="hint" style="padding:8px">No resident matches.</div>';
      summary();
    }
    listEl.addEventListener("change", function (e) { var id = e.target.getAttribute("data-id"); if (id) { picked[id] = e.target.checked; summary(); } });
    qEl.addEventListener("input", draw);
    qEl.addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); });
    box.querySelector("#ntPickAll").addEventListener("click", function () { shown().forEach(function (a) { picked[a.id] = true; }); draw(); });
    box.querySelector("#ntPickNone").addEventListener("click", function () { picked = {}; draw(); });
    aud.addEventListener("change", function () { box.style.display = aud.value === "pick" ? "block" : "none"; summary(); });
    chn.addEventListener("change", summary);
    draw();
  };

  window.rhTextForm = textForm;
  // After a notice: the mobile numbers and the message, ready to copy into a text message.
  function textForm(withPhone, noPhone, title, body) {
    if (!withPhone.length) return toast("None of these residents has a mobile number on file.");
    var nums = withPhone.map(function (a) { return a.phone; }).join(", "), message = title + (body ? "\n" + body : "");
    openForm({
      title: "Text message",
      intro: "The notice is posted. To text it too, copy these " + plural(withPhone.length, "mobile number") + " and the message into your phone's messages." + (noPhone ? " " + plural(noPhone, "resident") + " without a mobile number will only see the notice online." : ""),
      submit: "Copy numbers and message",
      fields: [{ name: "nums", label: "Mobile numbers", type: "textarea", value: nums }, { name: "msg", label: "Message", type: "textarea", value: message }],
      onSubmit: async function (d) {
        var text = "To: " + d.nums + "\n\n" + d.msg;
        try { await navigator.clipboard.writeText(text); toast("Copied."); } catch (e) { toast("Copy was blocked. Select the text and copy it."); return { error: "Copy was blocked by the browser. Select the text above and copy it." }; }
      }
    });
  }

  /* ---------------------------------------------------------------- Announcements page: the Notify residents bar */
  var prevAnn = window.viewAnn;
  if (prevAnn) window.viewAnn = function () {
    return '<div class="card imp-bar"><span class="imp-bar-t"><b>Notify residents.</b> Send a notice to everyone or to chosen residents, and get their mobile numbers if you also want to text it.</span>' +
      '<button class="btn primary" type="button" onclick="rhNotify()">Notify residents</button></div>' + prevAnn();
  };

  /* ---------------------------------------------------------------- Access page: New labels */
  var prevManage = window.viewManage;
  if (prevManage) window.viewManage = function () {
    var h = prevManage(), week = 7 * 86400000, now = Date.now(), nNew = 0, noPhone = 0;
    (DB.accounts || []).forEach(function (a) {
      if (a.role === "admin") return;
      if (!a.phone) noPhone++;
      var c = Date.parse(a.created_at || "");
      if (!(c && now - c < week)) return;
      nNew++;
      var cell = '<td style="font-weight:700">' + esc(a.name) + '</td><td style="color:var(--muted)">' + esc(a.email) + "</td>";
      h = h.replace(cell, function () { return '<td style="font-weight:700">' + esc(a.name) + ' <span class="chip good" title="Account created ' + esc(new Date(c).toLocaleDateString()) + '">New</span></td><td style="color:var(--muted)">' + esc(a.email) + "</td>"; });
    });
    return '<div class="card" style="margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><b>Resident contact info</b>' +
      '<span class="chip good">' + nNew + " new in the last 7 days</span>" + (noPhone ? '<span class="chip warn">' + noPhone + " without a mobile number</span>" : "") +
      '<span class="hint" style="margin:0;flex:1 1 260px">Notify residents uses this list: the name, unit and mobile number come from each account.</span></div>' + h;
  };
})();
