/* DEMO ONLY: maintenance management for ResidentHub.
   Adds (1) a preventive maintenance schedule, (2) an equipment list, (3) a maintenance staff list and
   (4) repair assignment on grievances (who, target date, equipment, note).
   Loaded by demo/admin.html and demo/resident.html after the real scripts. The real website and the real
   database do not load this file, so nothing here touches production.
   Data kinds (all stored in the demo's in-memory records table):
     staff     unit "__admin"  {id, name, role, phone}
     equipment unit "__admin"  {id, name, category, location, status, lastService}
     mtask     unit ""         {id, title, equipId, equipName, every, days, due, staffId, assignee, lastDone, history[]}
     grievance (existing)      + staffId, assignee, target, equipId, equipName, notes */
(function () {
  if (!window.RH_DEMO) return;
  var IS_ADMIN = window.RH_ROLE === "admin";

  var FREQ = [["Weekly", 7], ["Every 2 weeks", 14], ["Monthly", 30], ["Every 3 months", 90], ["Every 6 months", 180], ["Yearly", 365]];
  var EQ_STATUS = ["Working", "Needs repair", "Under maintenance"];
  var EQ_CATS = ["Elevator", "Plumbing", "Electrical", "Fire safety", "Pool", "Gym", "Air conditioning", "Security", "Other"];
  var BTN = 'class="btn" style="min-height:32px;padding:0 10px;font-size:12px';

  NAV_ICONS.maint = '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4h6v3H9zM9 14l2 2 4-4"/>';

  /* ---------- small helpers ---------- */
  function today() { var d = new Date(); d.setHours(12, 0, 0, 0); return d; }
  function kd(k) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(k || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function daysTo(k) { var d = kd(k); return d ? Math.round((d - today()) / 86400000) : null; }
  function fd(k) { var d = kd(k); return d ? shortDate(d) : "—"; }
  function addDays(k, n) { var d = kd(k) || today(); d.setDate(d.getDate() + n); return dayKey(d); }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  // [label, chip class] for the due date of a task.
  function taskState(t) {
    var n = daysTo(t.due);
    if (n == null) return ["No date", "info"];
    if (n < 0) return ["Overdue by " + plural(-n, "day"), "bad"];
    if (n === 0) return ["Due today", "warn"];
    if (n <= 7) return ["Due in " + plural(n, "day"), "warn"];
    return ["Scheduled", "good"];
  }
  function eqChip(s) { return '<span class="chip ' + (s === "Working" ? "good" : s === "Under maintenance" ? "warn" : "bad") + '">' + esc(s) + "</span>"; }
  function tasks() { return list("mtask").sort(function (a, b) { return String(a.v.due || "").localeCompare(String(b.v.due || "")); }); }
  function byName(a, b) { return String(a.v.name || "").localeCompare(String(b.v.name || "")); }
  function staffList() { return list("staff").sort(byName); }
  function equipList() { return list("equipment").sort(byName); }
  function staffOptions(none) { return [["", none || "— Unassigned —"]].concat(staffList().map(function (s) { return [s.id, s.v.name + " · " + s.v.role]; })); }
  function equipOptions() { return [["", "— None —"]].concat(equipList().map(function (e) { return [e.id, e.v.name + " · " + e.v.location]; })); }
  function staffNameOf(id) { var s = getRow("staff", id); return s ? s.value.name : ""; }
  function equipNameOf(id) { var e = getRow("equipment", id); return e ? e.value.name : ""; }
  function dueCount() { return tasks().filter(function (r) { var n = daysTo(r.v.due); return n != null && n <= 7; }).length; }
  function openRepairs(equipId) { return list("grievance").filter(function (r) { return r.v.equipId === equipId && !(Number(r.v.stage) >= 2); }).length; }

  /* ==========================================================================
     ADMIN
     ========================================================================== */
  function viewMaint() {
    var tab = state.mtab || "sched";
    var ts = tasks(), overdue = ts.filter(function (r) { return daysTo(r.v.due) < 0; }).length;
    var soon = ts.filter(function (r) { var n = daysTo(r.v.due); return n >= 0 && n <= 7; }).length;
    var eq = equipList(), bad = eq.filter(function (e) { return e.v.status !== "Working"; }).length;
    var tabs = [["sched", "Schedule (" + ts.length + ")"], ["equip", "Equipment (" + eq.length + ")"], ["staff", "Staff (" + staffList().length + ")"]];
    return '<div class="grid cols-3" style="margin-bottom:16px">' + statCard("Overdue tasks", overdue) + statCard("Due in the next 7 days", soon) + statCard("Equipment needing attention", bad) + "</div>" +
      '<div class="filters" style="margin-bottom:14px">' + tabs.map(function (t) {
        return '<button class="' + (tab === t[0] ? "active" : "") + '" onclick="set({mtab:\'' + t[0] + '\'})">' + t[1] + "</button>";
      }).join("") + "</div>" + (tab === "equip" ? maintEquip(eq) : tab === "staff" ? maintStaff() : maintSched(ts));
  }

  function maintSched(ts) {
    var rows = ts.map(function (r) {
      var t = r.v, st = taskState(t);
      return "<tr><td><b>" + esc(t.title) + '</b><div style="font-size:12px;color:var(--muted)">Last done ' + esc(fd(t.lastDone)) + "</div></td><td>" + esc(t.equipName || "—") + "</td><td>" + esc(t.every) + "</td><td>" + esc(fd(t.due)) +
        '<div><span class="chip ' + st[1] + '">' + st[0] + "</span></div></td><td>" + esc(t.assignee || "Unassigned") + "</td><td style=\"white-space:nowrap\">" +
        '<button class="btn primary" style="min-height:32px;padding:0 10px;font-size:12px" onclick="maintDone(\'' + escAttr(r.id) + '\')">Mark done</button> ' +
        "<button " + BTN + '" onclick="maintTaskForm(\'' + escAttr(r.id) + '\')">Edit</button> <button ' + BTN + ';color:#A02B1D" onclick="maintDelete(\'mtask\',\'' + escAttr(r.id) + '\')">Delete</button></td></tr>';
    });
    return '<div style="margin-bottom:12px"><button class="btn primary" onclick="maintTaskForm(null)">+ Add task</button></div>' +
      '<div class="card" style="padding:0;overflow:hidden">' + tableRows(rows, ["TASK", "EQUIPMENT", "REPEATS", "NEXT DUE", "ASSIGNED TO", ""], "No maintenance tasks yet. Add the first one.") + "</div>";
  }

  function maintEquip(eq) {
    var rows = eq.map(function (r) {
      var e = r.v, n = openRepairs(r.id);
      return "<tr><td><b>" + esc(e.name) + "</b></td><td>" + esc(e.category) + "</td><td>" + esc(e.location) + "</td><td>" + eqChip(e.status) + "</td><td>" + esc(fd(e.lastService)) + "</td><td>" + (n ? '<span class="chip warn">' + plural(n, "open repair") + "</span>" : "—") +
        '</td><td style="white-space:nowrap"><button ' + BTN + '" onclick="maintEquipForm(\'' + escAttr(r.id) + '\')">Edit</button> <button ' + BTN + ';color:#A02B1D" onclick="maintDelete(\'equipment\',\'' + escAttr(r.id) + '\')">Delete</button></td></tr>';
    });
    return '<div style="margin-bottom:12px"><button class="btn primary" onclick="maintEquipForm(null)">+ Add equipment</button></div>' +
      '<div class="card" style="padding:0;overflow:hidden">' + tableRows(rows, ["EQUIPMENT", "CATEGORY", "LOCATION", "STATUS", "LAST SERVICE", "REPAIRS", ""], "No equipment listed yet.") + "</div>";
  }

  function maintStaff() {
    var rows = staffList().map(function (r) {
      var s = r.v;
      var rep = list("grievance").filter(function (g) { return g.v.staffId === r.id && !(Number(g.v.stage) >= 2); }).length;
      var tk = tasks().filter(function (t) { return t.v.staffId === r.id; }).length;
      return "<tr><td><b>" + esc(s.name) + "</b></td><td>" + esc(s.role) + "</td><td>" + esc(s.phone || "—") + "</td><td>" + plural(rep, "open repair") + ", " + plural(tk, "task") +
        '</td><td style="white-space:nowrap"><button ' + BTN + '" onclick="maintStaffForm(\'' + escAttr(r.id) + '\')">Edit</button> <button ' + BTN + ';color:#A02B1D" onclick="maintDelete(\'staff\',\'' + escAttr(r.id) + '\')">Delete</button></td></tr>';
    });
    return '<div style="margin-bottom:12px"><button class="btn primary" onclick="maintStaffForm(null)">+ Add staff</button></div>' +
      '<div class="card" style="padding:0;overflow:hidden">' + tableRows(rows, ["NAME", "ROLE", "PHONE", "ASSIGNED WORK", ""], "No maintenance staff yet.") + "</div>";
  }

  /* ----- forms ----- */
  window.maintTaskForm = function (id) {
    var t = id ? (getRow("mtask", id) || {}).value || {} : {};
    openForm({
      title: id ? "Edit maintenance task" : "Add maintenance task",
      fields: [
        { name: "title", label: "Task", value: t.title, placeholder: "e.g. Elevator inspection" },
        { name: "equipId", label: "Equipment (optional)", type: "select", options: equipOptions(), value: t.equipId || "" },
        { name: "every", label: "Repeats", type: "select", options: FREQ.map(function (f) { return f[0]; }), value: t.every || "Monthly" },
        { name: "due", label: "Next due date", type: "date", value: t.due || dayKey(new Date()) },
        { name: "staffId", label: "Assigned to", type: "select", options: staffOptions(), value: t.staffId || "" }
      ],
      onSubmit: async function (d) {
        if (!d.title) return { error: "Enter the task." };
        if (!d.due) return { error: "Choose the next due date." };
        var f = FREQ.filter(function (x) { return x[0] === d.every; })[0] || FREQ[2], nid = id || String(nextId());
        var v = Object.assign({}, t, { id: nid, title: d.title, equipId: d.equipId, equipName: d.equipId ? equipNameOf(d.equipId) : (t.equipName || ""), every: f[0], days: f[1], due: d.due, staffId: d.staffId, assignee: d.staffId ? staffNameOf(d.staffId) : "" });
        if (!d.equipId && !id) v.equipName = "";
        if (!d.equipId && id && t.equipId) v.equipName = "";
        await put("mtask", nid, "", v);
        logAct((id ? "Maintenance task updated: " : "Maintenance task added: ") + d.title, "Maintenance");
      }
    });
  };

  window.maintEquipForm = function (id) {
    var e = id ? (getRow("equipment", id) || {}).value || {} : {};
    openForm({
      title: id ? "Edit equipment" : "Add equipment",
      fields: [
        { name: "name", label: "Name", value: e.name, placeholder: "e.g. Elevator A" },
        { name: "category", label: "Category", type: "select", options: EQ_CATS, value: e.category || EQ_CATS[0] },
        { name: "location", label: "Location", value: e.location, placeholder: "e.g. Basement pump room" },
        { name: "status", label: "Condition", type: "select", options: EQ_STATUS, value: e.status || "Working" },
        { name: "lastService", label: "Last serviced", type: "date", value: e.lastService || "" }
      ],
      onSubmit: async function (d) {
        if (!d.name) return { error: "Enter the equipment name." };
        var nid = id || String(nextId());
        await put("equipment", nid, "__admin", Object.assign({}, e, { id: nid, name: d.name, category: d.category, location: d.location, status: d.status, lastService: d.lastService }));
        logAct((id ? "Equipment updated: " : "Equipment added: ") + d.name, "Maintenance");
      }
    });
  };

  window.maintStaffForm = function (id) {
    var s = id ? (getRow("staff", id) || {}).value || {} : {};
    openForm({
      title: id ? "Edit staff member" : "Add staff member",
      fields: [
        { name: "name", label: "Name", value: s.name },
        { name: "role", label: "Role", value: s.role, placeholder: "e.g. Plumber" },
        { name: "phone", label: "Phone", value: s.phone }
      ],
      onSubmit: async function (d) {
        if (!d.name) return { error: "Enter the name." };
        var nid = id || String(nextId());
        await put("staff", nid, "__admin", { id: nid, name: d.name, role: d.role || "Maintenance", phone: d.phone });
        logAct((id ? "Staff updated: " : "Staff added: ") + d.name, "Maintenance");
      }
    });
  };

  window.maintDone = function (id) {
    var row = getRow("mtask", id); if (!row) return;
    act(async function () {
      var t = row.value, now = dayKey(new Date()), hist = [{ date: now, by: t.assignee || "Office" }].concat(t.history || []).slice(0, 12);
      var next = addDays(now, Number(t.days) || 30);
      await put("mtask", id, "", Object.assign({}, t, { lastDone: now, due: next, history: hist }));
      if (t.equipId && getRow("equipment", t.equipId)) await put("equipment", t.equipId, "__admin", Object.assign({}, getRow("equipment", t.equipId).value, { lastService: now }));
      logAct("Maintenance done: " + t.title, "Maintenance");
      toast("Marked done. Next due " + fd(next) + ".");
    });
  };

  window.maintDelete = function (kind, id) {
    var row = getRow(kind, id); if (!row) return;
    var name = row.value.title || row.value.name, label = kind === "mtask" ? "task" : kind === "staff" ? "staff member" : "equipment";
    confirmBox("Delete " + label, "Delete “" + name + "”? This cannot be undone.", "Delete", async function () {
      if (kind === "staff") {
        var busy = list("grievance").filter(function (g) { return g.v.staffId === id && !(Number(g.v.stage) >= 2); }).length + tasks().filter(function (t) { return t.v.staffId === id; }).length;
        if (busy) return { error: name + " still has " + plural(busy, "assignment") + ". Reassign them first." };
      }
      if (kind === "equipment") {
        var linked = tasks().filter(function (t) { return t.v.equipId === id; }).length + openRepairs(id);
        if (linked) return { error: name + " is still used by " + plural(linked, "linked item") + ". Remove or finish those first." };
      }
      await del(kind, id);
      logAct("Deleted " + label + ": " + name, "Maintenance");
    }, true);
  };

  /* ----- repair assignment on grievances ----- */
  window.maintAssignForm = function (id) {
    var row = getRow("grievance", id); if (!row) return;
    var g = row.value;
    openForm({
      title: "Assign repair",
      intro: esc(g.title),
      fields: [
        { name: "staffId", label: "Assigned to", type: "select", options: staffOptions(), value: g.staffId || "" },
        { name: "target", label: "Target completion date", type: "date", value: g.target || addDays(dayKey(new Date()), 3) },
        { name: "equipId", label: "Related equipment (optional)", type: "select", options: equipOptions(), value: g.equipId || "" },
        { name: "notes", label: "Note for the repair", type: "textarea", value: g.notes, placeholder: "What needs to be done?" }
      ],
      onSubmit: async function (d) {
        var v = Object.assign({}, row.value);
        if (d.staffId) {
          v.staffId = d.staffId; v.assignee = staffNameOf(d.staffId); v.target = d.target;
          if (!(Number(v.stage) >= 1)) v.stage = 1;
        } else { delete v.staffId; delete v.assignee; delete v.target; }
        if (d.equipId) { v.equipId = d.equipId; v.equipName = equipNameOf(d.equipId); } else { delete v.equipId; delete v.equipName; }
        if (d.notes) v.notes = d.notes; else delete v.notes;
        await put("grievance", id, row.unit, v);
        if (d.staffId && d.equipId) {
          var e = getRow("equipment", d.equipId);
          if (e && e.value.status === "Working") await put("equipment", d.equipId, "__admin", Object.assign({}, e.value, { status: "Under maintenance" }));
        }
        logAct(d.staffId ? "Repair assigned to " + v.assignee + ": " + g.title : "Repair unassigned: " + g.title, "Requests");
        toast(d.staffId ? "Assigned to " + v.assignee + "." : "Assignment removed.");
      }
    });
  };

  // Resolving a grievance that is linked to equipment puts the equipment back to Working.
  window.advanceGr = function (id) {
    var row = getRow("grievance", id); if (!row) return;
    act(async function () {
      var st = Math.min(2, (Number(row.value.stage) || 0) + 1), now = dayKey(new Date());
      var v = Object.assign({}, row.value, { stage: st });
      if (st === 2) v.resolvedOn = now;
      await put("grievance", id, row.unit, v);
      if (st === 2 && v.equipId && getRow("equipment", v.equipId)) {
        await put("equipment", v.equipId, "__admin", Object.assign({}, getRow("equipment", v.equipId).value, { status: "Working", lastService: now }));
      }
      logAct("Grievance " + (st === 2 ? "resolved" : "in progress") + ": " + row.value.title, "Requests");
    });
  };

  function assignBlock(r) {
    var g = r.v, s = Math.min(2, Math.max(0, Number(g.stage) || 0)), late = g.target && s < 2 && daysTo(g.target) < 0;
    var body = g.assignee
      ? 'Assigned to <b>' + esc(g.assignee) + "</b>" + (g.target ? " · target " + esc(fd(g.target)) + (late ? ' <span class="chip bad">Late</span>' : "") : "") +
        (g.equipName ? '<div style="color:var(--muted)">Equipment: ' + esc(g.equipName) + "</div>" : "") +
        (g.notes ? '<div style="color:var(--muted);font-style:italic">“' + esc(g.notes) + "”</div>" : "")
      : '<span style="color:var(--muted)">Not assigned to anyone yet.</span>';
    return '<div style="margin-top:10px;padding:10px 12px;border:1px dashed var(--border2);border-radius:12px;font-size:13px;line-height:1.5">' + body + "</div>";
  }

  var origViewReq = window.viewReq;
  window.viewReq = function () {
    var names = ["Open", "In progress", "Resolved"], grs = newest(list("grievance"));
    var docsPart = origViewReq(), cut = docsPart.indexOf('<div class="card" style="padding:0;overflow:hidden;margin-top:16px">');
    docsPart = cut >= 0 ? docsPart.slice(cut) : "";
    var head = grs.length ? '<div class="grid cols-3">' + grs.map(function (r) {
      var g = r.v, s = Math.min(2, Math.max(0, Number(g.stage) || 0));
      var steps = names.map(function (n, k) { return '<span class="chip ' + (k === s ? (k === 2 ? "good" : k === 1 ? "warn" : "bad") : "info") + '" style="' + (k === s ? "" : "background:#F1E9D8;color:#6F6753") + '">' + n + "</span>"; }).join(" ");
      return '<div class="card"><div><div style="font:700 17px \'Bricolage Grotesque\',\'Source Sans 3\',sans-serif">' + esc(g.title) + '</div><div style="font-size:12px;color:var(--muted);margin-top:2px">Reported by ' + esc(g.by || r.unit) + '</div><p style="font-size:13px;color:var(--muted);margin:8px 0 0">' + esc(g.body) + "</p></div>" +
        assignBlock(r) + '<div style="display:flex;gap:6px;margin:10px 0">' + steps + "</div>" +
        (s < 2 ? '<div style="display:flex;gap:8px"><button class="btn" style="flex:1" onclick="maintAssignForm(\'' + escAttr(r.id) + '\')">' + (g.assignee ? "Reassign" : "Assign repair") + '</button><button class="btn primary" style="flex:1" onclick="advanceGr(\'' + escAttr(r.id) + '\')">' + (s === 0 ? "Start work" : "Mark resolved") + "</button></div>" : "") + "</div>";
    }).join("") + "</div>" : emptyCard("No grievances from residents yet.");
    return head + docsPart;
  };

  /* ==========================================================================
     RESIDENT
     ========================================================================== */
  function viewMaintRes() {
    var ts = tasks(), upcoming = ts.filter(function (r) { var n = daysTo(r.v.due); return n != null && n <= 30; });
    var rows = upcoming.map(function (r) {
      var t = r.v, st = taskState(t);
      return '<div style="display:flex;align-items:center;gap:12px;padding:12px 22px;border-top:1px solid var(--border2);flex-wrap:wrap"><div style="flex:1 1 220px;min-width:0"><b>' + esc(t.title) + '</b><div style="font-size:13px;color:var(--muted)">' + esc(t.equipName || "") + " · " + esc(t.every) + '</div></div><span style="color:var(--muted);font-size:14px">' + esc(fd(t.due)) + '</span><span class="chip ' + st[1] + '">' + st[0] + "</span></div>";
    }).join("");
    var done = ts.filter(function (r) { return r.v.lastDone; }).sort(function (a, b) { return String(b.v.lastDone).localeCompare(String(a.v.lastDone)); }).slice(0, 5);
    var mine = newest(list("grievance")).filter(function (r) { return r.unit === myUnit() && !(Number(r.v.stage) >= 2) && r.v.assignee; });
    return '<div class="card" style="padding:0;overflow:hidden"><div style="padding:16px 22px"><h2 style="font-size:19px;margin-bottom:2px">Coming up in the next 30 days</h2><p style="margin:0;font-size:13px;color:var(--muted)">Routine checks and servicing planned by the office. Some work may cause short interruptions.</p></div>' +
      (rows || '<div style="padding:22px;text-align:center;color:var(--muted);border-top:1px solid var(--border2)">Nothing is scheduled in the next 30 days.</div>') + "</div>" +
      '<div class="two-col-e" style="margin-top:16px"><div class="card"><h2 style="font-size:19px;margin-bottom:6px">Recently completed</h2>' + (done.map(function (r) {
        return '<div style="padding:10px 0;border-top:1px solid var(--border2)"><b>' + esc(r.v.title) + '</b><div style="font-size:13px;color:var(--muted)">' + esc(fd(r.v.lastDone)) + (r.v.assignee ? " · " + esc(r.v.assignee) : "") + "</div></div>";
      }).join("") || '<p class="empty">Nothing yet.</p>') + "</div>" +
      '<div class="card"><h2 style="font-size:19px;margin-bottom:6px">Your repair requests</h2>' + (mine.map(function (r) {
        return '<div style="padding:10px 0;border-top:1px solid var(--border2)"><b>' + esc(r.v.title) + '</b><div style="font-size:13px;color:var(--muted)">Assigned to ' + esc(r.v.assignee) + (r.v.target ? " · target " + esc(fd(r.v.target)) : "") + "</div></div>";
      }).join("") || '<p style="margin:0;font-size:14px;color:var(--muted)">No repair is assigned yet for your unit.</p>') +
      '<button class="btn" style="margin-top:12px" onclick="set({view:\'gr\'})">Report a problem</button></div></div>';
  }

  if (!IS_ADMIN) {
    window.viewGr = function () {
      var all = newest(list("grievance")).filter(function (r) { return r.unit === myUnit(); }), names = ["Open", "In progress", "Resolved"];
      return '<div class="two-col-e"><div class="card"><h2 style="font-size:19px;margin-bottom:4px">Submit a grievance</h2><p style="margin:0 0 12px;font-size:13px;color:var(--muted)">The association will follow up here once reviewed.</p>' +
        '<div style="display:flex;flex-direction:column;gap:10px"><label>Subject<input id="grTitle" type="text" placeholder="e.g. Leaking pipe in the hallway"></label><label>Details<textarea id="grBody" rows="3" placeholder="Describe the concern"></textarea></label><button class="btn primary" style="margin-top:4px" onclick="submitGr()">Submit grievance</button></div></div>' +
        '<div class="card"><h2 style="font-size:19px;margin-bottom:6px">My grievances</h2>' + (all.length === 0 ? '<div style="padding:16px;border:2px dashed #D8CCB1;border-radius:12px;text-align:center;font-size:14px;color:var(--muted)">No grievances submitted yet.</div>' :
          all.map(function (r) {
            var g = r.v, s = Math.min(2, Math.max(0, Number(g.stage) || 0));
            var info = g.assignee ? '<div style="margin-top:8px;font-size:13px;line-height:1.5">Assigned to <b>' + esc(g.assignee) + "</b>" + (g.target ? " · target " + esc(fd(g.target)) : "") +
              (g.equipName ? '<div style="color:var(--muted)">Related to: ' + esc(g.equipName) + "</div>" : "") + (g.notes ? '<div style="color:var(--muted)">Update from the office: ' + esc(g.notes) + "</div>" : "") + "</div>" : "";
            return '<div style="padding:12px 0;border-top:1px solid var(--border2)"><div style="font-weight:700;font-size:15px">' + esc(g.title) + '</div><div style="font-size:13px;color:var(--muted);margin:2px 0 6px">' + esc(g.body) + '</div><span class="chip ' + (s === 2 ? "good" : s === 1 ? "warn" : "info") + '">' + names[s] + "</span>" + info + "</div>";
          }).join("")) + "</div></div>";
    };
  }

  /* ==========================================================================
     Hooks into the real pages (nothing is edited in the real files)
     ========================================================================== */
  var origTitles = window.titles;
  window.titles = function () {
    if (state.view === "maint") {
      return IS_ADMIN ? ["Maintenance", "Preventive maintenance schedule, equipment, and the staff who do the work."]
        : ["Maintenance", "What the office is servicing, and the status of your repair requests."];
    }
    return origTitles();
  };
  var origView = window.view;
  window.view = function () { return state.view === "maint" ? (IS_ADMIN ? viewMaint() : viewMaintRes()) : origView(); };

  // Adds the Maintenance button to the side menu, right after Grievances.
  var origMount = window.mountApp;
  window.mountApp = function (app, html) {
    var tag = IS_ADMIN ? (dueCount() ? dueCount() + " due" : "") : "";
    var btn = navBtn("maint", "Maintenance", tag);
    html = html.replace(/<button[^>]*set\(\{view:'(?:req|gr)'[^>]*>[\s\S]*?<\/button>/, function (m) { return m + btn; });
    return origMount(app, html);
  };

  if (IS_ADMIN) {
    // A Maintenance card on the dashboard.
    var origHome = window.viewHome;
    window.viewHome = function () {
      var h = origHome(), ts = tasks();
      var overdue = ts.filter(function (r) { return daysTo(r.v.due) < 0; }).length, soon = dueCount() - overdue;
      var bad = equipList().filter(function (e) { return e.v.status !== "Working"; }).length;
      var card = summaryCard("yellow", "Maintenance", [[overdue, "Overdue tasks", "maint"], [soon, "Due this week", "maint"], [bad, "Equipment to fix", "maint"]], "cross");
      return h.replace('</div><div class="pills-row">', card + '</div><div class="pills-row">');
    };
  }
})();
