/* DEMO ONLY: "Export all data" for the administrator.
   Builds ONE Excel workbook (.xlsx) with an overview sheet and one sheet for every part of the system
   (units, accounts, dues, payments, expenses, bookings, parking, grievances and repairs, announcements, events,
   polls, maintenance, equipment, staff, activity log), then lets the administrator save it.
   No library is needed: an .xlsx file is a zip of small XML files, written here by hand (zip "store" method).
   Loaded by demo/admin.html after maintenance.js. It reads the data that is already loaded in the page (DB.rows). */
(function () {
  if (!window.RH_DEMO) return;
  var XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  /* ---------- tiny zip writer (no compression) ---------- */
  function crc32(bytes) {
    var t = crc32.t;
    if (!t) {
      t = crc32.t = [];
      for (var n = 0; n < 256; n++) { var c0 = n; for (var k = 0; k < 8; k++) c0 = (c0 & 1) ? (0xEDB88320 ^ (c0 >>> 1)) : (c0 >>> 1); t[n] = c0 >>> 0; }
    }
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0, cdSize = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data), size = data.length;
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, size, true);
      lh.setUint32(22, size, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true);
      ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      cdSize += 46 + name.length;
      offset += 30 + name.length + size;
    });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(4, 0, true); end.setUint16(6, 0, true); end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: XLSX_TYPE });
  }

  /* ---------- xlsx pieces ---------- */
  function x(s) { return String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function colName(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  // cell styles (see styles.xml below): 0 normal, 1 header, 2 money, 3 date, 4 title, 5 bold, 6 whole number
  var S = { normal: 0, head: 1, money: 2, date: 3, title: 4, bold: 5, int: 6 };
  function serial(d) { return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000); }
  function toDate(v) {
    if (v instanceof Date) return isNaN(v) ? null : v;
    var s = String(v == null ? "" : v).trim(), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return s ? parseShort(s) : null;
  }
  function cell(ref, v, colType) {
    if (v == null || v === "") return "";
    var style = null, val = v;
    if (typeof v === "object" && !(v instanceof Date)) { style = v.s; val = v.v; }
    if (val == null || val === "") return "";
    var ct = colType || "text";
    if (style == null) style = ct === "money" ? S.money : ct === "date" ? S.date : ct === "int" ? S.int : S.normal;
    if (style === S.date || (ct === "date" && style == null)) {
      var d = toDate(val);
      return d ? '<c r="' + ref + '" s="' + S.date + '"><v>' + serial(d) + "</v></c>" : '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + x(val) + "</t></is></c>";
    }
    if (typeof val === "number" && isFinite(val)) return '<c r="' + ref + '" s="' + style + '"><v>' + val + "</v></c>";
    if (typeof val === "boolean") val = val ? "Yes" : "No";
    return '<c r="' + ref + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' + x(val) + "</t></is></c>";
  }
  function sheetXml(sh) {
    var cols = sh.cols, rows = sh.rows, widths = [];
    cols.forEach(function (c, i) { widths[i] = Math.min(60, Math.max(10, String(c[0]).length + 2)); });
    if (sh.widths) widths = sh.widths;
    else rows.forEach(function (r) {
      r.forEach(function (v, i) {
        var t = v && typeof v === "object" && !(v instanceof Date) ? v.v : v;
        if (t == null) return;
        widths[i] = Math.max(widths[i] || 10, t instanceof Date ? 14 : typeof t === "number" ? 14 : Math.min(60, String(t).split("\n")[0].length + 2));
      });
    });
    var out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
    if (!sh.noHeader) out += '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
    out += "<cols>" + widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join("") + "</cols><sheetData>";
    var r0 = 1;
    if (!sh.noHeader) {
      out += '<row r="1">' + cols.map(function (c, i) { return '<c r="' + colName(i) + '1" s="' + S.head + '" t="inlineStr"><is><t>' + x(c[0]) + "</t></is></c>"; }).join("") + "</row>";
      r0 = 2;
    }
    rows.forEach(function (r, ri) {
      var n = r0 + ri;
      out += '<row r="' + n + '">' + r.map(function (v, i) { return cell(colName(i) + n, v, (cols[i] || [])[1]); }).join("") + "</row>";
    });
    out += "</sheetData>";
    if (!sh.noHeader && rows.length) out += '<autoFilter ref="A1:' + colName(cols.length - 1) + (rows.length + 1) + '"/>';
    return out + "</worksheet>";
  }
  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="mmm\\ d\\,\\ yyyy"/><numFmt numFmtId="165" formatCode="&quot;₱&quot;#,##0.00"/></numFmts>' +
    '<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF5B4FB3"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  function safeName(n, used) {
    var s = String(n).replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31).trim() || "Sheet", base = s, k = 2;
    while (used[s.toLowerCase()]) s = base.slice(0, 28) + " " + (k++);
    used[s.toLowerCase()] = 1;
    return s;
  }
  function makeXlsx(sheets) {
    var used = {}, names = sheets.map(function (s) { return safeName(s.name, used); });
    var files = [
      { name: "[Content_Types].xml", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") + "</Types>" },
      { name: "_rels/.rels", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        names.map(function (n, i) { return '<sheet name="' + x(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + "</sheets></workbook>" },
      { name: "xl/_rels/workbook.xml.rels", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") +
        '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: "xl/styles.xml", text: STYLES }
    ];
    sheets.forEach(function (s, i) { files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", text: sheetXml(s) }); });
    return zip(files);
  }

  /* ---------- the data ---------- */
  function days(k) { var d = toDate(k); return d ? Math.round((d - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000) : null; }
  function created(id) { var n = Number(id); return n > 1e12 ? new Date(n) : ""; }
  function stageName(s) { return ["Open", "In progress", "Resolved"][Math.min(2, Math.max(0, Number(s) || 0))]; }
  function sorted(rows, fn) { return rows.slice().sort(fn); }
  function money(n) { return Number(n) || 0; }
  function eqName(id) { var e = id ? getRow("equipment", id) : null; return e ? e.value.name : ""; }

  function buildSheets() {
    var sheets = [], count = {};
    function add(name, cols, rows, info) { sheets.push({ name: name, cols: cols, rows: rows }); count[name] = { n: rows.length, info: info }; }

    add("Units", [["Unit"], ["Household"], ["Type"], ["Occupancy"], ["Contact"], ["Usage"], ["Usage status"]],
      sortedUnits().map(function (r) { var u = r.v; return [r.id, u.name, u.type, u.status, u.contact, typeof usageLabel === "function" ? usageLabel(u.usage || "") : u.usage, u.usageStatus || ""]; }),
      "Every unit, occupancy and how it is used");

    add("Accounts", [["Name"], ["Email"], ["Mobile"], ["Role"], ["Unit"], ["Suspended"]],
      (DB.accounts || []).map(function (a) { return [a.name, a.email, a.phone, a.role, a.unit || "", a.suspended ? "Yes" : "No"]; }),
      "Sign-in accounts of residents and administrators");

    var dues = sorted(list("due"), function (a, b) { return String(a.v.unit).localeCompare(String(b.v.unit), undefined, { numeric: true }) || (Number(b.id) - Number(a.id)); });
    add("Dues", [["Unit"], ["Household"], ["Charge"], ["Amount", "money"], ["Due date", "date"], ["Status"]],
      dues.map(function (r) { var d = r.v; return [d.unit, d.name, d.note, money(d.amount), d.dueDate, d.paid ? "Paid" : (isOverdue(d) ? "Overdue" : "Unpaid")]; }),
      "Monthly dues and other charges, paid or unpaid");

    add("Payments", [["Receipt no."], ["Date", "date"], ["Unit"], ["Paid by"], ["For"], ["Method"], ["Reference"], ["Amount", "money"]],
      newest(list("payment")).map(function (r) { var p = r.v; return [p.receiptNo, p.date, p.unit, p.payer, p.forText, p.method, p.reference, money(p.amount)]; }),
      "Confirmed payments with official receipt numbers");

    add("Payment proofs", [["Date", "date"], ["Unit"], ["Paid by"], ["For"], ["Method"], ["Reference"], ["Amount", "money"], ["Status"]],
      newest(list("proof")).map(function (r) { var p = r.v; return [p.date, p.unit, p.payer, p.forText, p.method, p.reference, money(p.amount), p.status]; }),
      "Payment details sent by residents, waiting for or past confirmation");

    var exp = sorted(list("expense"), function (a, b) { return String(b.v.date).localeCompare(String(a.v.date)); });
    add("Expenses", [["Date", "date"], ["Item"], ["Category"], ["For"], ["Supplier"], ["OR no."], ["Quantity", "int"], ["Price of one", "money"], ["Total", "money"], ["Equipment"], ["Note"]],
      exp.map(function (r) { var e = r.v; return [e.date, e.item, e.category, e.area, e.payee, e.receiptNo, Number(e.qty || 1), money(e.unitPrice), expTotal(e), eqName(e.equipId), e.note]; }),
      "Every purchase and repair cost of the corporation");

    add("Facility bookings", [["Facility"], ["Date", "date"], ["Time"], ["Unit"], ["Household"], ["Status"]],
      sorted(list("booking"), function (a, b) { return String(b.v.day).localeCompare(String(a.v.day)); }).map(function (r) { var b = r.v; return [b.place, b.day, String(b.when || "").split(", ").slice(-1)[0], b.unit, b.who, b.status]; }),
      "Reservations of pool, hall, gym and game room");

    add("Parking slots", [["Slot"], ["Unit"], ["Plan"], ["From", "date"], ["Until", "date"], ["Amount", "money"]],
      sorted(list("slot"), function (a, b) { return naturalCompare(a.id, b.id); }).map(function (r) { var s = r.v; return [r.id, s.unit || "Free", s.plan === "month" ? "Monthly" : s.plan === "day" ? "Daily" : "", s.from, s.until, s.unit ? money(s.amount) : ""]; }),
      "Motor parking slots and who rents them");

    add("Parking requests", [["Unit"], ["Household"], ["Slot"], ["Plan"], ["Days", "int"], ["Amount", "money"], ["Confirmed"]],
      list("request").map(function (r) { var q = r.v; return [q.unit, q.who, q.slot, q.plan === "month" ? "Monthly" : "Daily", Number(q.days || 1), money(q.amount), q.confirmed ? "Yes" : "Waiting"]; }),
      "Parking requests waiting for the office");

    add("Grievances and repairs", [["Reported", "date"], ["Unit"], ["Subject"], ["Details"], ["Status"], ["Priority"], ["Assigned to"], ["Target date", "date"], ["Equipment"], ["Note"], ["Resolved on", "date"], ["Cost", "money"], ["What was done"]],
      newest(list("grievance")).map(function (r) { var g = r.v; return [created(r.id), g.by || r.unit, g.title, g.body, stageName(g.stage), g.priority || "", g.assignee || "", g.target, g.equipName || "", g.notes || "", g.resolvedOn, g.cost ? money(g.cost) : "", g.completion || ""]; }),
      "Resident concerns with repair assignment, cost and result");

    add("Announcements", [["Date", "date"], ["Type"], ["Title"], ["Status"], ["Message"]],
      newest(list("announcement")).map(function (r) { var a = r.v; return [a.date, a.type || "General", a.title, a.status || "Published", a.body]; }),
      "Notices posted to residents");

    var rsvps = list("rsvp");
    add("Events", [["Date and time"], ["Event"], ["Place"], ["Residents going", "int"], ["About"]],
      newest(list("event")).map(function (r) { var e = r.v; return [e.date, e.title, e.place, rsvps.filter(function (q) { return String(q.v.event) === String(r.id); }).length, e.about]; }),
      "Community events and how many units will join");

    var pr = [];
    pollsAll().forEach(function (p) { var tot = p.options.reduce(function (s, o) { return s + o.votes; }, 0); p.options.forEach(function (o) { pr.push([p.q, p.open ? "Open" : "Closed", p.closes, o.t, o.votes, (tot ? Math.round(o.votes / tot * 100) : 0) + "%"]); }); });
    add("Polls", [["Question"], ["Status"], ["Closes"], ["Option"], ["Votes", "int"], ["Share of votes"]], pr, "Poll results, one row per option");

    if (list("mtask").length || list("equipment").length || list("staff").length) {
      add("Maintenance schedule", [["Task"], ["Type"], ["Equipment"], ["Repeats"], ["Next due", "date"], ["Status"], ["Assigned to"], ["Last done", "date"]],
        sorted(list("mtask"), function (a, b) { return String(a.v.due).localeCompare(String(b.v.due)); }).map(function (r) {
          var t = r.v, n = days(t.due), st = n == null ? "" : n < 0 ? "Overdue by " + (-n) + " day(s)" : n === 0 ? "Due today" : n <= 7 ? "Due in " + n + " day(s)" : "Scheduled";
          return [t.title, t.kind === "Compliance" ? "Permit, certificate or test" : "Routine", t.equipName, t.every, t.due, st, t.assignee || "", t.lastDone];
        }), "Preventive maintenance and permit renewals");
      var spent = {};
      list("expense").forEach(function (r) { if (r.v.equipId) spent[r.v.equipId] = (spent[r.v.equipId] || 0) + expTotal(r.v); });
      add("Equipment", [["Equipment"], ["Category"], ["Location"], ["Condition"], ["Facility"], ["Closes facility"], ["Supplier"], ["Warranty ends", "date"], ["Last service", "date"], ["Spent", "money"]],
        sorted(list("equipment"), function (a, b) { return String(a.v.name).localeCompare(String(b.v.name)); }).map(function (r) { var e = r.v; return [e.name, e.category, e.location, e.status, e.facility || "", e.facility ? (e.closes ? "Yes" : "No") : "", e.vendor || "", e.warranty, e.lastService, spent[r.id] || ""]; }),
        "Equipment list with condition, warranty and money spent");
      add("Maintenance staff", [["Name"], ["Role"], ["Phone"], ["Open repairs", "int"], ["Scheduled tasks", "int"]],
        sorted(list("staff"), function (a, b) { return String(a.v.name).localeCompare(String(b.v.name)); }).map(function (r) {
          return [r.v.name, r.v.role, r.v.phone, list("grievance").filter(function (g) { return g.v.staffId === r.id && !(Number(g.v.stage) >= 2); }).length, list("mtask").filter(function (t) { return t.v.staffId === r.id; }).length];
        }), "Maintenance staff and their workload");
    }

    add("Activity log", [["Date and time"], ["Area"], ["What happened"]],
      newest(list("activity")).map(function (r) { var a = r.v; return [new Date(Number(a.at || r.id)).toLocaleString("en-US"), a.area, a.title]; }),
      "What the administrators did, newest first");

    /* the overview sheet goes first */
    var now = new Date(), c = counts();
    var unpaid = dues.filter(function (r) { return !r.v.paid; }), year = String(now.getFullYear());
    var rows = [
      [{ v: "ResidentHub: all administrator data", s: S.title }],
      ["City Residences Condominium Corporation"],
      ["Exported on " + now.toLocaleString("en-US") + " by " + adminName()],
      [""],
      [{ v: "Key figures", s: S.bold }, { v: "Value", s: S.bold }],
      ["Units", list("unit").length],
      ["Resident accounts", residentCount()],
      ["Unpaid charges", unpaid.length],
      ["Unpaid amount", { v: unpaid.reduce(function (s, r) { return s + money(r.v.amount); }, 0), s: S.money }],
      ["Collected this month", { v: monthEarnings(), s: S.money }],
      ["Expenses this year", { v: list("expense").filter(function (r) { return String(r.v.date || "").slice(0, 4) === year; }).reduce(function (s, r) { return s + expTotal(r.v); }, 0), s: S.money }],
      ["Booking requests waiting", c.bookings],
      ["Open grievances", c.grievances],
      ["Parking requests waiting", c.parking],
      ["Rentals to review", c.rentals]
    ];
    if (list("mtask").length) {
      var od = list("mtask").filter(function (r) { var n = days(r.v.due); return n != null && n < 0; }).length;
      rows.push(["Overdue maintenance tasks", od], ["Equipment needing attention", list("equipment").filter(function (r) { return r.v.status !== "Working"; }).length]);
    }
    rows.push([""], [{ v: "Sheet", s: S.bold }, { v: "Records", s: S.bold }, { v: "What it contains", s: S.bold }]);
    sheets.forEach(function (s) { rows.push([s.name, count[s.name].n, count[s.name].info]); });
    sheets.unshift({ name: "Overview", cols: [[""], [""], [""]], rows: rows, noHeader: true, widths: [34, 22, 64] });
    return sheets;
  }

  /* ---------- save ---------- */
  async function saveBlob(blob, name) {
    if (window.showSaveFilePicker) {
      try {
        var h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: "Excel workbook", accept: { [XLSX_TYPE]: [".xlsx"] } }] });
        var w = await h.createWritable(); await w.write(blob); await w.close();
        return "picked";
      } catch (e) { if (e && e.name === "AbortError") return "cancel"; }
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    return "download";
  }
  window.exportAllData = async function () {
    try {
      var sheets = buildSheets(), name = "ResidentHub-all-data-" + dayKey(new Date()) + ".xlsx";
      var blob = makeXlsx(sheets);
      var how = await saveBlob(blob, name);
      if (how === "cancel") return;
      logAct("All data exported to Excel (" + (sheets.length - 1) + " sheets)", "Reports");
      toast(how === "picked" ? "Saved " + name + "." : "Downloaded " + name + ". Find it in your Downloads folder.");
    } catch (e) { toast("Could not create the Excel file: " + (e && e.message || e)); }
  };
  window.__buildExportSheets = buildSheets; // used by the automatic test

  /* ---------- buttons on the page (the real files are not edited) ---------- */
  var origReports = window.viewReports;
  if (origReports) {
    window.viewReports = function () {
      return '<div class="card" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px"><div style="flex:1 1 260px"><b style="font-size:16px">Export all data to Excel</b>' +
        '<p class="hint" style="margin:4px 0 0">One .xlsx file with an overview and a sheet for every part of the system: units, accounts, dues, payments, expenses, bookings, parking, grievances and repairs, announcements, events, polls, maintenance, equipment, staff and the activity log. You choose where to save it.</p></div>' +
        '<button class="btn primary" onclick="exportAllData()">Download all data (.xlsx)</button></div>' + origReports();
    };
  }
  var origHome2 = window.viewHome;
  window.viewHome = function () {
    return origHome2().replace('<div class="pills-row">', '<div class="pills-row"><button onclick="exportAllData()">Export all data (Excel)</button>');
  };
})();
