/* ResidentHub DEMO backend.
   Stands in for Supabase so the website dashboards can be previewed with made-up (sample) data.
   There is no database: everything lives in this browser (localStorage), is never sent anywhere,
   and can be reset from the DEMO panel. The sample dates are always built around today.
   Loaded INSTEAD of supabase-js and supabase-config.js. The real system does not use this file. */
(function () {
  var KEY = "__rhdemo_v1", SESS = "__rhdemo_session";
  window.RH_SUPABASE = { url: "demo", anonKey: "demo" };
  window.RH_DEMO = true;

  /* ---------------- who is signed in (per browser tab, so admin and resident can be open side by side) ---------------- */
  var memSess = null;
  function getSess() { try { return sessionStorage.getItem(SESS) || memSess; } catch (e) { return memSess; } }
  function setSess(v) { memSess = v; try { if (v) sessionStorage.setItem(SESS, v); else sessionStorage.removeItem(SESS); } catch (e) { } }

  /* ---------------- sample data ---------------- */
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function sd(d) { return MON[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }
  function dk(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dayOff(n) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; }
  function clk(min) { var h = Math.floor(min / 60) % 24, m = min % 60; return { t: (h % 12 || 12) + (m ? ":" + pad(m) : ""), ap: h >= 12 ? "PM" : "AM" }; }
  function slotLabel(open, mins, i) {
    var s = open + i * mins, x = clk(s), y = clk(s + mins);
    return x.ap === y.ap ? x.t + "–" + y.t + " " + x.ap : x.t + " " + x.ap + "–" + y.t + " " + y.ap;
  }

  function buildSeed() {
    var now = new Date(), YEAR = now.getFullYear(), recs = [], users = [], seq = 0;
    function R(kind, id, unit, value) { recs.push({ kind: kind, id: String(id), unit: unit, value: value }); }
    function tid() { return Date.now() - 1000000 + (++seq); }
    var PW = "Demo@1234", verified = new Date(Date.now() - 20 * 86400000).toISOString();

    /* units: [label, household, type, status, contact, account name, account email] */
    var U = [
      ["Unit 1A", "Santos Family", "Owner", "Occupied", "0917 000 1101", "Elena Santos", "elena.santos"],
      ["Unit 2B", "Dela Cruz Household", "Owner", "Occupied", "0917 000 1102", "Paolo Dela Cruz", "paolo.delacruz"],
      ["Unit 3B", "Reyes Household", "Owner", "Occupied", "0917 000 1103", "Maria Reyes", "resident"],
      ["Unit 5A", "Garcia Family", "Tenant", "Occupied", "0917 000 1104", "Carlo Garcia", "carlo.garcia"],
      ["Unit 5C", "Mendoza Household", "Owner", "Occupied", "0917 000 1105", "Liza Mendoza", "liza.mendoza"],
      ["Unit 7C", "Bautista Family", "Owner", "Occupied", "0917 000 1106", "Rico Bautista", "rico.bautista"],
      ["Unit 8A", "Aquino Household", "Tenant", "Occupied", "0917 000 1107", "Joy Aquino", "joy.aquino"],
      ["Unit 9B", "Lim Household", "Owner", "Occupied", "0917 000 1108", "Grace Lim", "grace.lim"],
      ["Unit 10A", "Tan Family", "Owner", "Occupied", "0917 000 1109", "", ""],
      ["Unit 11C", "Ramos Household", "Owner", "Vacant", "0917 000 1110", "", ""],
      ["Unit 12A", "Navarro Family", "Owner", "Occupied", "0917 000 1111", "", ""],
      ["Unit 12B", "Cruz Household", "Owner", "Vacant", "0917 000 1112", "", ""]
    ];
    users.push({ id: "demo-admin", email: "admin@demo.test", password: PW, profile: { id: "demo-admin", email: "admin@demo.test", name: "Demo Administrator", role: "admin", unit: null, phone: "0917 000 0000", suspended: false, must_change_password: false, contact_verified_at: verified } });
    var byUnit = {};
    U.forEach(function (u, i) {
      var v = { unit: u[0], name: u[1], type: u[2], status: u[3], contact: u[4], usage: u[2] === "Tenant" ? "tenant" : "owner" };
      byUnit[u[0]] = v;
      if (u[5]) {
        var id = "demo-u" + i, email = u[6].indexOf("@") < 0 ? u[6] + "@demo.test" : u[6];
        users.push({ id: id, email: email, password: PW, profile: { id: id, email: email, name: u[5], role: "resident", unit: u[0], phone: u[4], suspended: false, must_change_password: false, contact_verified_at: verified } });
      }
    });
    byUnit["Unit 5A"].usageStatus = "approved";
    byUnit["Unit 5A"].usageInfo = { tname: "Carlo Garcia", tphone: "0917 000 1104", occupants: "3", start: dk(dayOff(-200)), end: dk(dayOff(165)), emerg: "Ana Garcia, 0917 000 2204", plates: "ABC 1234", agree: true };
    byUnit["Unit 8A"].usage = "tenant"; byUnit["Unit 8A"].usageStatus = "pending";
    byUnit["Unit 8A"].usageInfo = { tname: "Joy Aquino", tphone: "0917 000 1107", occupants: "2", start: dk(dayOff(5)), end: dk(dayOff(370)), emerg: "Ben Aquino, 0917 000 2207", plates: "", agree: true };
    byUnit["Unit 9B"].usage = "shortterm"; byUnit["Unit 9B"].usageStatus = "approved";
    byUnit["Unit 9B"].usageInfo = { platform: "Airbnb", contact: "Grace Lim", phone: "0917 000 1108", maxGuests: "4", start: dk(dayOff(-120)), listing: "Cozy studio near the park", agree: true };
    byUnit["Unit 12A"].usage = "renovation"; byUnit["Unit 12A"].usageStatus = "pending";
    byUnit["Unit 12A"].usageInfo = { work: "New tiles in the kitchen and bathroom", contractor: "J. Villanueva Builders", phone: "0917 000 3312", start: dk(dayOff(8)), end: dk(dayOff(30)), agree: true };
    U.forEach(function (u) { R("unit", u[0], u[0], byUnit[u[0]]); });

    /* settings */
    R("setting", "dues_rate", "", { rate: 2500 });
    R("setting", "motor_rate", "", { rate: 1500 });
    R("setting", "motor_rate_daily", "", { rate: 100 });
    R("setting", "paymethods", "", { list: [
      { name: "Cash or check at the office", details: "Pay at the administration office, Monday to Saturday, 8 AM to 5 PM.", enabled: true },
      { name: "Bank transfer", details: "Account name: City Residences Condominium Corp. (sample)\nBank: Sample Bank\nAccount no.: 0000-0000-00", enabled: true },
      { name: "GCash", details: "Account name: City Residences (sample)\nNumber: 0917 000 0000", enabled: true },
      { name: "Maya", details: "Account name: (add name)\nNumber: (add Maya number)", enabled: false }
    ] });
    var AM = [
      { id: "pool", name: "Swimming Pool", open: "06:00", close: "20:00", mins: 120, note: "Free for residents. Guests pay ₱150 per visit, collected at the gate." },
      { id: "hall", name: "Function Hall", open: "08:00", close: "22:00", mins: 120, note: "Good for up to 60 guests. Clean the hall after use." },
      { id: "gym", name: "Gym", open: "06:00", close: "22:00", mins: 120, note: "Bring a towel and wipe the equipment after use." },
      { id: "game", name: "Game Room", open: "10:00", close: "22:00", mins: 120, note: "Billiards, table tennis and board games." }
    ];
    R("setting", "amenities", "", { list: AM });
    R("setting", "directory", "", {
      contacts: [
        { name: "Security desk", note: "Open 24 hours", tel: "Local 101" },
        { name: "Administration office", note: "Mon to Sat, 8 AM to 5 PM", tel: "Local 110" },
        { name: "Building engineer", note: "Repairs and maintenance", tel: "Local 120" },
        { name: "Emergency hotline", note: "Fire, medical, police", tel: "911" }
      ],
      rules: [
        ["Quiet hours", "Please keep noise down from 10 PM to 6 AM."],
        ["Garbage", "Bag your garbage and put it in the chute room on your floor. No bulky items."],
        ["Visitors", "Visitors must register at the lobby and leave a valid ID."],
        ["Pets", "Pets must be on a leash in the common areas."]
      ] });

    /* dues and payments: 2 months paid, this month open */
    var receipt = 0, houses = U.filter(function (u) { return u[3] === "Occupied"; });
    function dueDate(off) { return new Date(now.getFullYear(), now.getMonth() + off, 25, 12); }
    houses.forEach(function (u) {
      [-2, -1, 0].forEach(function (off) {
        var dd = dueDate(off), note = "Association dues - " + MONL[dd.getMonth()] + " " + dd.getFullYear();
        var idn = new Date(dd.getFullYear(), dd.getMonth(), 1, 9).getTime() + houses.indexOf(u);
        /* last two months are paid (except Unit 5A's, which is overdue); a few units have already paid this month */
        var paid = (off < 0 && !(u[0] === "Unit 5A" && off === -1)) || (off === 0 && ["Unit 1A", "Unit 2B", "Unit 5C", "Unit 9B", "Unit 10A"].indexOf(u[0]) >= 0);
        var due = { id: idn, unit: u[0], name: u[1], amount: 2500, note: note, dueDate: sd(dd) };
        if (paid) due.paid = true;
        R("due", idn, u[0], due);
        if (paid) {
          var pd = new Date(dd.getFullYear(), dd.getMonth(), 8 + (houses.indexOf(u) * 2) % 15, 12);
          if (pd > now) pd = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - houses.indexOf(u)), 12);
          var no = "OR-" + YEAR + "-" + String(++receipt).padStart(4, "0");
          var method = ["Cash or check at the office", "GCash", "Bank transfer"][(houses.indexOf(u) + off + 2) % 3];
          var ref = method === "Cash or check at the office" ? "—" : "REF" + (700000 + receipt * 37);
          R("payment", idn + 5, u[0], { id: idn + 5, receiptNo: no, unit: u[0], payer: u[1], forText: note, method: method, reference: ref, date: sd(pd), amount: 2500 });
          R("proof", idn + 7, u[0], { id: idn + 7, unit: u[0], payer: u[1], forText: note, method: method, reference: ref, amount: 2500, date: sd(pd), status: "Confirmed", receiptNo: no, confirmedOn: sd(pd) });
        }
      });
    });
    /* Maria (Unit 3B, the resident demo) also has a special charge, and Unit 12A has paid this month and is waiting for the office */
    var sid = tid();
    R("due", sid, "Unit 3B", { id: sid, unit: "Unit 3B", name: "Reyes Household", amount: 800, note: "Special assessment - elevator repair", dueDate: sd(dayOff(9)) });
    var cur12 = houses.filter(function (u) { return u[0] === "Unit 12A"; })[0], dd0 = dueDate(0), note0 = "Association dues - " + MONL[dd0.getMonth()] + " " + dd0.getFullYear();
    var pid = tid();
    R("proof", pid, "Unit 12A", { id: pid, unit: "Unit 12A", payer: cur12[1], forText: note0, method: "GCash", reference: "GC" + (YEAR * 1000000 + 101401), amount: 2500, date: sd(dayOff(-1)), status: "Pending" });

    /* expenses (admin only) */
    var EXP = [
      ["Security guards - monthly contract", "Security services", "Whole building", "SafeGuard Agency (sample)", 1, 38000, -3],
      ["Common-area electricity", "Common-area utilities", "Lobby and common areas", "Sample Power Co.", 1, 21450.5, -5],
      ["Water bill (common areas and pool)", "Common-area utilities", "Swimming pool", "Sample Water District", 1, 8920, -6],
      ["Janitorial supplies", "Janitorial and maintenance", "Whole building", "CleanPro Supplies", 12, 310, -9],
      ["Elevator B servicing", "Repairs and improvements", "Elevators", "LiftCare Services", 1, 15500, -14],
      ["Light bulbs for hallways", "Supplies and equipment", "Lobby and common areas", "Hardware Depot", 24, 85.5, -18],
      ["Pool chemicals", "Supplies and equipment", "Swimming pool", "AquaPure Trading", 6, 640, -25],
      ["Building insurance (quarterly)", "Insurance", "Whole building", "Sample Insurance", 1, 27500, -33],
      ["Security guards - monthly contract", "Security services", "Whole building", "SafeGuard Agency (sample)", 1, 38000, -33],
      ["Parking lot repainting", "Repairs and improvements", "Parking", "ColorWorks Painting", 1, 12400, -47],
      ["Reserve fund deposit", "Administration and reserve fund", "Whole building", "Bank deposit", 1, 20000, -62]
    ];
    EXP.forEach(function (e, i) {
      var id = tid();
      R("expense", id, "__admin", { id: id, item: e[0], category: e[1], area: e[2], payee: e[3], receiptNo: "R-" + (4100 + i * 7), qty: e[4], unitPrice: e[5], date: dk(dayOff(e[6])) });
    });

    /* announcements, events, polls */
    function ann(title, body, type, off, status) { var id = tid(); R("announcement", id, "", { id: id, title: title, body: body, date: sd(dayOff(off)), status: status || "Published", type: type }); }
    ann("Water interruption this Saturday", "The water supply will be shut off from 9 AM to 3 PM for the cleaning of the water tank. Please store enough water.", "Maintenance", -1);
    ann("Elevator B maintenance", "Elevator B will be out of service next Tuesday from 8 AM to 12 NN. Please use Elevator A.", "Maintenance", -3);
    ann("Reminder: dues are due on the 25th", "Association dues are due every 25th of the month. Pay online in the Dues page or at the office.", "General", -4);
    ann("Fire drill next week", "A building-wide fire drill will be held next Thursday at 2 PM. Please follow the guards' instructions.", "Warning", -6);
    ann("Halloween trick-or-treat in the lobby", "Kids are welcome to trick-or-treat on October 31 from 4 to 6 PM. Costumes encouraged!", "General", -8);
    ann("Year-end party planning", "Draft: we are collecting ideas for the year-end party. Details to follow.", "General", -1, "Draft");
    function evt(title, off, time, place, about) { var id = tid(); R("event", id, "", { id: id, title: title, date: sd(dayOff(off)) + " · " + time, place: place, about: about }); return id; }
    var e1 = evt("Community clean-up drive", 8, "7:00 AM", "Lobby", "Bring gloves and a reusable bag. Snacks provided.");
    var e2 = evt("Kids Halloween party", 15, "4:00 PM", "Function Hall", "Games, costumes and treats for the kids of the building.");
    var e3 = evt("Quarterly general assembly", 25, "6:00 PM", "Function Hall", "Updates on the budget and the lobby repainting.");
    [["Unit 1A", e1], ["Unit 3B", e2], ["Unit 5C", e1], ["Unit 7C", e2], ["Unit 9B", e2], ["Unit 3B", e1]].forEach(function (x) { R("rsvp", x[0] + "|" + x[1], x[0], { event: x[1] }); });
    var p1 = tid(), p2 = tid();
    R("poll", p1, "", { id: p1, question: "Should the lobby be repainted this year?", open: true, closes: sd(dayOff(6)), options: ["Yes, with a new color", "Yes, same color", "No, not needed"] });
    R("poll", p2, "", { id: p2, question: "Best day for the quarterly general assembly?", open: false, closes: sd(dayOff(-12)), options: ["Saturday morning", "Saturday evening", "Sunday afternoon"] });
    [["Unit 1A", 0], ["Unit 2B", 1], ["Unit 5A", 0], ["Unit 5C", 0], ["Unit 7C", 2], ["Unit 9B", 1]].forEach(function (x) { R("vote", x[0] + "|" + p1, x[0], { poll: p1, option: x[1] }); });
    [["Unit 1A", 1], ["Unit 2B", 1], ["Unit 3B", 0], ["Unit 5C", 1], ["Unit 7C", 2], ["Unit 8A", 1], ["Unit 9B", 0]].forEach(function (x) { R("vote", x[0] + "|" + p2, x[0], { poll: p2, option: x[1] }); });

    /* bookings (day index: today = 0) */
    var BK = [
      ["Unit 3B", 0, 2, 6, "Approved"], ["Unit 3B", 1, 0, 3, "Pending"], ["Unit 1A", 0, 0, 7, "Approved"], ["Unit 2B", 0, 1, 2, "Pending"],
      ["Unit 5C", 1, 4, 0, "Approved"], ["Unit 7C", 2, 1, 3, "Pending"], ["Unit 9B", 0, 3, 1, "Denied"], ["Unit 10A", 3, 2, 4, "Approved"],
      ["Unit 1A", 0, 0, -3, "Approved"], ["Unit 5A", 2, 1, -2, "Approved"], ["Unit 3B", 0, 4, -6, "Approved"], ["Unit 7C", 3, 3, 5, "Pending"],
      ["Unit 2B", 2, 5, 9, "Approved"], ["Unit 8A", 0, 3, 12, "Pending"]
    ];
    BK.forEach(function (b) {
      var a = AM[b[1]], d = dayOff(b[3]), id = tid();
      R("booking", id, b[0], { id: id, who: byUnit[b[0]].name, unit: b[0], place: a.name, when: sd(d) + ", " + slotLabel(toMin(a.open), a.mins, b[2]), status: b[4], day: dk(d), slot: b[2] });
    });
    function toMin(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(t); return Number(m[1]) * 60 + Number(m[2]); }

    /* grievances: stage 0 open, 1 in progress, 2 resolved */
    [["Unit 3B", "Leaking pipe in the 3rd floor hallway", "Water drips from the ceiling near the elevator.", 1], ["Unit 3B", "Broken hallway light", "The light outside Unit 3B keeps flickering.", 2],
     ["Unit 5C", "Noise from a late-night gathering", "Loud music past midnight on the weekend.", 0], ["Unit 7C", "Parking gate sensor not working", "The gate sometimes does not open for residents.", 1],
     ["Unit 9B", "Treadmill in the gym is broken", "The second treadmill stops after a few minutes.", 0]].forEach(function (g, i) {
      var id = tid() - i * 86400000;
      R("grievance", id, g[0], { id: id, title: g[1], body: g[2], by: g[0], stage: g[3] });
    });

    /* motor parking */
    for (var i = 1; i <= 12; i++) R("slot", "M-" + pad(i), "", { id: "M-" + pad(i) });
    function rent(id, unit, plan, off, days, amt) {
      var from = dayOff(off), until = dayOff(off + days - 1);
      R("slot", id, "", { id: id, unit: unit, plan: plan, from: dk(from), until: dk(until), amount: amt });
    }
    recs = recs.filter(function (r) { return !(r.kind === "slot" && ["M-02", "M-04", "M-08"].indexOf(r.id) >= 0); });
    rent("M-02", "Unit 1A", "month", -10, 30, 1500);
    rent("M-04", "Unit 9B", "day", -1, 4, 400);
    rent("M-08", "Unit 2B", "month", -20, 30, 1500);
    var rqAt = Date.now() - 3600000, rpid = tid();
    R("request", "Unit 7C", "Unit 7C", { unit: "Unit 7C", who: "Bautista Family", when: "1 hour ago", at: rqAt, slot: "M-05", plan: "month", days: 1, amount: 1500, confirmed: false });
    R("proof", rpid, "Unit 7C", { id: rpid, unit: "Unit 7C", payer: "Bautista Family", forText: "Motor parking rental", method: "GCash", reference: "GC" + (YEAR * 1000000 + 101403), amount: 1500, date: sd(now), status: "Pending", slot: "M-05" });

    /* documents (readable inside the page) */
    function doc(name, cat, aud, blocks, off) {
      var id = tid();
      R("doc", id, aud === "admin" ? "__admin" : "", { id: id, name: name, cat: cat, date: sd(dayOff(off)), audience: aud, ext: "", blocks: blocks });
    }
    doc("House Rules and Regulations", "Policy", "all", [
      { k: "h1", t: "House Rules and Regulations (sample)" }, { k: "h2", t: "1. Quiet hours" }, { k: "p", t: "Keep noise down from 10 PM to 6 AM." },
      { k: "h2", t: "2. Common areas" }, { k: "bullet", t: "Do not leave belongings in the hallways." }, { k: "bullet", t: "Clean the amenity after you use it." }], -60);
    doc("Financial statement (sample)", "Finance", "all", [
      { k: "h1", t: "Statement of collections and expenses (sample numbers)" },
      { k: "table", r: [["Item", "Amount"], ["Dues collected", "₱ 240,000"], ["Operating expenses", "₱ 168,000"], ["Reserve fund", "₱ 72,000"]] }], -20);
    doc("Move-in and move-out form", "Form", "all", [{ k: "h1", t: "Move-in / move-out form (sample)" }, { k: "p", t: "Fill this in and submit it to the office three days before moving." }], -90);
    doc("Minutes of the last general assembly", "Minutes", "all", [{ k: "h1", t: "Minutes (sample)" }, { k: "bullet", t: "The budget was approved." }, { k: "bullet", t: "The lobby repainting will be put to a vote." }], -45);
    doc("Board notes (admin only)", "Other", "admin", [{ k: "h1", t: "Board notes (sample)" }, { k: "p", t: "Only the administrator can see this document." }], -5);

    /* activity log (admin) */
    [["Payment recorded, Unit 1A", "Finance", 0.2], ["Booking approved, Unit 1A", "Facilities", 0.4], ["Announcement published: Water interruption this Saturday", "Announcements", 1.1],
     ["Expense added: Security guards - monthly contract", "Expenses", 2.2], ["Grievance in progress: Leaking pipe in the 3rd floor hallway", "Requests", 2.6], ["Unit usage declaration received, Unit 8A", "Units", 3],
     ["Event added: Community clean-up drive", "Events", 3.4], ["Poll created: Should the lobby be repainted this year?", "Polls", 4.1], ["Charge posted to every occupied unit: October dues", "Finance", 5.2],
     ["Parking rented: M-02 to Unit 1A", "Parking", 6.3], ["Amenity updated: Gym", "Facilities", 7.2], ["Account created for Unit 9B", "Access", 9.5]].forEach(function (a) {
      var at = Date.now() - Math.round(a[2] * 86400000);
      R("activity", at, "__admin", { title: a[0], area: a[1], at: at });
    });
    return { seedDay: dk(now), users: users, records: recs, seq: 0 };
  }

  /* ---------------- the in-memory "Supabase" ---------------- */
  function today() { return dk(new Date()); }
  function fresh() { var d = buildSeed(); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { } return d; }
  function load() {
    try { var x = JSON.parse(localStorage.getItem(KEY)); if (x && x.seedDay === today()) return x; } catch (e) { }
    return fresh();
  }
  var db = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }
  function reload() { db = load(); }
  var chans = [];
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) { reload(); chans.forEach(function (cb) { cb({}); }); }
  });
  function cur() { var s = getSess(); return s ? db.users.filter(function (u) { return u.id === s; })[0] : null; }
  function role() { var u = cur(); return u ? u.profile.role : null; }
  function myunit() { var u = cur(); return u ? u.profile.unit : null; }
  function err(message, code) { return { message: message, code: code }; }

  /* open as a ready-made role: demo/admin.html?as=admin or demo/resident.html?as=resident */
  (function () {
    var m = /[?&]as=(admin|resident)/.exec(location.search);
    if (!m) return;
    var u = db.users.filter(function (x) { return m[1] === "admin" ? x.profile.role === "admin" : x.email === "resident@demo.test"; })[0];
    if (u) setSess(u.id);
    try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) { }
  })();

  var PUBLIC = ["announcement", "event", "doc", "poll", "vendor", "slot", "setting", "booking", "rsvp", "vote"];
  function canRead(r) {
    if (role() === "admin") return true;
    if (r.unit === "__admin") return false;
    if (r.unit === "") return true;
    if (PUBLIC.indexOf(r.kind) >= 0) return true;
    return r.unit === myunit();
  }
  var RES_KINDS = ["booking", "grievance", "proof", "request", "statusUpdate", "rsvp", "vote", "unit", "activity"];
  function guard(op, row, old) {
    if (role() === "admin") return null;
    if (RES_KINDS.indexOf(row.kind) < 0) return "row-level security: kind " + row.kind;
    if (row.unit !== myunit() && row.kind !== "activity") return "row-level security: unit " + row.unit;
    if (row.kind === "activity" && row.unit !== "__admin") return "row-level security: activity";
    var nv = row.value, ov = old ? old.value : null;
    if (op === "update") {
      if (row.kind === "activity") return "Only the administrator can change that.";
      if (row.kind === "unit") {
        var keys = {}; Object.keys(ov || {}).concat(Object.keys(nv)).forEach(function (k) { keys[k] = 1; });
        for (var k in keys) if (JSON.stringify((ov || {})[k]) !== JSON.stringify(nv[k]) && ["usage", "usageStatus", "usageRemark", "usageInfo", "status", "statusNote", "statusDate"].indexOf(k) < 0) return "Only the administrator can change unit details. (" + k + ")";
        if (["", "pending"].indexOf(nv.usageStatus || "") < 0) return "Only the administrator can approve a usage reading.";
      }
    }
    if (op === "insert" && row.kind === "unit") return "row-level security: unit insert";
    if (row.kind === "proof" && ((nv.status || "Pending") !== "Pending" || nv.receiptNo || nv.direct)) return "Only the administrator can confirm a payment.";
    if (row.kind === "booking" && (nv.status || "Pending") !== "Pending") return "Only the administrator can decide a booking.";
    if (row.kind === "grievance" && String(nv.stage || 0) !== "0") return "Only the administrator can update a grievance.";
    if (row.kind === "request" && nv.confirmed) return "Only the administrator can confirm a parking request.";
    if (row.kind === "vote") { if (op === "update") return "Your unit has already voted in this poll."; if (row.id !== row.unit + "|" + nv.poll) return "Invalid vote."; }
    if (row.kind === "rsvp" && row.id !== row.unit + "|" + nv.event) return "Invalid RSVP.";
    return null;
  }

  function query(table) {
    var q = { table: table, op: "select", filters: [], order: null, range: null, patch: null, row: null, single: false };
    var api = {
      select: function () { return api; },
      eq: function (c, v) { q.filters.push([c, v]); return api; },
      order: function () { return api; },
      range: function (a, b) { q.range = [a, b]; return api; },
      insert: function (row) { q.op = "insert"; q.row = row; return api; },
      update: function (p) { q.op = "update"; q.patch = p; return api; },
      delete: function () { q.op = "delete"; return api; },
      maybeSingle: function () { q.single = true; return run(); },
      then: function (a, b) { return run().then(a, b); }
    };
    function match(r) { return q.filters.every(function (f) { return r[f[0]] === f[1]; }); }
    function run() {
      return new Promise(function (resolve) {
        setTimeout(function () {
          reload();
          if (table === "profiles") {
            var all = db.users.map(function (u) { return u.profile; });
            if (q.op === "select") {
              var rows = all.filter(match);
              if (role() !== "admin") rows = rows.filter(function (p) { return p.id === getSess(); });
              return resolve(q.single ? { data: rows[0] || null, error: null } : { data: rows, error: null });
            }
            if (q.op === "update") {
              var u = db.users.filter(function (x) { return match(x.profile); })[0];
              if (u) { Object.assign(u.profile, q.patch); save(); chans.forEach(function (cb) { cb({}); }); }
              return resolve({ data: null, error: null });
            }
          }
          if (table === "records") {
            if (q.op === "select") {
              var rs = db.records.filter(canRead).map(function (r) { return { kind: r.kind, id: r.id, unit: r.unit, value: r.value }; });
              return resolve({ data: rs, error: null });
            }
            if (q.op === "insert") {
              var row = JSON.parse(JSON.stringify(q.row));
              var msg = guard("insert", row, null);
              if (msg) return resolve({ data: null, error: err(msg) });
              if (db.records.some(function (r) { return r.kind === row.kind && r.id === row.id; })) return resolve({ data: null, error: err("duplicate", "23505") });
              if (row.kind === "booking" && ["Pending", "Approved"].indexOf(row.value.status) >= 0 &&
                db.records.some(function (r) { return r.kind === "booking" && r.value.place === row.value.place && r.value.day === row.value.day && r.value.slot === row.value.slot && ["Pending", "Approved"].indexOf(r.value.status) >= 0; }))
                return resolve({ data: null, error: err("duplicate key", "23505") });
              db.records.push(row); save(); chans.forEach(function (cb) { cb({}); });
              return resolve({ data: null, error: null });
            }
            if (q.op === "update") {
              var tgt = db.records.filter(function (r) { return match(r); })[0];
              if (!tgt) return resolve({ data: null, error: null });
              var nr = Object.assign({}, tgt, JSON.parse(JSON.stringify(q.patch)));
              if (role() !== "admin" && q.patch.unit !== undefined && q.patch.unit !== tgt.unit) return resolve({ data: null, error: err("Only the administrator can change that.") });
              if (role() !== "admin" && !canRead(tgt)) return resolve({ data: null, error: null });
              var m2 = guard("update", nr, tgt);
              if (m2) return resolve({ data: null, error: err(m2) });
              Object.assign(tgt, nr); save(); chans.forEach(function (cb) { cb({}); });
              return resolve({ data: null, error: null });
            }
            if (q.op === "delete") {
              var del = db.records.filter(match);
              if (role() !== "admin") {
                var bad = del.filter(function (r) { return ["request", "booking", "rsvp"].indexOf(r.kind) < 0 || r.unit !== myunit(); });
                if (bad.length) return resolve({ data: null, error: null });  // RLS silently hides
              }
              db.records = db.records.filter(function (r) { return del.indexOf(r) < 0; });
              save(); chans.forEach(function (cb) { cb({}); });
              return resolve({ data: null, error: null });
            }
          }
          resolve({ data: null, error: err("unsupported " + table + "." + q.op) });
        }, 5);
      });
    }
    return api;
  }

  var listeners = [];
  window.supabase = {
    createClient: function () {
      return {
        from: query,
        auth: {
          getSession: function () { reload(); var u = cur(); return Promise.resolve({ data: { session: u ? { user: { id: u.id, email: u.email } } : null } }); },
          signInWithPassword: function (c) {
            reload();
            var u = db.users.filter(function (x) { return x.email.toLowerCase() === String(c.email).toLowerCase() && x.password === c.password; })[0];
            if (!u) return Promise.resolve({ error: { message: "Invalid login credentials" }, data: {} });
            setSess(u.id);
            return Promise.resolve({ error: null, data: { session: { user: { id: u.id, email: u.email } } } });
          },
          signOut: function () { setSess(null); listeners.forEach(function (f) { f("SIGNED_OUT"); }); return Promise.resolve({}); },
          updateUser: function (p) { var u = cur(); if (u && p.password) { u.password = p.password; save(); } return Promise.resolve({ error: null, data: {} }); },
          onAuthStateChange: function (f) { listeners.push(f); }
        },
        functions: {
          invoke: function (name, o) {
            reload();
            var b = o.body, ok = function (d) { return Promise.resolve({ data: d, error: null }); }, bad = function (m) { return Promise.resolve({ data: { error: m }, error: null }); };
            if (name === "manage-users") {
              if (role() !== "admin") return bad("Only the administrator can do that.");
              if (b.action === "create") {
                if (db.users.some(function (u) { return u.email === b.email; })) return bad("An account with that email already exists.");
                var id = "u" + (++db.seq);
                db.users.push({ id: id, email: b.email, password: "Temp#Pass1x", profile: { id: id, email: b.email, name: b.name, role: "resident", unit: b.unit, phone: b.phone, suspended: false, must_change_password: true, contact_verified_at: null } });
                save(); return ok({ email: b.email, password: "Temp#Pass1x" });
              }
              var t = db.users.filter(function (u) { return u.id === b.userId; })[0];
              if (!t) return bad("Not found");
              if (b.action === "reset-password") { t.password = "Temp#Pass2x"; t.profile.must_change_password = true; save(); return ok({ password: "Temp#Pass2x" }); }
              if (b.action === "set-suspended") { t.profile.suspended = !!b.suspended; save(); return ok({}); }
              if (b.action === "delete") { db.users = db.users.filter(function (u) { return u !== t; }); save(); return ok({}); }
            }
            if (name === "verify-contact") {
              var me = cur();
              if (b.action === "options") return ok({ email: "ma***@test.com", phone: "+6391*****112", emailReady: !window.__noEmail, smsReady: !window.__noSms });
              if (b.action === "send") { window.__sent = (window.__sent || []).concat(b.channel); return ok({ channel: b.channel, email: "ma***@test.com", phone: "+6391*****112", cooldown: 60 }); }
              if (b.action === "check") { if (b.code === "111111") { me.profile.contact_verified_at = new Date().toISOString(); save(); return ok({ verified: true }); } return bad("That code is not correct."); }
            }
            if (name === "reset-password") {
              if (b.action === "options") return ok({ emailReady: true, smsReady: false });
              if (b.action === "request") { window.__rp = b; return ok({ ok: true }); }
              if (b.action === "confirm") { window.__rp2 = b; return b.code === "111111" ? ok({ ok: true }) : bad("The codes are not correct or have expired."); }
            }
            return bad("unknown function");
          }
        },
        channel: function () { var o = { on: function (t, f, cb) { chans.push(cb); return o; }, subscribe: function () { return o; } }; return o; },
        removeChannel: function () { }
      };
    }
  };


  /* ---------------- the DEMO panel (bottom-left) ---------------- */
  window.rhDemoReset = function () {
    try { localStorage.removeItem(KEY); } catch (e) { }
    location.reload();
  };
  function addPanel() {
    var admin = (window.RH_ROLE || "") === "admin";
    var st = document.createElement("style");
    st.textContent =
      "#rhDemo{position:fixed;left:14px;bottom:14px;z-index:99999;font:600 13px/1.4 'Source Sans 3',system-ui,sans-serif;color:#1c2a4a}" +
      "#rhDemo .pill{display:flex;align-items:center;gap:8px;padding:9px 14px;border:0;border-radius:999px;background:#F5B544;color:#3a2a00;font:800 12px/1 'Source Sans 3',system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.25)}" +
      "#rhDemo .box{display:none;width:min(320px,calc(100vw - 28px));margin-bottom:10px;padding:16px;border-radius:16px;background:#fff;border:1px solid #e3e6ef;box-shadow:0 14px 38px rgba(20,30,60,.28)}" +
      "#rhDemo.open .box{display:block}#rhDemo .box p{margin:0 0 10px;font-weight:500;color:#4a5570}#rhDemo .box b{color:#1c2a4a}" +
      "#rhDemo .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}" +
      "#rhDemo .row a,#rhDemo .row button{flex:1 1 auto;padding:9px 12px;border-radius:10px;border:1px solid #cfd5e6;background:#f5f7fc;color:#1c2a4a;font:700 12.5px 'Source Sans 3',system-ui,sans-serif;text-align:center;text-decoration:none;cursor:pointer}" +
      "#rhDemo .row .go{background:#3B6FD8;border-color:#3B6FD8;color:#fff}" +
      "@media(max-width:900px){#rhDemo{bottom:78px}}";
    document.head.appendChild(st);
    var d = document.createElement("div"); d.id = "rhDemo";
    d.innerHTML =
      '<div class="box"><p><b>Demo mode.</b> Everything here is made-up sample data. There is no database; what you change stays in this browser only.</p>' +
      '<p>Demo logins (password <b>Demo@1234</b>):<br>Admin: <b>admin@demo.test</b><br>Resident: <b>resident@demo.test</b> (Unit 3B)</p>' +
      '<div class="row"><a class="go" href="' + (admin ? "resident.html?as=resident" : "admin.html?as=admin") + '">Open as ' + (admin ? "Resident" : "Admin") + '</a><button onclick="rhDemoReset()">Reset sample data</button><a href="index.html">Demo home</a></div></div>' +
      '<button class="pill" onclick="document.getElementById(\'rhDemo\').classList.toggle(\'open\')">DEMO · SAMPLE DATA</button>';
    document.body.appendChild(d);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addPanel); else addPanel();
})();
