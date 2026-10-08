/* New Hampshire Water Infrastructure Funding - concept mockup, Version 5 (IEc, RFP DES 2026-23).
   One script, no libraries. Data: window.NH_GEO (tools/build_geo.py) and
   window.NH_DATA[id] (tools/ingest_nhdes.py, from an NHDES-format workbook). */
(function () {
  "use strict";

  var GEO = window.NH_GEO;
  var TOWN_BY = {}; GEO.towns.forEach(function (t) { TOWN_BY[t.n] = t; });
  // State House districts (2022 plan): ids are a county code and number, e.g. "RO21" is Rockingham 21.
  // Floterial districts overlay several base districts, so a town has one base district and may have a floterial.
  var HOUSE_COUNTY = { BE: "Belknap", CA: "Carroll", CH: "Cheshire", CO: "Coos", GR: "Grafton", HI: "Hillsborough",
    ME: "Merrimack", RO: "Rockingham", ST: "Strafford", SU: "Sullivan" };
  var HOUSE_FLOT = new Set(GEO.hf || []);
  function hdName(id) { var m = /^([A-Z]+)(\d+)$/.exec(id); return m ? HOUSE_COUNTY[m[1]] + " " + m[2] : id; }
  function hdText(t) {
    var base = t.hd.filter(function (h) { return !HOUSE_FLOT.has(h); }), fl = t.hd.filter(function (h) { return HOUSE_FLOT.has(h); });
    return (base.length > 1 ? base.length + " House Districts (split by ward)" : "House District " + hdName(base[0])) +
      (fl.length ? ", " + fl.map(hdName).join(", ") + " (floterial)" : "");
  }
  // Is district id (a string from the filter) in a town's or project's list? Council and Senate ids are numbers.
  function inDist(list, id) { return (list || []).some(function (x) { return String(x) === id; }); }
  function distLabel(v) {
    var k = v.split(":");
    return k[0] === "ec" ? "Council District " + k[1] : k[0] === "sd" ? "Senate District " + k[1] : "House District " + hdName(k[1]);
  }
  var DATA = window.NH_DATA || {};
  var SRC = ["ARPA", "PFAS", "DWSRF", "CWSRF", "DWGWT"];
  // What each acronym stands for, as the hero chart spells it out: [beside the acronym, phone line]
  var SRC_DEF = {
    ARPA: ["American Rescue Plan Act", "American Rescue Plan Act"],
    PFAS: ["PFAS Remediation Loan Fund", "PFAS Remediation Loan Fund"],
    DWSRF: ["Drinking Water State Revolving Fund", "Drinking Water State Revolving Fund"],
    CWSRF: ["Clean Water State Revolving Fund", "Clean Water State Revolving Fund"],
    DWGWT: ["Drinking Water & Groundwater Trust Fund", "Drinking Water & Groundwater Trust Fund"]
  };
  var WATER = ["Drinking Water", "Wastewater", "Stormwater"];
  var WATER_KEY = { "Drinking Water": "dw", "Wastewater": "ww", "Stormwater": "sw" };
  var WATER_GROUPS = ["Drinking Water", "Wastewater", "Stormwater", "Drinking Water & Wastewater"];
  var WATER_SHORT = { "Drinking Water": "Drinking water", "Wastewater": "Wastewater",
                      "Stormwater": "Stormwater", "Drinking Water & Wastewater": "Drinking & wastewater" };
  var GLYPH = { "Drinking Water": "s-dw", "Wastewater": "s-ww", "Stormwater": "s-sw",
                "Drinking Water & Wastewater": "s-dwww" };
  // Outline icon per water group (filter, list, flow diagram) ...
  var WICON = { "Drinking Water": "i-dw", "Wastewater": "i-ww", "Stormwater": "i-sw",
                "Drinking Water & Wastewater": "i-dwww" };
  // ... and the same shapes filled, as [path, transform] parts: these match the s-* sprite
  // symbols and are the gauges' clip paths. GLYPH_Y is each shape's top and bottom.
  var GLYPH_SHAPES = {
    "Drinking Water": [["M12 1.5s7.5 7.8 7.5 13.2a7.5 7.5 0 0 1-15 0C4.5 9.3 12 1.5 12 1.5z", ""]],
    "Wastewater": [["M3 6.5h9a6.5 6.5 0 0 1 6.5 6.5v8h-5v-7a2.5 2.5 0 0 0-2.5-2.5H3zM1.9 4.5h2.2v9.5H1.9zM11.5 20h9v2h-9z", ""]],
    "Stormwater": [["M7 14.5a3.8 3.8 0 0 1-.4-7.6A5.4 5.4 0 0 1 17 7.2a3.7 3.7 0 0 1 .3 7.3zM7.6 16.6h1.8l-1.3 3.6H6.3zM11.6 16.6h1.8l-1.3 3.6h-1.8zM15.6 16.6h1.8l-1.3 3.6h-1.8z", ""]],
    "Drinking Water & Wastewater": [["M3 6.5h9a6.5 6.5 0 0 1 6.5 6.5v8h-5v-7a2.5 2.5 0 0 0-2.5-2.5H3zM1.9 4.5h2.2v9.5H1.9zM11.5 20h9v2h-9z", "translate(-1.2 4.6) scale(.78)"], ["M12 1.5s7.5 7.8 7.5 13.2a7.5 7.5 0 0 1-15 0C4.5 9.3 12 1.5 12 1.5z", "translate(10.3 -.7) scale(.6)"]]
  };
  var GLYPH_Y = {"Drinking Water": [1.5, 22.2], "Wastewater": [4.5, 22], "Stormwater": [3.3, 20.2], "Drinking Water & Wastewater": [0.2, 21.8]};
  function glyphPaths(g, style) {
    return GLYPH_SHAPES[g].map(function (p) {
      return '<path d="' + p[0] + '"' + (p[1] ? ' transform="' + p[1] + '"' : "") + (style ? ' style="' + style + '"' : "") + "/>";
    }).join("");
  }
  var ARPA_DEADLINE = "2024-12-31";   // SLFRF obligation deadline

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- state ----------
  var state = {
    ds: "sample", q: "", cat: "", water: new Set(), county: "", dist: "",
    y0: null, y1: null, src: new Set(), dis: false,
    catMeasure: "dollars", srcMeasure: "dollars", timeStep: "year", mapMode: "towns",
    selTown: null, selProject: null, sort: { key: "date", dir: -1 }, page: 0,
    arpaBy: "type", arpaMeasure: "dollars", tour: false, glBy: "type"
  };
  var D, P, META, BY_ID, F = [];

  // ---------- formatting ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(v) {
    var a = Math.abs(v);
    if (a >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return "$" + (v / 1e6).toFixed(a >= 1e8 ? 0 : 1) + "M";
    if (a >= 1e3) return "$" + (v / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "K";
    return "$" + Math.round(v).toLocaleString("en-US");
  }
  function moneyFull(v) { return "$" + Math.round(v).toLocaleString("en-US"); }
  function num(v) { return Math.round(v).toLocaleString("en-US"); }
  function pct(a, b) { return b ? Math.round(a / b * 100) + "%" : "–"; }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dateLong(iso) { var d = iso.split("-"); return MONTHS[+d[1] - 1] + " " + (+d[2]) + ", " + d[0]; }
  function monthYear(iso) { var d = iso.split("-"); return MONTHS[+d[1] - 1] + " " + d[0]; }
  function plural(n, one, many) { return num(n) + " " + (n === 1 ? one : (many || one + "s")); }
  var WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  function numW(n) { return n >= 0 && n < 10 && n === Math.round(n) ? WORDS[n] : num(n); }
  /** plural() for running text: one to nine spelled out (AP style, NHDES guidelines 1.4.10.1). */
  function pluralW(n, one, many) { return numW(n) + " " + (n === 1 ? one : (many || one + "s")); }

  function srcLabel(k) { return META.sources.filter(function (s) { return s.key === k; })[0].label; }
  function srcShort(k) { return META.sources.filter(function (s) { return s.key === k; })[0].short; }
  function catIcon(c) { var i = META.categories.indexOf(c); return i < 0 ? "" : "i-cat-" + i; }
  function catShort(c) { return c === "Infrastructure (Construction)" ? "Construction" : c; }
  function waterGroup(p) {
    if (p.water.indexOf("Drinking Water") >= 0 && p.water.indexOf("Wastewater") >= 0) return "Drinking Water & Wastewater";
    return p.water[0] || "Drinking Water";
  }
  function activeSources() { return state.src.size ? SRC.filter(function (k) { return state.src.has(k); }) : SRC; }
  /** Dollars counted for a project: only the selected funding sources, when any are selected. */
  function amt(p) {
    if (!state.src.size) return p.total;
    var s = 0;
    state.src.forEach(function (k) { s += p.amounts[k] || 0; });
    return s;
  }
  function sum(list, f) { var s = 0; for (var i = 0; i < list.length; i++) s += f(list[i]); return s; }
  function svgUse(id, attrs) { return '<use href="#' + id + '" ' + (attrs || "") + "/>"; }
  function icon(id, cls) { return '<svg class="ic ' + (cls || "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  // A funding source's colour swatch (no icon: only water systems carry icons).
  function srcDot(k) { return '<span class="src-dot" style="background:var(--src-' + k + ')"></span>'; }
  function niceStep(max, count) {
    var raw = max / count, mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  function roundedBar(x, y, w, h, r, dir) {
    // Square at the baseline, rounded at the data end. dir: "right" | "up".
    r = Math.max(0, Math.min(r, dir === "right" ? w : h, dir === "right" ? h / 2 : w / 2));
    if (dir === "right") {
      return "M" + x + " " + y + "h" + (w - r) + "a" + r + " " + r + " 0 0 1 " + r + " " + r + "v" + (h - 2 * r) +
        "a" + r + " " + r + " 0 0 1 " + (-r) + " " + r + "h" + (-(w - r)) + "z";
    }
    return "M" + x + " " + (y + h) + "v" + (-(h - r)) + "a" + r + " " + r + " 0 0 1 " + r + " " + (-r) + "h" + (w - 2 * r) +
      "a" + r + " " + r + " 0 0 1 " + r + " " + r + "v" + (h - r) + "z";
  }
  function width(el) { return Math.max(240, Math.floor(el.getBoundingClientRect().width)); }

  // ---------- tooltip ----------
  var tip = $("#tooltip");
  function tipHtml(el) { return el.getAttribute("data-tip"); }
  function placeTip(x, y) {
    var r = tip.getBoundingClientRect(), pad = 14;
    var left = x + pad, top = y + pad;
    if (left + r.width > innerWidth - 8) left = x - r.width - pad;
    if (top + r.height > innerHeight - 8) top = y - r.height - pad;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = Math.max(8, top) + "px";
  }
  function showTip(el, x, y) {
    tip.innerHTML = tipHtml(el);
    tip.hidden = false;
    if (x == null) { var r = el.getBoundingClientRect(); x = r.left + r.width / 2; y = r.bottom; }
    placeTip(x, y);
    var g = el.closest("[data-hover-group]");
    if (g) { g.classList.add("dim"); $$(".on", g).forEach(function (n) { n.classList.remove("on"); }); el.classList.add("on"); }
  }
  function hideTip() {
    tip.hidden = true;
    $$(".dim").forEach(function (g) { g.classList.remove("dim"); });
  }
  document.addEventListener("pointerover", function (e) {
    var el = e.target.closest && e.target.closest("[data-tip]");
    if (el) showTip(el, e.clientX, e.clientY);
  });
  document.addEventListener("pointermove", function (e) {
    if (!tip.hidden && e.target.closest && e.target.closest("[data-tip]")) placeTip(e.clientX, e.clientY);
  });
  document.addEventListener("pointerout", function (e) {
    var el = e.target.closest && e.target.closest("[data-tip]");
    if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) hideTip();
  });
  document.addEventListener("focusin", function (e) {
    var el = e.target.closest && e.target.closest("[data-tip]");
    if (el) showTip(el); else hideTip();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideTip(); });
  function projectTip(p) {
    return "<strong>" + esc(p.party) + "</strong>" + esc(p.town || p.locality) + " · " + esc(catShort(p.category)) +
      "<br>" + SRC.filter(function (k) { return p.amounts[k]; }).map(srcShort).join(" + ") +
      '<div class="tt-row"><span>' + (state.src.size ? "Selected sources" : "Committed") + "</span><span>" + moneyFull(amt(p)) + "</span></div>";
  }

  // ---------- filtering ----------
  function applyFilters() { F = filterAll(); }
  function filterAll() {
    var q = state.q.trim().toLowerCase();
    return P.filter(function (p) {
      if (state.cat && p.category !== state.cat) return false;
      if (state.water.size && !p.water.some(function (w) { return state.water.has(w); })) return false;
      if (state.county && p.county !== state.county) return false;
      if (state.dist) {
        var parts = state.dist.split(":");
        if (!inDist(p[parts[0]], parts[1])) return false;
      }
      var y = +p.date.slice(0, 4);
      if (state.y0 && y < state.y0) return false;
      if (state.y1 && y > state.y1) return false;
      if (state.src.size && !SRC.some(function (k) { return state.src.has(k) && p.amounts[k]; })) return false;
      if (state.dis && !p.disadvantaged) return false;
      if (q) {
        var hay = (p.id + " " + p.party + " " + p.town + " " + p.locality + " " + p.county + " " + p.description).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  // ---------- controls ----------
  function buildControls() {
    var cats = META.categories.slice();
    P.forEach(function (p) { if (cats.indexOf(p.category) < 0) cats.push(p.category); });
    $("#fcat").innerHTML = cats.map(function (c) {
      return '<button type="button" class="opt no-ic" aria-pressed="false" data-catf="' + esc(c) + '">' +
        '<span class="opt-name">' + esc(catShort(c)) + '</span><span class="opt-n" data-n></span></button>';
    }).join("");
    $("#fcounty").innerHTML = '<option value="">All counties</option>' + GEO.counties.map(function (c) {
      return "<option>" + esc(c.n) + "</option>";
    }).join("");
    var ec = "", sd = "", hd = "", hds = {};
    for (var i = 1; i <= 5; i++) ec += '<option value="ec:' + i + '">Council District ' + i + "</option>";
    for (var j = 1; j <= 24; j++) sd += '<option value="sd:' + j + '">Senate District ' + j + "</option>";
    GEO.towns.forEach(function (t) { t.hd.forEach(function (h) { hds[h] = 1; }); });
    Object.keys(hds).sort(function (a, b) {   // by county, then number
      return a.replace(/\d+$/, "").localeCompare(b.replace(/\d+$/, "")) || +a.replace(/^\D+/, "") - +b.replace(/^\D+/, "");
    }).forEach(function (h) {
      hd += '<option value="hd:' + h + '">' + hdName(h) + (HOUSE_FLOT.has(h) ? " (floterial)" : "") + "</option>";
    });
    $("#fdist").innerHTML = '<option value="">All districts</option><optgroup label="Executive Council">' + ec +
      '</optgroup><optgroup label="State Senate">' + sd + '</optgroup><optgroup label="State House">' + hd + "</optgroup>";
    var y0 = +META.dateRange[0].slice(0, 4), y1 = +META.dateRange[1].slice(0, 4), opts = "";
    for (var y = y0; y <= y1; y++) opts += "<option>" + y + "</option>";
    $("#fy0").innerHTML = opts;
    $("#fy1").innerHTML = opts;
    $("#fwater").innerHTML = WATER.map(function (w) {
      return '<button type="button" class="opt" aria-pressed="false" data-water="' + esc(w) + '">' +
        '<span class="opt-ic">' + icon("i-" + WATER_KEY[w]) + '</span><span class="opt-name">' + esc(WATER_SHORT[w]) + '</span><span class="opt-n" data-n></span></button>';
    }).join("");
    $("#fsrc").innerHTML = SRC.map(function (k) {
      return '<button type="button" class="opt" aria-pressed="false" data-src="' + k + '" title="' + esc(srcLabel(k)) + '">' +
        '<span class="dot" style="background:var(--src-' + k + ')"></span>' +
        '<span class="opt-name">' + esc(srcShort(k)) + '</span><span class="opt-n" data-n></span></button>';
    }).join("");
  }
  function syncControls() {
    $("#fq").value = state.q;
    $$("#fcat .opt").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.catf === state.cat); });
    $("#fcounty").value = state.county;
    $("#fdist").value = state.dist;
    $("#fy0").value = String(state.y0);
    $("#fy1").value = String(state.y1);
    $("#fdis").checked = state.dis;
    $$("#fwater .opt").forEach(function (b) { b.setAttribute("aria-pressed", state.water.has(b.dataset.water)); });
    $$("#fsrc .opt").forEach(function (b) { b.setAttribute("aria-pressed", state.src.has(b.dataset.src)); });
    // How many projects each option would show, given every other filter.
    var keepSrc = state.src, keepCat = state.cat, keepWater = state.water;
    state.src = new Set(); var baseS = filterAll();
    state.src = keepSrc; state.cat = ""; var baseC = filterAll(); state.cat = keepCat;
    state.water = new Set(); var baseW = filterAll(); state.water = keepWater;
    $$("#fsrc .opt").forEach(function (b) {
      b.querySelector("[data-n]").textContent = num(baseS.filter(function (p) { return p.amounts[b.dataset.src]; }).length);
    });
    $$("#fcat .opt").forEach(function (b) {
      b.querySelector("[data-n]").textContent = num(baseC.filter(function (p) { return p.category === b.dataset.catf; }).length);
    });
    $$("#fwater .opt").forEach(function (b) {
      b.querySelector("[data-n]").textContent = num(baseW.filter(function (p) { return p.water.indexOf(b.dataset.water) >= 0; }).length);
    });
  }
  function resetFilters() {
    state.q = ""; state.cat = ""; state.water = new Set(); state.county = ""; state.dist = "";
    state.src = new Set(); state.dis = false; state.selTown = null; state.selProject = null; state.page = 0;
    state.y0 = +META.dateRange[0].slice(0, 4);
    state.y1 = +META.dateRange[1].slice(0, 4);
  }
  function wireControls() {
    var t;
    $("#fq").addEventListener("input", function (e) {
      clearTimeout(t);
      t = setTimeout(function () { state.q = e.target.value; update(); }, 180);
    });
    $("#fcat").addEventListener("click", function (e) {
      var b = e.target.closest(".opt"); if (!b) return;
      state.cat = state.cat === b.dataset.catf ? "" : b.dataset.catf; update();
    });
    $("#fcounty").addEventListener("change", function (e) { state.county = e.target.value; update(); });
    $("#fdist").addEventListener("change", function (e) { state.dist = e.target.value; update(); });
    $("#fy0").addEventListener("change", function (e) {
      state.y0 = +e.target.value; if (state.y1 < state.y0) state.y1 = state.y0; update();
    });
    $("#fy1").addEventListener("change", function (e) {
      state.y1 = +e.target.value; if (state.y0 > state.y1) state.y0 = state.y1; update();
    });
    $("#fdis").addEventListener("change", function (e) { state.dis = e.target.checked; update(); });
    $("#fwater").addEventListener("click", function (e) {
      var b = e.target.closest(".opt"); if (!b) return;
      var w = b.dataset.water; state.water.has(w) ? state.water.delete(w) : state.water.add(w); update();
    });
    $("#fsrc").addEventListener("click", function (e) {
      var b = e.target.closest(".opt"); if (!b) return;
      var k = b.dataset.src; state.src.has(k) ? state.src.delete(k) : state.src.add(k); update();
    });
    $("#resetBtn").addEventListener("click", function () { resetFilters(); update(); $("#fq").focus(); });

    wireSeg("[data-measure]", "measure", function (v) { state.catMeasure = v; renderCategories(); });
    wireSeg("[data-srcmeasure]", "srcmeasure", function (v) { state.srcMeasure = v; renderSources(); });
    wireSeg("[data-step]", "step", function (v) { state.timeStep = v; renderTime(); });
    wireSeg("[data-mapmode]", "mapmode", function (v) { state.mapMode = v; renderMap(); renderList(); });
    wireSeg("[data-glby]", "glby", function (v) { state.glBy = v; renderGrantsLoans(); renderArpa(); refreshTable("#glChart"); });
    wireSeg("[data-arpameasure]", "arpameasure", function (v) { state.arpaMeasure = v; renderArpa(); });
    wireSeg("[data-arpaby]", "arpaby", function (v) { state.arpaBy = v; renderArpa(); refreshTable("#arpaChart"); });

    $$(".view-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var card = b.closest("[data-view]"), on = b.getAttribute("aria-pressed") !== "true";   // a card, or a part of one
        b.setAttribute("aria-pressed", on);
        card.dataset.view = on ? "table" : "chart";
        $(".chart", card).hidden = on;
        var legend = $(":scope > .legend", card); if (legend) legend.hidden = on;
        $(".table-view", card).hidden = !on;
        if (on) renderTable(card);
      });
    });

    // About these data: a modal dialog (native <dialog>: focus stays inside, Escape closes,
    // focus returns to the link that opened it).
    var dlg = $("#aboutDlg");
    $("#aboutClose").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-about]")) { hideTip(); dlg.showModal(); return; }
      var el = e.target.closest("[data-pid]");
      if (el) { hideTip(); var od = el.closest("dialog[open]"); if (od) od.close(); selectProject(el.getAttribute("data-pid"), el); return; }
      var tn = e.target.closest("[data-town]");
      if (tn && tn.closest("#map")) { hideTip(); selectTown(tn.getAttribute("data-town")); }
    });
    var rt;
    addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { renderCharts(); renderList(); }, 150); });
  }
  function wireSeg(sel, key, fn) {
    $$(sel).forEach(function (b) {
      b.addEventListener("click", function () {
        $$(sel, b.parentNode).forEach(function (x) { x.setAttribute("aria-checked", x === b); });
        fn(b.dataset[key]);
      });
    });
  }

  // ---------- summary bar: active filters once the filter row has scrolled away ----------
  function activeFilterList() {
    var out = [];
    if (state.q.trim()) out.push({ k: "q", l: "“" + state.q.trim() + "”" });
    if (state.cat) out.push({ k: "cat", l: catShort(state.cat) });
    state.water.forEach(function (w) { out.push({ k: "water", v: w, l: WATER_SHORT[w], i: "i-" + WATER_KEY[w] }); });
    if (state.county) out.push({ k: "county", l: state.county + " County" });
    if (state.dist) out.push({ k: "dist", l: distLabel(state.dist) });
    var ys = +META.dateRange[0].slice(0, 4), ye = +META.dateRange[1].slice(0, 4);
    if (state.y0 !== ys || state.y1 !== ye) out.push({ k: "years", l: state.y0 === state.y1 ? String(state.y0) : state.y0 + "–" + state.y1 });
    state.src.forEach(function (k) { out.push({ k: "src", v: k, l: srcShort(k) }); });
    if (state.dis) out.push({ k: "dis", l: "Disadvantaged" });
    return out;
  }
  function renderActive() {
    var list = activeFilterList(), total = money(sum(F, amt));
    $("#resultCount").innerHTML = "<strong>" + num(F.length) + "</strong> of " + num(P.length) + " projects · <strong>" + total + "</strong>";
    $("#triggerCount").innerHTML = "<strong>" + num(F.length) + "</strong> of " + num(P.length) + " projects · " + total;
    $("#sbApply").textContent = "Show " + pluralW(F.length, "project");
    var badge = $("#fBadge"); badge.hidden = !list.length; badge.textContent = list.length;
    $("#sbOpen").setAttribute("aria-label", "Filters" + (list.length ? ", " + list.length + " active" : ""));
    $("#resetBtn").hidden = !list.length;
    $("#activeChips").innerHTML = list.map(function (f, i) {
      return '<button type="button" class="sb-chip" data-i="' + i + '" aria-label="Remove filter: ' + esc(f.l) + '">' + (f.i ? icon(f.i) : "") + esc(f.l) + icon("i-close") + "</button>";
    }).join("");
    $$("#activeChips .sb-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        var f = list[+b.dataset.i];
        if (f.k === "q") state.q = "";
        else if (f.k === "cat") state.cat = "";
        else if (f.k === "water") state.water.delete(f.v);
        else if (f.k === "county") state.county = "";
        else if (f.k === "dist") state.dist = "";
        else if (f.k === "years") { state.y0 = +META.dateRange[0].slice(0, 4); state.y1 = +META.dateRange[1].slice(0, 4); }
        else if (f.k === "src") state.src.delete(f.v);
        else if (f.k === "dis") state.dis = false;
        update();
        var next = $("#activeChips .sb-chip") || $("#fq"); next.focus();
      });
    });
  }
  // Phones: the sidebar becomes a modal drawer opened from the sticky trigger bar.
  function wireDrawer() {
    var side = $("#sidebar"), opener = $("#sbOpen"), mq = matchMedia("(max-width: 959px)");
    function open() {
      side.classList.add("open"); side.setAttribute("role", "dialog"); side.setAttribute("aria-modal", "true");
      opener.setAttribute("aria-expanded", "true"); document.body.classList.add("drawer-open");
      $("#main").inert = true;
      $("#sbClose").focus();
    }
    function close() {
      if (!side.classList.contains("open")) return;
      side.classList.remove("open"); side.removeAttribute("role"); side.removeAttribute("aria-modal");
      opener.setAttribute("aria-expanded", "false"); document.body.classList.remove("drawer-open");
      $("#main").inert = false;
      opener.focus();
    }
    opener.addEventListener("click", open);
    $("#sbClose").addEventListener("click", close);
    $("#sbApply").addEventListener("click", close);
    side.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    mq.addEventListener("change", function () { if (!mq.matches) close(); });
  }

  // ---------- headline ----------
  function renderHero() {
    var total = sum(F, amt);
    $("#heroValue").textContent = money(total);
    var dates = F.map(function (p) { return p.date; }).sort();
    var srcNote = state.src.size ? " Counting " + activeSources().map(srcShort).join(" + ") + " dollars only." : "";
    $("#heroSub").textContent = F.length
      ? "Binding commitments, " + monthYear(dates[0]) + " to " + monthYear(dates[dates.length - 1]) + (srcNote ? "." + srcNote : "")
      : "No projects match these filters.";

    renderFlow();
  }

  // ---------- money flow: funding sources -> water systems ----------
  function flowData() {
    var srcs = activeSources(), links = [];
    srcs.forEach(function (k) {
      WATER_GROUPS.forEach(function (g) {
        var list = F.filter(function (p) { return p.amounts[k] && waterGroup(p) === g; });
        var v = sum(list, function (p) { return p.amounts[k]; });
        if (v > 0) links.push({ s: k, t: g, v: v, n: list.length });
      });
    });
    return links;
  }
  function renderFlow() {
    var el = $("#flowChart"), links = flowData();
    var tot = sum(links, function (l) { return l.v; });
    if (!tot) { el.innerHTML = '<p class="empty">No dollars match these filters.</p>'; return; }
    var W = width(el), narrow = W < 520;
    var labL = narrow ? 72 : 140, labR = narrow ? 150 : 250, nodeW = 12, slot = narrow ? 62 : 44, gap = 8;
    var left = activeSources().map(function (k) {
      return { id: k, v: sum(links.filter(function (l) { return l.s === k; }), function (l) { return l.v; }) };
    }).filter(function (n) { return n.v > 0; });
    var right = WATER_GROUPS.map(function (g) {
      return { id: g, v: sum(links.filter(function (l) { return l.t === g; }), function (l) { return l.v; }),
               n: F.filter(function (p) { return waterGroup(p) === g && activeSources().some(function (k) { return p.amounts[k]; }); }).length };
    }).filter(function (n) { return n.v > 0; });
    // Ribbon width is exact; small nodes get a minimum slot so their labels never collide.
    var H = Math.max(W >= 820 ? 340 : 260, Math.max(left.length, right.length) * (slot + gap));
    function layout(nodes) {
      var free = H - gap * (nodes.length - 1), k = free / tot, extra;
      for (var it = 0; it < 4; it++) {       // widen the minimum slots, then rescale the rest
        extra = 0;
        nodes.forEach(function (n) { n.h = n.v * k; if (n.h < slot) extra += slot - n.h; });
        k = (free - extra) / tot;
      }
      var y = 0;
      nodes.forEach(function (n) { n.h = n.v * k; n.slot = Math.max(n.h, slot); n.y = y + (n.slot - n.h) / 2; y += n.slot + gap; });
      return k;
    }
    var k = Math.min(layout(left), layout(right));
    left.forEach(function (n) { n.h = n.v * k; }); right.forEach(function (n) { n.h = n.v * k; });
    // recentre bars in their slots with the shared scale
    [left, right].forEach(function (nodes) {
      var y = 0;
      nodes.forEach(function (n) { n.slot = Math.max(n.h, slot); n.y = y + (n.slot - n.h) / 2; y += n.slot + gap; });
      var used = y - gap, off = (H - used) / 2;
      nodes.forEach(function (n) { n.y += off; });
    });
    // Label columns sized to their text, so the left labels start at the left edge and the
    // longest right label ends at the right edge: equal margins on both sides.
    var cv = (renderFlow.cv || (renderFlow.cv = document.createElement("canvas"))).getContext("2d"), fam = getComputedStyle(el).fontFamily;
    function tw(t, b) { cv.font = (b ? "700 " : "400 ") + "14px " + fam; return cv.measureText(t).width; }
    var shortName = function (id) { return narrow ? { "Drinking Water": "Drinking", "Drinking Water & Wastewater": "Drink + waste" }[id] || WATER_SHORT[id] : WATER_SHORT[id]; };
    labL = Math.ceil(Math.max.apply(null, left.map(function (n) { return Math.max(tw(srcShort(n.id)), tw(money(n.v))); }))) + 14;
    labR = 44 + Math.ceil(Math.max.apply(null, right.map(function (n) {
      var share = pct(n.v, tot);
      return Math.max(tw(shortName(n.id)), tw(share, true) + tw(" · " + money(n.v) + (narrow ? "" : " · " + plural(n.n, "project"))), narrow ? tw(plural(n.n, "project")) : 0);
    }))) + 1;
    var x0 = labL, x1 = W - labR, byId = {};
    left.forEach(function (n) { n.cursor = n.y; byId["s:" + n.id] = n; });
    right.forEach(function (n) { n.cursor = n.y; byId["t:" + n.id] = n; });
    // order ribbons so they leave and arrive in node order (fewest crossings)
    links.sort(function (a, b) { return WATER_GROUPS.indexOf(a.t) - WATER_GROUPS.indexOf(b.t); });
    links.forEach(function (l) { var s = byId["s:" + l.s]; l.w = l.v * k; l.ys = s.cursor; s.cursor += l.w; });
    links.slice().sort(function (a, b) { return SRC.indexOf(a.s) - SRC.indexOf(b.s); })
      .forEach(function (l) { var t = byId["t:" + l.t]; l.yt = t.cursor; t.cursor += l.w; });
    var ax = x0 + nodeW, bx = x1 - nodeW, mx = (ax + bx) / 2;
    var out = '<svg width="' + W + '" height="' + H + '" role="img" aria-labelledby="h-flow" aria-describedby="d-flow" data-hover-group><title>Dollars from each funding source into each water system</title>' +
      '<desc id="d-flow">Flow diagram. Funding sources are on the left and water systems on the right. The width of each ribbon shows dollars. It shows which sources paid for which kinds of water work.</desc>';
    links.forEach(function (l) {
      var w = Math.max(l.w, 1), d = "M" + ax + " " + l.ys + "C" + mx + " " + l.ys + " " + mx + " " + l.yt + " " + bx + " " + l.yt +
        "V" + (l.yt + w) + "C" + mx + " " + (l.yt + w) + " " + mx + " " + (l.ys + w) + " " + ax + " " + (l.ys + w) + "Z";
      out += '<path class="ribbon mark-hover" data-s="' + l.s + '" data-t="' + esc(l.t) + '" d="' + d + '" style="fill:var(--src-' + l.s + ')" data-tip="' +
        esc("<strong>" + esc(srcShort(l.s)) + " → " + esc(WATER_SHORT[l.t]) + "</strong>" + moneyFull(l.v) + " · " + plural(l.n, "project") +
          '<div class="tt-row"><span>Share of ' + esc(srcShort(l.s)) + "</span><span>" + pct(l.v, byId["s:" + l.s].v) + "</span></div>") + '"/>';
    });
    left.forEach(function (n) {
      var cy = n.y + n.h / 2, flows = links.filter(function (l) { return l.s === n.id; });
      out += '<g class="flow-node mark-hover" tabindex="0" data-node-s="' + n.id + '" aria-label="' +
        esc(srcLabel(n.id) + ", " + moneyFull(n.v) + ": " + flows.map(function (l) { return WATER_SHORT[l.t] + " " + moneyFull(l.v); }).join(", ")) + '" data-tip="' +
        esc("<strong>" + esc(srcLabel(n.id)) + "</strong>" + flows.map(function (l) {
          return '<div class="tt-row"><span>' + esc(WATER_SHORT[l.t]) + "</span><span>" + money(l.v) + "</span></div>";
        }).join("")) + '">' +
        '<rect class="hit" x="0" y="' + (cy - slot / 2) + '" width="' + (x0 + nodeW) + '" height="' + slot + '"/>' +
        '<rect x="' + x0 + '" y="' + n.y + '" width="' + nodeW + '" height="' + Math.max(n.h, 2) + '" rx="2" style="fill:var(--src-' + n.id + ')"/>' +
        '<text class="t-label" x="0" y="' + (cy - 2) + '">' + esc(srcShort(n.id)) + "</text>" +
        '<text class="t-sub" x="0" y="' + (cy + 15) + '">' + money(n.v) + "</text></g>";
    });
    right.forEach(function (n) {
      // label: name, then dollars and share of all dollars, then projects
      var cy = n.y + n.h / 2, tx = x1 + 44, share = pct(n.v, tot), ty = cy - (narrow ? 14 : 8);
      out += '<g class="flow-node mark-hover" tabindex="0" data-node-t="' + esc(n.id) + '" aria-label="' +
        esc(WATER_SHORT[n.id] + ", " + moneyFull(n.v) + ", " + share + " of dollars, " + plural(n.n, "project")) + '" data-tip="' +
        esc("<strong>" + esc(WATER_SHORT[n.id]) + "</strong>" + links.filter(function (l) { return l.t === n.id; }).map(function (l) {
          return '<div class="tt-row"><span><span class="tt-sw" style="background:var(--src-' + l.s + ')"></span>' + esc(srcShort(l.s)) + "</span><span>" + money(l.v) + "</span></div>";
        }).join("") + '<div class="tt-row"><span>Total · ' + share + " of dollars</span><span>" + money(n.v) + "</span></div>" +
          '<div class="tt-row"><span>Projects</span><span>' + num(n.n) + "</span></div>") + '">' +
        '<rect class="hit" x="' + (x1 - nodeW) + '" y="' + (cy - slot / 2) + '" width="' + (W - x1 + nodeW) + '" height="' + slot + '"/>' +
        '<rect x="' + (x1 - nodeW) + '" y="' + n.y + '" width="' + nodeW + '" height="' + Math.max(n.h, 2) + '" rx="2" style="fill:var(--ink-2)"/>' +
        '<use href="#' + WICON[n.id] + '" x="' + (x1 + 10) + '" y="' + (cy - 11) + '" width="22" height="22" style="fill:none;stroke:var(--ink-2);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"/>' +
        '<text class="t-label" x="' + tx + '" y="' + ty + '">' + esc(narrow ? { "Drinking Water": "Drinking", "Drinking Water & Wastewater": "Drink + waste" }[n.id] || WATER_SHORT[n.id] : WATER_SHORT[n.id]) + "</text>" +
        '<text class="t-sub" x="' + tx + '" y="' + (ty + 17) + '"><tspan class="t-val">' + share + "</tspan> · " + money(n.v) + (narrow ? "" : " · " + plural(n.n, "project")) + "</text>" +
        (narrow ? '<text class="t-sub" x="' + tx + '" y="' + (ty + 34) + '">' + plural(n.n, "project") + "</text>" : "") + "</g>";
    });
    el.innerHTML = out + "</svg>";
    // Hovering a node lights its ribbons (the filters live in the sidebar only).
    $$(".flow-node", el).forEach(function (g) {
      var s = g.dataset.nodeS, t = g.dataset.nodeT;
      function lit(on) {
        $$(".ribbon", el).forEach(function (r) { r.classList.toggle("lit", on && (r.dataset.s === s || r.dataset.t === t)); });
        el.querySelector("svg").classList.toggle("has-lit", on);
      }
      g.addEventListener("pointerenter", function () { lit(true); }); g.addEventListener("focus", function () { lit(true); });
      g.addEventListener("pointerleave", function () { lit(false); }); g.addEventListener("blur", function () { lit(false); });
    });
  }

  function renderKpis() {
    var towns = new Set(F.map(function (p) { return p.town; }));
    var counties = new Set(F.map(function (p) { return p.county; }));
    var dis = F.filter(function (p) { return p.disadvantaged; });
    var sorted = F.map(amt).sort(function (a, b) { return a - b; });
    var median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : 0;
    // Communities reached, with the disadvantaged communities among them on its own line.
    var tiles = [
      { l: "Projects funded", v: num(F.length), n: ["Median award " + money(median)] },
      { l: "Communities reached", v: num(towns.size), n: dis.length ? ["Including <strong>" + plural(dis.length, "disadvantaged community", "disadvantaged communities") + "</strong>"] : [] }
    ];
    $("#kpis").innerHTML = tiles.map(function (t) {
      return '<div class="kpi"><p class="kpi-label">' + t.l + '</p><p class="kpi-value">' + t.v + '</p><div class="kpi-notes">' +
        t.n.map(function (n) { return '<p class="kpi-note">' + n + "</p>"; }).join("") + "</div></div>";
    }).join("");
  }

  // ---------- funding sources: bars ----------
  function srcRows() {
    return SRC.map(function (k) {
      var list = F.filter(function (p) { return p.amounts[k]; });
      var off = state.src.size && !state.src.has(k);
      return { k: k, v: off ? 0 : sum(list, function (p) { return p.amounts[k]; }), n: off ? 0 : list.length, off: off };
    });
  }
  function renderSources() {
    var el = $("#srcChart"), rows = srcRows(), key = state.srcMeasure === "count" ? "n" : "v";
    rows.sort(function (a, b) { return b[key] - a[key] || SRC.indexOf(a.k) - SRC.indexOf(b.k); });
    var max = Math.max.apply(null, rows.map(function (r) { return r[key]; }));
    if (!max) { el.innerHTML = '<p class="empty">No dollars match these filters.</p>'; return; }
    // Each row: the acronym spelled out beside it (the chart doubles as the key to the
    // acronyms), and the bar underneath. Values are direct-labelled, so there is no tick
    // axis. On phones the full name takes its own line.
    var W = width(el), narrow = W < 440, x0 = 0, valW = narrow ? 80 : 150, rowH = narrow ? 68 : 58, barH = narrow ? 16 : 18;
    // Scale so the widest bar-plus-label ends exactly at the right edge (labels are measured).
    var ctx = (renderSources.cv || (renderSources.cv = document.createElement("canvas"))).getContext("2d"), fam = getComputedStyle(el).fontFamily;
    function tw(t, b) { ctx.font = (b ? "700 " : "400 ") + "14px " + fam; return ctx.measureText(t).width; }
    var plotW = Infinity;
    rows.forEach(function (r) {
      if (r.off || !r[key]) return;
      var lw = tw(key === "n" ? num(r.n) : money(r.v), true) + (narrow ? 0 : tw(" " + (key === "n" ? money(r.v) : plural(r.n, "project")), false));
      plotW = Math.min(plotW, (W - x0 - 8 - lw - 1) * max / r[key]);
    });
    if (!isFinite(plotW)) plotW = W - x0 - valW;
    var H = rows.length * rowH, tot = sum(rows, function (r) { return r[key]; });
    var out = '<svg width="' + W + '" height="' + H + '" role="img" aria-labelledby="h-sources" aria-describedby="d-sources" data-hover-group><title>Funding source by ' +
      (key === "n" ? "number of projects" : "dollars") + "</title>" +
      '<desc id="d-sources">Bar chart. There is one bar for each funding source. Bar length shows ' + (key === "n" ? "the number of projects" : "dollars committed") + '. It compares how much each source provided.</desc>';
    rows.forEach(function (r, i) {
      var y = i * rowH, bw = r[key] ? Math.max(3, r[key] / max * plotW) : 0;
      var by = y + rowH - barH - 7, bc = by + barH / 2;
      out += '<g class="mark-hover" tabindex="0" aria-label="' +
        esc(srcLabel(r.k) + ": " + moneyFull(r.v) + ", " + plural(r.n, "project")) + '" data-tip="' +
        esc("<strong>" + esc(srcLabel(r.k)) + "</strong>" + '<div class="tt-row"><span>Dollars</span><span>' + moneyFull(r.v) +
          '</span></div><div class="tt-row"><span>Projects</span><span>' + num(r.n) + '</span></div><div class="tt-row"><span>Share</span><span>' + pct(r[key], tot) + "</span></div>") + '">' +
        '<rect class="hit" x="0" y="' + y + '" width="' + W + '" height="' + rowH + '"/>' +
        (narrow
          ? '<text class="t-label" x="' + x0 + '" y="' + (y + 16) + '">' + esc(srcShort(r.k)) + '</text><text class="t-sub" x="' + x0 + '" y="' + (y + 33) + '">' + esc(SRC_DEF[r.k][1]) + "</text>"
          : '<text class="t-label" x="' + x0 + '" y="' + (y + 20) + '"><tspan class="t-strong">' + esc(srcShort(r.k)) + '</tspan> <tspan class="t-sub" dx="4">' + esc(SRC_DEF[r.k][0]) + "</tspan></text>") +
        '<line class="baseline" x1="' + (x0 + .5) + '" x2="' + (x0 + .5) + '" y1="' + (by - 3) + '" y2="' + (by + barH + 3) + '"/>' +
        (bw ? '<path d="' + roundedBar(x0, by, bw, barH, 4, "right") + '" style="fill:var(--src-' + r.k + ')"/>' : "") +
        (r.off ? '<text class="t-sub" x="' + (x0 + 8) + '" y="' + (bc + 4.5) + '">Not selected</text></g>'
          : '<text class="t-val" x="' + (x0 + bw + 8) + '" y="' + (bc + 4.5) + '">' + (key === "n" ? num(r.n) : money(r.v)) +
            (narrow ? "" : ' <tspan class="t-sub">' + (key === "n" ? money(r.v) : plural(r.n, "project")) + "</tspan>") + "</text></g>");
    });
    out += "</svg>";
    el.innerHTML = out;
  }

  // ---------- categories: bars ----------
  function catRows() {
    var cats = META.categories.slice();
    F.forEach(function (p) { if (cats.indexOf(p.category) < 0) cats.push(p.category); });
    return cats.map(function (c) {
      var list = F.filter(function (p) { return p.category === c; });
      return { c: c, n: list.length, v: sum(list, amt) };
    });
  }
  function renderCategories() {
    var el = $("#catChart"), rows = catRows().filter(function (r) { return r.n; }), tot = sum(rows, function (r) { return r.v; });
    rows.sort(function (a, b) { return b.v - a.v || b.n - a.n; });
    if (!rows.length) { el.innerHTML = '<p class="empty">No projects match these filters.</p>'; return; }
    el.innerHTML = '<table class="dtable cat-table"><caption class="sr-only">Dollars committed and number of projects by project type</caption>' +
      '<thead><tr><th scope="col">Project type</th><th scope="col" class="num">Projects</th><th scope="col" class="num">Dollars</th><th scope="col" class="num">Share of dollars</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var share = tot ? r.v / tot : 0;
        return '<tr><th scope="row"><span class="ct-name">' + (catIcon(r.c) ? '<span class="ct-ic">' + icon(catIcon(r.c)) + "</span>" : "") + esc(catShort(r.c)) + "</span></th>" +
          '<td class="num">' + num(r.n) + '</td><td class="num">' + moneyFull(r.v) + '</td><td class="num"><span class="ct-share"><span class="ct-bar"><span style="width:' +
          (share * 100).toFixed(1) + '%"></span></span>' + (r.v > 0 && share < .005 ? "<1%" : pct(r.v, tot)) + "</span></td></tr>";
      }).join("") + '</tbody><tfoot><tr><th scope="row">All project types</th><td class="num">' + num(sum(rows, function (r) { return r.n; })) +
      '</td><td class="num">' + moneyFull(tot) + '</td><td class="num">100%</td></tr></tfoot></table>';
  }

  // ---------- water systems: glyphs that fill to their share ----------
  function waterRows() {
    return WATER_GROUPS.map(function (g) {
      var list = F.filter(function (p) { return waterGroup(p) === g; });
      return { g: g, n: list.length, v: sum(list, amt) };
    });
  }
  function renderWater() {
    var el = $("#waterChart"), rows = waterRows(), tot = sum(rows, function (r) { return r.v; });
    if (!tot) { el.innerHTML = '<p class="empty">No projects match these filters.</p>'; return; }
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.innerHTML = '<div class="water-grid">' + rows.map(function (r, i) {
      var share = r.v / tot, gy = GLYPH_Y[r.g], level = gy[1] - (gy[1] - gy[0]) * share - (share > 0 ? .4 : 0), id = "wg" + i;
      var wave = "M0 " + level + " q3 -1.2 6 0 t6 0 t6 0 t6 0 V24 H0z";
      return '<div class="wg" data-tip="' + esc("<strong>" + esc(WATER_SHORT[r.g]) + "</strong>" + moneyFull(r.v) + " · " + plural(r.n, "project")) + '" tabindex="0" ' +
        'aria-label="' + esc(WATER_SHORT[r.g] + ": " + pct(r.v, tot) + " of dollars, " + moneyFull(r.v) + ", " + plural(r.n, "project")) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="' + id + '">' + glyphPaths(r.g) + "</clipPath></defs>" +
        glyphPaths(r.g, "fill:var(--surface-2)") +
        '<g clip-path="url(#' + id + ')"><path d="' + wave + '" style="fill:var(--single)">' +
        (reduce ? "" : '<animateTransform attributeName="transform" type="translate" values="0 0;-6 0;0 0" dur="6s" repeatCount="indefinite"/>') + "</path></g>" +
        glyphPaths(r.g, "fill:none;stroke:var(--ink-2);stroke-width:.6;vector-effect:non-scaling-stroke") + "</svg>" +
        '<p class="wg-pct">' + pct(r.v, tot) + '</p><p class="wg-name">' + esc(WATER_SHORT[r.g]) + '</p><p class="wg-sub">' + money(r.v) + " · " + plural(r.n, "project") + "</p></div>";
    }).join("") + "</div>";
  }

  // ---------- time: stacked columns by source ----------
  function timeBuckets() {
    var y0 = state.y0, y1 = state.y1, out = [];
    for (var y = y0; y <= y1; y++) {
      if (state.timeStep === "year") out.push({ key: String(y), label: String(y), end: y + "-12-31" });
      else for (var q = 1; q <= 4; q++) out.push({ key: y + "Q" + q, label: q === 1 ? String(y) : "", q: q, y: y, end: y + "-" + ["03-31", "06-30", "09-30", "12-31"][q - 1] });
    }
    var last = META.dateRange[1];
    out = out.filter(function (b) { return state.timeStep === "year" || b.key <= last.slice(0, 4) + "Q" + Math.ceil(+last.slice(5, 7) / 3); });
    out.forEach(function (b) { b.v = {}; SRC.forEach(function (k) { b.v[k] = 0; }); b.t = 0; b.n = 0; });
    var idx = {}; out.forEach(function (b) { idx[b.key] = b; });
    F.forEach(function (p) {
      var y = p.date.slice(0, 4), key = state.timeStep === "year" ? y : y + "Q" + Math.ceil(+p.date.slice(5, 7) / 3), b = idx[key];
      if (!b) return;
      b.n++;
      activeSources().forEach(function (k) { var v = p.amounts[k] || 0; b.v[k] += v; b.t += v; });
    });
    return out;
  }
  function renderTime() {
    var el = $("#timeChart"), B = timeBuckets(), srcs = activeSources();
    $("#timeLegend").innerHTML = srcs.map(function (k) {
      return '<li><span class="sw" style="background:var(--src-' + k + ')"></span>' + esc(srcShort(k)) + "</li>";
    }).join("");
    var max = Math.max.apply(null, B.map(function (b) { return b.t; }));
    if (!max) { el.innerHTML = '<p class="empty">No dollars match these filters.</p>'; return; }
    // Beside the ARPA spotlight the chart grows to the height of that card, so the row has no
    // empty space (measured with this chart cleared, so the ARPA card sets the row height).
    var H = 300, card = el.closest(".card"), side = $(".card-arpa");
    el.innerHTML = "";
    if (side && Math.abs(side.getBoundingClientRect().top - card.getBoundingClientRect().top) < 2) {
      var pad = parseFloat(getComputedStyle(card).paddingBottom) || 0;
      H = Math.round(Math.max(300, Math.min(620, card.getBoundingClientRect().bottom - pad - el.getBoundingClientRect().top - 4)));
    }
    // Phones: a taller top margin, so the ARPA deadline note can sit above the peak total.
    var W = width(el), m = { l: 58, r: 16, t: W < 500 ? 54 : 34, b: 30 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var step = niceStep(max, 4), top = Math.ceil(max / step) * step, band = pw / B.length;
    var bw = Math.min(state.timeStep === "year" ? 64 : 24, band * 0.62);
    var ys = function (v) { return m.t + ph - v / top * ph; };
    var out = '<svg width="' + W + '" height="' + H + '" role="img" aria-labelledby="h-time" aria-describedby="d-time" data-hover-group><title>Dollars committed by ' + state.timeStep + "</title>" +
      '<desc id="d-time">Stacked column chart. The horizontal axis is the ' + state.timeStep + ' of the binding commitment. The vertical axis is dollars committed, split by funding source. It shows how commitments changed over time. A line marks the ARPA obligation deadline of December 31, 2024.</desc>';
    for (var v = 0; v <= top + 1; v += step) {
      out += '<line class="gridline" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Math.round(ys(v)) + '.5" y2="' + Math.round(ys(v)) + '.5"/>' +
        '<text class="t-axis" x="' + (m.l - 8) + '" y="' + (ys(v) + 4) + '" text-anchor="end">' + money(v) + "</text>";
    }
    var peak = B.reduce(function (a, b) { return b.t > a.t ? b : a; }, B[0]);
    B.forEach(function (b, i) {
      var cx = m.l + band * i + band / 2, x = cx - bw / 2, acc = 0, segs = srcs.filter(function (k) { return b.v[k] > 0; });
      var g = "";
      segs.forEach(function (k, si) {
        var y1 = ys(acc), y2 = ys(acc + b.v[k]), h = y1 - y2 - (si < segs.length - 1 ? 2 : 0);
        acc += b.v[k];
        if (h <= 0) return;
        g += si === segs.length - 1
          ? '<path d="' + roundedBar(x, y2, bw, Math.max(h, 1), 4, "up") + '" style="fill:var(--src-' + k + ')"/>'
          : '<rect x="' + x + '" y="' + (y2 + 2) + '" width="' + bw + '" height="' + Math.max(h, 1) + '" style="fill:var(--src-' + k + ')"/>';
      });
      var tipH = "<strong>" + (state.timeStep === "year" ? b.key : "Q" + b.q + " " + b.y) + "</strong>" +
        srcs.filter(function (k) { return b.v[k]; }).slice().reverse().map(function (k) {
          return '<div class="tt-row"><span><span class="tt-sw" style="background:var(--src-' + k + ')"></span>' + esc(srcShort(k)) + "</span><span>" + money(b.v[k]) + "</span></div>";
        }).join("") + '<div class="tt-row"><span>Total · ' + plural(b.n, "project") + "</span><span>" + money(b.t) + "</span></div>";
      out += '<g class="mark-hover" tabindex="0" data-tip="' + esc(tipH) + '" aria-label="' +
        esc((state.timeStep === "year" ? b.key : "Q" + b.q + " " + b.y) + ": " + moneyFull(b.t) + ", " + plural(b.n, "project")) + '">' +
        '<rect class="hit" x="' + (m.l + band * i) + '" y="' + m.t + '" width="' + band + '" height="' + ph + '"/>' + g + "</g>";
      if (b.label) out += '<text class="t-axis" x="' + (state.timeStep === "year" ? cx : m.l + band * i + 2) + '" y="' + (H - 10) + '" text-anchor="' + (state.timeStep === "year" ? "middle" : "start") + '">' + b.label + "</text>";
      if (b === peak && b.t > 0) out += '<text class="t-val" x="' + cx + '" y="' + (ys(b.t) - 8) + '" text-anchor="middle">' + money(b.t) + "</text>";
    });
    // ARPA obligation deadline: a fact that explains the shape of the ARPA series.
    var di = B.findIndex(function (b) { return b.end >= ARPA_DEADLINE; });
    if (di >= 0 && di < B.length - 1 && srcs.indexOf("ARPA") >= 0) {
      var dx = Math.round(m.l + band * (di + 1)) + .5;
      out += '<line class="baseline" x1="' + dx + '" x2="' + dx + '" y1="' + (W - dx > 140 ? m.t - 18 : m.t - 46) + '" y2="' + (m.t + ph) + '"/>' +
        (W - dx > 250 ? '<text class="t-note" x="' + (dx + 6) + '" y="' + (m.t - 8) + '">ARPA obligation deadline, Dec 31, 2024</text>'
          : W - dx > 140 ? '<text class="t-note" x="' + (dx + 6) + '" y="' + (m.t - 8) + '">ARPA obligation deadline,<tspan x="' + (dx + 6) + '" dy="14">Dec 31, 2024</tspan></text>'
          : '<text class="t-note" x="' + (dx - 6) + '" y="' + (m.t - 34) + '" text-anchor="end">ARPA deadline, Dec 31, 2024</text>');
    }
    out += '<line class="baseline" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (m.t + ph + .5) + '" y2="' + (m.t + ph + .5) + '"/></svg>';
    el.innerHTML = out;
  }

  // ---------- map ----------
  var mapBuilt = false;
  function buildMap() {
    var svg = $("#map");
    svg.setAttribute("viewBox", GEO.viewBox);
    var towns = GEO.towns.map(function (t) {
      return '<path class="town" d="' + t.d + '" data-town="' + esc(t.n) + '"/>';
    }).join("");
    var counties = GEO.counties.map(function (c) { return '<path class="overlay" d="' + c.d + '"/>'; }).join("");
    var ec = GEO.ec.map(function (d) { return '<path class="overlay" d="' + d.d + '"/>'; }).join("");
    function labelsFor(groupFn, keys, fmt) {
      return keys.map(function (k) {
        var ts = GEO.towns.filter(function (t) { return groupFn(t) === k; });
        var x = sum(ts, function (t) { return t.cx; }) / ts.length, y = sum(ts, function (t) { return t.cy; }) / ts.length;
        return '<text class="ov-label" x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" text-anchor="middle">' + esc(fmt(k)) + "</text>";
      }).join("");
    }
    var cLabels = labelsFor(function (t) { return t.c; }, GEO.counties.map(function (c) { return c.n; }), function (k) { return k; });
    var eLabels = labelsFor(function (t) { return t.ec[0]; }, [1, 2, 3, 4, 5], function (k) { return "District " + k; });
    svg.innerHTML = '<g id="mTowns">' + towns + '</g><g id="mCounty">' + counties + '</g><g id="mEc">' + ec +
      '</g><defs><mask id="distMask" maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="12000" height="12000"></mask></defs>' +
      '<g id="mDist" mask="url(#distMask)"></g><g id="mMarkers"></g><g id="mLabCounty">' + cLabels + '</g><g id="mLabEc">' + eLabels + '</g><g id="mSel"></g>';
    // each town's bounding box, read from its outline (absolute M/L points), for zooming
    GEO.towns.forEach(function (t) {
      var xs = [], ys = [], m, re = /(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g;
      while ((m = re.exec(t.d))) { xs.push(+m[1]); ys.push(+m[2]); }
      t.box = [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)];
    });
    var vb = GEO.viewBox.split(" ").map(Number);
    MAP_FULL = vb; mapView = vb.slice();
    mapBuilt = true;
  }
  // The county or district chosen in the filters: its towns, or null for the whole state.
  function areaTowns() {
    if (!state.county && !state.dist) return null;
    var parts = state.dist ? state.dist.split(":") : null;
    return GEO.towns.filter(function (t) {
      return (!state.county || t.c === state.county) && (!parts || inDist(t[parts[0]], parts[1]));
    });
  }
  // Zoom to the area, keeping the map's shape (so the card does not change height).
  var MAP_FULL, mapView, mapAnim;
  function mapTarget(ts) {
    if (!ts || !ts.length) return MAP_FULL.slice();
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    ts.forEach(function (t) { x0 = Math.min(x0, t.box[0]); y0 = Math.min(y0, t.box[1]); x1 = Math.max(x1, t.box[2]); y1 = Math.max(y1, t.box[3]); });
    var ratio = MAP_FULL[3] / MAP_FULL[2], pad = 0.08;
    var w = Math.max((x1 - x0) * (1 + 2 * pad), MAP_FULL[2] * 0.22), h = Math.max((y1 - y0) * (1 + 2 * pad), w * ratio);
    w = h / ratio;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  // A close view around one point (a tenth of the state's width), in the map's own shape.
  function pointTarget(loc) {
    var ratio = MAP_FULL[3] / MAP_FULL[2], w = MAP_FULL[2] * 0.1, h = w * ratio;
    return [loc.x - w / 2, loc.y - h / 2, w, h];
  }
  var mapEnd;
  function zoomMap(target) {
    var svg = $("#map"), from = mapView.slice(), t0 = null;
    cancelAnimationFrame(mapAnim); clearTimeout(mapEnd);
    function land() { cancelAnimationFrame(mapAnim); mapView = target.slice(); svg.setAttribute("viewBox", target.join(" ")); }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || from.join() === target.join()) { land(); return; }
    // If frames are held back (a background tab, a busy page), still end on the right view.
    mapEnd = setTimeout(land, 600);
    function step(ts) {
      if (t0 == null) t0 = ts;
      var k = Math.min(1, (ts - t0) / 450), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      mapView = from.map(function (v, i) { return v + (target[i] - v) * e; });
      svg.setAttribute("viewBox", mapView.join(" "));
      if (k < 1) mapAnim = requestAnimationFrame(step);
    }
    mapAnim = requestAnimationFrame(step);
  }
  function townTotals() {
    var m = {};
    F.forEach(function (p) {
      if (!p.town) return;
      var t = m[p.town] || (m[p.town] = { n: 0, v: 0, list: [] });
      t.n++; t.v += amt(p); t.list.push(p);
    });
    return m;
  }
  function breaks(values) {
    var v = values.filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    if (!v.length) return [];
    function nice(x) { var mag = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / mag) * mag; }
    var out = [];
    [0.2, 0.4, 0.6, 0.8].forEach(function (q) {
      var b = nice(v[Math.min(v.length - 1, Math.floor(q * v.length))]);
      if (!out.length || b > out[out.length - 1]) out.push(b);
    });
    return out;
  }
  function renderMap() {
    if (!mapBuilt) buildMap();
    var svg = $("#map"), T = townTotals(), br = breaks(Object.keys(T).map(function (k) { return T[k].v; }));
    var cls = function (v) { if (!v) return 0; var i = 0; while (i < br.length && v >= br[i]) i++; return i + 1; };
    var showTowns = state.mapMode === "towns";
    var area = areaTowns(), inArea = area && new Set(area.map(function (t) { return t.n; }));
    // Projects view with a project open: zoom in on its location; otherwise the chosen county or
    // district, or the whole state. Marks and labels keep their size on screen (k).
    var openP = state.selProject && BY_ID[state.selProject];
    var close = !showTowns && openP && openP.loc;
    var target = close ? pointTarget(openP.loc) : mapTarget(area), k = target[2] / MAP_FULL[2];
    var grow = close ? 2 : 1;   // zoomed in on a project, its markers show at twice their usual size
    svg.style.setProperty("--mk", k.toFixed(3));
    zoomMap(target);
    $$("#mTowns .town", svg).forEach(function (el) {
      var n = el.getAttribute("data-town"), t = T[n];
      el.classList.toggle("out", !!inArea && !inArea.has(n));
      el.style.fill = showTowns ? "var(--seq-" + (t ? Math.min(6, cls(t.v) + 1) : 0) + ")" : (t ? "var(--surface-3)" : "var(--surface-2)");
      el.classList.toggle("sel", n === state.selTown);
      if (t) el.setAttribute("data-tip", "<strong>" + esc(n) + "</strong>" + esc(t.list[0].county) + " County" +
        '<div class="tt-row"><span>' + plural(t.n, "project") + "</span><span>" + money(t.v) + "</span></div>");
      else el.setAttribute("data-tip", "<strong>" + esc(n) + "</strong>No projects in this selection");
    });
    // Boundaries: Executive Council districts while one is chosen, county lines otherwise.
    var ecOn = state.dist.indexOf("ec:") === 0;
    $("#mCounty").style.display = ecOn ? "none" : "";
    $("#mLabCounty").style.display = !ecOn && showTowns && !area ? "" : "none";
    $("#mEc").style.display = ecOn ? "" : "none";
    $("#mLabEc").style.display = "none";
    // The chosen Council or Senate district, outlined in red. Its towns are stroked, and a mask
    // hides everything inside the district, so only the outer edge shows (no inner town lines).
    var dTowns = [];
    if (state.dist) {
      var dp = state.dist.split(":");
      dTowns = GEO.towns.filter(function (t) { return inDist(t[dp[0]], dp[1]); });
    }
    var dPaths = dTowns.map(function (t) { return '<path d="' + t.d + '"/>'; }).join("");
    $("#distMask").innerHTML = dTowns.length ? '<rect x="-5000" y="-5000" width="12000" height="12000" fill="#fff"/><g fill="#000" stroke="#000" stroke-width="2" vector-effect="non-scaling-stroke">' + dPaths + "</g>" : "";  // the stroke closes hairline seams between towns
    $("#mDist").innerHTML = dPaths;
    var mk = "";
    if (!showTowns) {
      F.slice().sort(function (a, b) { return amt(b) - amt(a); }).forEach(function (p) {
        if (!p.loc) return;
        var s = 44 * Math.max(k, .08) * grow;   // markers half again as large as before
        mk += '<g class="marker" data-pid="' + esc(p.id) + '" data-tip="' + esc(projectTip(p)) + '"><use href="#' + GLYPH[waterGroup(p)] +
          '" x="' + (p.loc.x - s / 2) + '" y="' + (p.loc.y - s / 2) + '" width="' + s + '" height="' + s + '" style="fill:var(--single)"/></g>';
      });
    }
    $("#mMarkers").innerHTML = mk;
    var sp = state.selProject && BY_ID[state.selProject];
    var kr = Math.max(k, .08) * grow;
    // the open project: a ring (and, on the town view, a dot; on the projects view its own marker shows)
    $("#mSel").innerHTML = sp && sp.loc ? '<circle class="sel-ring" cx="' + sp.loc.x + '" cy="' + sp.loc.y + '" r="' + (40 * kr) + '"/>' +
      (showTowns ? '<circle class="sel-dot" cx="' + sp.loc.x + '" cy="' + sp.loc.y + '" r="' + (8 * kr) + '"/>' : "") : "";

    // legend
    if (showTowns) {
      // One swatch per class, each labelled with its own range.
      var items = [{ c: 0, l: "None" }];
      for (var bi = 0; bi <= br.length; bi++) {
        items.push({ c: bi + 2, l: bi === 0 ? "Under " + money(br[0]) : bi === br.length ? money(br[bi - 1]) + "+" : money(br[bi - 1]) + "–" + money(br[bi]) });
      }
      $("#mapLegend").innerHTML = "Funding committed per town" + '<ul class="seq-legend">' + items.map(function (it) {
        return '<li><span style="background:var(--seq-' + it.c + ')"></span>' + it.l + "</li>";
      }).join("") + "</ul>";
    } else {
      $("#mapLegend").innerHTML = '<ul class="legend">' + WATER_GROUPS.map(function (g) {
        return '<li><svg class="glyph" aria-hidden="true"><use href="#' + GLYPH[g] + '"/></svg>' + esc(WATER_SHORT[g]) + "</li>";
      }).join("") + "</ul>";
    }
    var nTowns = Object.keys(T).length;
    $("#mapDesc").textContent = "Map of New Hampshire's 259 towns and cities. " + nTowns + " have projects in this selection. " +
      "The projects are also listed beside the map, and the town picker lists every town with projects.";
    renderScope(T);
  }
  function selectTown(n) {
    state.selTown = n && state.selTown !== n ? n : null;
    var sp = state.selProject && BY_ID[state.selProject];
    if (sp && state.selTown && sp.town !== state.selTown) state.selProject = null;
    state.page = 0;
    if (state.selProject) {   // keep the open project's row on screen
      var i = listRows().map(function (r) { return r.id; }).indexOf(state.selProject);
      if (i >= 0) state.page = Math.floor(i / PAGE);
    }
    renderMap(); renderDetail(); renderList();
    var h = $("#scope h3"); if (h) h.focus({ preventScroll: true });
  }
  function renderScope(T) {
    var el = $("#scope"), names = Object.keys(T).sort();
    var picker = '<label class="sr-only" for="townPick">Choose a town</label><select id="townPick" class="town-pick">' +
      '<option value="">' + (state.selTown ? "Statewide" : "Choose a town with projects…") + "</option>" + names.map(function (n) {
        return "<option" + (n === state.selTown ? " selected" : "") + ">" + esc(n) + "</option>";
      }).join("") + "</select>";
    var head;
    if (state.selTown) {
      var t = T[state.selTown], town = GEO.towns.filter(function (x) { return x.n === state.selTown; })[0];
      head = '<div><h3 tabindex="-1">' + esc(state.selTown) + '</h3><p class="panel-meta">' + esc(town.c) + " County · Council District " + town.ec.join(", ") +
        " · Senate District " + town.sd.join(", ") + " · " + hdText(town) + " · " + (t ? "<strong>" + money(t.v) + "</strong> across " + pluralW(t.n, "project") : "no projects in this selection") +
        '</p></div><button type="button" class="link-btn" id="clearTown">Back to statewide</button>';
    } else {
      head = '<div><h3 tabindex="-1">Statewide</h3></div>';
    }
    // the tour starts here too, after the town picker (hidden when fewer than two projects are listed)
    var tour = '<button type="button" class="btn-tour list-tour" id="listTour"' + (listRows().length < 2 ? " hidden" : "") + ">Take the tour</button>";
    el.innerHTML = '<div class="scope-head">' + head + '</div><div class="scope-tools">' + picker + tour + "</div>";
    $("#townPick").addEventListener("change", function (e) { selectTown(e.target.value || null); });
    var c = $("#clearTown"); if (c) c.addEventListener("click", function () { selectTown(null); });
  }

  // ---------- ARPA spotlight: every ARPA project as a circle ----------
  // Circle area is the project's ARPA grant; the ring around it is the whole project
  // (all selected sources), so the gap shows the other funding ARPA sat beside. Circles
  // cluster by project type or water system. Solid circles are work State Revolving Fund
  // loans do not typically fund (anything but construction); construction is lighter.
  var CON = "Infrastructure (Construction)";
  function arpaOf(p) { return p.amounts.ARPA || 0; }
  function arpaProjects() { return F.filter(arpaOf).sort(function (a, b) { return arpaOf(b) - arpaOf(a); }); }
  function arpaClusters(list) {
    var groups = state.arpaBy === "water"
      ? WATER_GROUPS.map(function (g) { return { k: g, l: WATER_SHORT[g], ic: WICON[g], list: list.filter(function (p) { return waterGroup(p) === g; }) }; })
      : META.categories.concat(list.map(function (p) { return p.category; }).filter(function (c, i, a) { return META.categories.indexOf(c) < 0 && a.indexOf(c) === i; }))
          .map(function (c) { return { k: c, l: catShort(c), ic: null, list: list.filter(function (p) { return p.category === c; }) }; });
    groups.forEach(function (g) { g.v = sum(g.list, arpaOf); });
    return groups.filter(function (g) { return g.list.length; }).sort(function (a, b) { return b.v - a.v; });
  }
  // Pack one cluster: largest first, each next circle at the first free spot on a spiral.
  function packCircles(cs) {
    var placed = [];
    cs.forEach(function (c, i) {
      if (!i) { c.x = 0; c.y = 0; placed.push(c); return; }
      for (var t = 0; t < 4000; t++) {
        var ang = t * 0.35, rad = 2 + t * 0.9, x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
        if (placed.every(function (o) { var dx = o.x - x, dy = o.y - y; return dx * dx + dy * dy >= Math.pow(o.R + c.R + 3, 2); })) { c.x = x; c.y = y; break; }
      }
      placed.push(c);
    });
    var x0 = Math.min.apply(null, cs.map(function (c) { return c.x - c.R; })), x1 = Math.max.apply(null, cs.map(function (c) { return c.x + c.R; }));
    var y0 = Math.min.apply(null, cs.map(function (c) { return c.y - c.R; })), y1 = Math.max.apply(null, cs.map(function (c) { return c.y + c.R; }));
    cs.forEach(function (c) { c.x -= x0; c.y -= y0; });
    return { w: x1 - x0, h: y1 - y0 };
  }
  function arcPath(cx, cy, r0, r1, a0, a1) {
    var big = a1 - a0 > Math.PI ? 1 : 0;
    function pt(r, a) { return (cx + r * Math.sin(a)).toFixed(2) + " " + (cy - r * Math.cos(a)).toFixed(2); }
    return "M" + pt(r1, a0) + "A" + r1 + " " + r1 + " 0 " + big + " 1 " + pt(r1, a1) + "L" + pt(r0, a1) +
      "A" + r0 + " " + r0 + " 0 " + big + " 0 " + pt(r0, a0) + "Z";
  }
  function pctSmall(a, b) { return a > 0 && a / b < .005 ? "<1%" : pct(a, b); }
  // One donut and its key: parts [{l, v, c, n, d}] (v sizes the slice: dollars or projects;
  // d is dollars, n projects), the centre figure and its caption.
  function donut(id, title, sub, parts, centre, caption, byCount) {
    var tot = sum(parts, function (q) { return q.v; }), D = 176, r1 = D / 2, r0 = r1 * .6, c = r1, ang = 0, gap = parts.length > 1 ? .012 : 0;
    var svg = '<svg class="donut" width="' + D + '" height="' + D + '" role="img" aria-labelledby="' + id + '" aria-describedby="' + id + '-d" data-hover-group>' +
      '<desc id="' + id + '-d">Donut chart: ' + esc(parts.map(function (q) { return q.l + " " + pctSmall(q.v, tot); }).join(", ")) + ".</desc>";
    parts.forEach(function (q) {
      var span = q.v / tot * Math.PI * 2;
      var d = parts.length === 1
        ? "M" + c + " " + (c - r1) + "A" + r1 + " " + r1 + " 0 1 1 " + (c - .01) + " " + (c - r1) + "L" + (c - .01) + " " + (c - r0) + "A" + r0 + " " + r0 + " 0 1 0 " + c + " " + (c - r0) + "Z"
        : arcPath(c, c, r0, r1, ang + gap, ang + Math.max(span - gap, gap + .001));
      svg += '<path class="mark-hover" tabindex="0" d="' + d + '" style="fill:' + q.c + '" aria-label="' + esc(q.l + ": " + pctSmall(q.v, tot) + (byCount ? " of projects, " + plural(q.v, "project") : ", " + moneyFull(q.v))) + '" data-tip="' +
        esc("<strong>" + esc(q.l) + "</strong>" + '<div class="tt-row"><span>Share of ' + (byCount ? "projects" : "dollars") + "</span><span>" + pctSmall(q.v, tot) + "</span></div>" +
          (q.d != null ? '<div class="tt-row"><span>Dollars</span><span>' + moneyFull(q.d) + "</span></div>" : "") +
          (q.n != null ? '<div class="tt-row"><span>Projects</span><span>' + num(q.n) + "</span></div>" : "")) + '"/>';
      ang += span;
    });
    svg += '<text class="donut-v" x="' + c + '" y="' + (c + 5) + '" text-anchor="middle">' + centre + "</text>" +
      '<text class="t-sub" x="' + c + '" y="' + (c + 25) + '" text-anchor="middle">' + caption + "</text></svg>";
    return '<figure class="ad"><figcaption><h3 class="ab-h" id="' + id + '">' + esc(title) + "</h3>" + (sub ? '<p class="ab-sub">' + sub + "</p>" : "") + "</figcaption>" + svg +
      '<ul class="ad-key">' + parts.map(function (q) {
        return '<li><span class="sw" style="background:' + q.c + (q.light ? ";outline:1px solid var(--axis)" : "") + '"></span><span>' + esc(q.l) +
          '</span><span class="ad-v"><strong>' + pctSmall(q.v, tot) + "</strong></span></li>";
      }).join("") + "</ul></figure>";
  }
  // ARPA in three numbers: what it drew in, what it paid for that loans rarely do, whom it
  // reached. Totals only; individual projects are in the explorer.
  function renderArpa() {
    var el = $("#arpaChart"), top = $("#arpaTop");
    if (state.src.size && !state.src.has("ARPA")) { top.innerHTML = ""; el.innerHTML = '<p class="empty">ARPA is not among the selected funding sources.</p>'; return; }
    var list = arpaProjects();
    if (!list.length) { top.innerHTML = ""; el.innerHTML = '<p class="empty">No ARPA projects match these filters.</p>'; return; }
    var arpa = sum(list, arpaOf), whole = sum(list, amt), other = whole - arpa, all = sum(F, amt);
    var beyond = list.filter(function (p) { return p.category !== CON; });
    var dis = list.filter(function (p) { return p.disadvantaged; });
    var calls = [
      { big: money(arpa), txt: "in ARPA grants to " + pluralW(list.length, "project") + ", " + pct(arpa, all) + " of all dollars committed." },
      beyond.length
        ? { big: num(beyond.length), txt: (beyond.length === 1 ? "project" : "projects") + " beyond construction, such as planning and cybersecurity: work State Revolving Fund loans do not typically fund." }
        : null,
      dis.length
        ? { big: num(dis.length), txt: (dis.length === 1 ? "disadvantaged community" : "disadvantaged communities") + ", community-owned mobile home and condominium associations, received " + money(sum(dis, arpaOf)) + " in grants." }
        : null
    ].filter(Boolean);
    // RFP II.A.a.ii asks to highlight all ARPA efforts: one button shows every ARPA project in the explorer
    var onlyArpa = state.src.size === 1 && state.src.has("ARPA");
    top.innerHTML = '<div class="arpa-calls">' + calls.map(function (c) { return '<div class="ac"><p class="ac-big">' + esc(c.big) + '</p><p class="ac-txt">' + esc(c.txt) + "</p></div>"; }).join("") + "</div>" +
      '<button type="button" class="btn-arpa" id="arpaShow">' + (onlyArpa ? "See the " + num(list.length) + " ARPA " + (list.length === 1 ? "project" : "projects") + " on the map"
        : "See all " + num(list.length) + " ARPA " + (list.length === 1 ? "project" : "projects") + " on the map") + "</button>";
    $("#arpaShow").addEventListener("click", function () {
      state.src = new Set(["ARPA"]); update();
      var ex = $("#explorer");
      ex.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      var h = $("#h-explore"); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true });
    });
    el.innerHTML = "";
  }
  function refreshTable(sel) {
    var card = $(sel).closest("[data-view]");
    if (card.dataset.view === "table") renderTable(card);
  }

  // ---------- grants and loans ----------
  // The Addendum 4 workbook has no grant / loan field, so each source's dollars are
  // classed by what the program awards: ARPA grants; State Revolving Fund and PFAS
  // Remediation Loan Fund loans. The DWGW Trust awards both; its dollars are counted as
  // loans (team decision, 2026-09-30; noted for the proposal). SRF loans can carry principal
  // forgiveness, which the data does not show. NHDES to confirm (A64 "program type"?).
  var GL_OF = { ARPA: "grant", PFAS: "loan", DWSRF: "loan", CWSRF: "loan", DWGWT: "loan" };
  var GL_KINDS = [
    { k: "grant", l: "Grants" },
    { k: "loan", l: "Loans" }
  ];
  function glSplit(list) {
    var t = { grant: 0, loan: 0 };
    list.forEach(function (p) { activeSources().forEach(function (k) { if (p.amounts[k]) t[GL_OF[k] || "loan"] += p.amounts[k]; }); });
    return t;
  }
  function glGroups() {
    var groups = state.glBy === "water"
      ? WATER_GROUPS.map(function (g) { return { l: WATER_SHORT[g], full: WATER_SHORT[g], ic: WICON[g], list: F.filter(function (p) { return waterGroup(p) === g; }) }; })
      : catRows().map(function (r) { return { l: catShort(r.c), full: r.c, ic: null, list: F.filter(function (p) { return p.category === r.c; }) }; });
    groups.forEach(function (g) { g.t = glSplit(g.list); g.v = g.t.grant + g.t.loan; });
    return groups.filter(function (g) { return g.v > 0; }).sort(function (a, b) { return b.v - a.v; });
  }
  function renderGrantsLoans() {
    var el = $("#glChart"), t = glSplit(F), all = t.grant + t.loan;
    if (!all) { el.innerHTML = '<p class="empty">No dollars match these filters.</p>'; return; }
    var kinds = GL_KINDS.filter(function (g) { return t[g.k] > 0; });
    var both = F.filter(function (p) {
      var ks = activeSources().filter(function (k) { return p.amounts[k]; }).map(function (k) { return GL_OF[k]; });
      return ks.indexOf("grant") >= 0 && ks.indexOf("loan") >= 0;
    });
    // 1. the headline split
    var head = '<div class="gl-top">' + kinds.map(function (g) {
      return '<div class="gl-fig"><p class="gl-lbl"><span class="sw gl-' + g.k + '"></span>' + g.l + '</p><p class="gl-val">' + money(t[g.k]) +
        '</p><p class="gl-sub">' + pct(t[g.k], all) + " of dollars</p></div>";
    }).join("") + '<p class="gl-both">' + (both.length
      ? "<strong>" + pluralW(both.length, "project").replace(/^./, function (c) { return c.toUpperCase(); }) + "</strong> " + (both.length === 1 ? "combines" : "combine") + " a grant with a loan."
      : "No project in this selection combines a grant with a loan.") + "</p></div>" +
      '<div class="gl-bar" role="img" aria-label="' + esc(kinds.map(function (g) { return g.l + " " + money(t[g.k]) + ", " + pct(t[g.k], all); }).join(". ")) + '">' +
      kinds.map(function (g) { return '<span class="gl-' + g.k + '" style="flex:' + (t[g.k] / all).toFixed(4) + ' 1 0"></span>'; }).join("") + "</div>";
    // 2. the split within each project type or water system
    var by = state.glBy === "water" ? "water system" : "project type";
    var rows = glGroups();   // each bar is 100% of its group: the point is the mix, not the size
    // phones: the label sits on its own line above the bar
    var W = width(el), narrow = W < 560, labelW = narrow ? 0 : 200, valW = narrow ? 70 : 160, rowH = narrow ? 56 : 40, barH = 18, plotW = W - labelW - valW;
    var barY = narrow ? 26 : 10, txtY = narrow ? 40 : 24;
    var svg = '<svg width="' + W + '" height="' + (rows.length * rowH + 4) + '" role="img" aria-labelledby="gl-t" aria-describedby="gl-d" data-hover-group>' +
      '<title id="gl-t">Grants and loans by ' + by + "</title>" +
      '<desc id="gl-d">Stacked bar chart. There is one bar for each ' + by +
      ". Each bar is all of that group's dollars, split by share into grants and loans. The total is at the end of each bar. It shows which kinds of work are paid for with grants and which with loans.</desc>";
    rows.forEach(function (r, i) {
      var y = i * rowH, x = labelW, bw = plotW;
      var parts = GL_KINDS.filter(function (g) { return r.t[g.k]; });
      var tip = "<strong>" + esc(r.full) + "</strong>" + parts.map(function (g) {
        return '<div class="tt-row"><span><span class="tt-sw gl-' + g.k + '"></span>' + g.l + "</span><span>" + money(r.t[g.k]) + " · " + pct(r.t[g.k], r.v) + "</span></div>";
      }).join("") + '<div class="tt-row"><span>Total · ' + plural(r.list.length, "project") + "</span><span>" + money(r.v) + "</span></div>";
      svg += '<g class="mark-hover" tabindex="0" data-tip="' + esc(tip) + '" aria-label="' + esc(r.l + ": " + parts.map(function (g) { return g.l + " " + moneyFull(r.t[g.k]); }).join(", ")) + '">' +
        '<rect class="hit" x="0" y="' + y + '" width="' + W + '" height="' + rowH + '"/>' +
        (r.ic ? '<use href="#' + r.ic + '" x="0" y="' + (y + (narrow ? 2 : 9)) + '" width="20" height="20" style="fill:none;stroke:var(--brand-2);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round"/>' : "") +
        '<text class="t-label" x="' + (r.ic ? 28 : 0) + '" y="' + (y + (narrow ? 17 : 24)) + '">' + esc(r.l) + "</text>";
      parts.forEach(function (g) {
        var w = r.t[g.k] / r.v * bw;
        svg += '<rect class="gl-' + g.k + '" x="' + x.toFixed(1) + '" y="' + (y + barY) + '" width="' + Math.max(2, w - 2).toFixed(1) + '" height="' + barH + '"/>';
        x += w;
      });
      svg += '<text class="t-val" x="' + (labelW + bw + 8) + '" y="' + (y + txtY) + '">' + money(r.v) +
        (narrow ? "" : ' <tspan class="t-sub">' + (r.t.grant ? pct(r.t.grant, r.v) + " grants" : "all loans") + "</tspan>") + "</text></g>";
    });
    svg += "</svg>";
    el.innerHTML = head + '<p class="gl-h">By ' + by + "</p>" + svg;
  }

  // ---------- disadvantaged communities ----------
  // What was built, read from the NHDES description. Each rule is one work item with
  // its icon; a description that matches none falls back to its first sentence.
  var WORKS = [
    { re: /well ?house|pump ?house/i, i: "i-w-wellhouse", l: "Well house" },
    { re: /(new|replacement|additional) (replacement )?well\b(?! ?house)|well source|bedrock well/i, i: "i-w-well", l: "New well" },
    { re: /water (distribution )?main|water line|distribution main/i, i: "i-w-main", l: "Water mains" },
    { re: /septic|subsurface disposal/i, i: "i-w-septic", l: "Septic systems" },
    { re: /municipal sewer|sewer (system|connection|extension)/i, i: "i-w-sewer", l: "Sewer connection" },
    { re: /storage tank|standpipe|reservoir/i, i: "i-w-tank", l: "Water storage" },
    { re: /pump station|booster/i, i: "i-w-pump", l: "Pump station" },
    { re: /treatment|filtration/i, i: "i-w-treat", l: "Treatment" }
  ];
  // A before/after line, only where the description states both ends.
  var SHIFTS = [
    { re: [/septic/i, /connect\w* to a municipal sewer|municipal sewer/i], from: "Individual septic systems", to: "Connected to the municipal sewer" },
    { re: [/private wells?/i, /municipal water|public water/i], from: "Private wells", to: "Connected to public water" }
  ];
  function worksFor(p) { return WORKS.filter(function (w) { return w.re.test(p.description || ""); }); }
  function shiftFor(p) { return SHIFTS.filter(function (s) { return s.re.every(function (r) { return r.test(p.description || ""); }); })[0]; }
  function firstSentence(t) {
    return (t || "").replace(/^The funding recipient used the funding to\s*/i, "").split(/(?<=\.)\s/)[0].replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); return a.length ? a[Math.floor((a.length - 1) / 2)] : 0; }
  function disList() {
    return F.filter(function (p) { return p.disadvantaged && p.amounts.ARPA; }).sort(function (a, b) { return b.amounts.ARPA - a.amounts.ARPA; });
  }
  function disBasis() {
    return META.disadvantagedBasis === "supplied" ? "Designation supplied by NHDES." :
      "Designation derived here from the recipient's name (cooperatives and associations receiving ARPA). NHDES would supply it as a column.";
  }
  // A panel of its own: a map with one numbered pin per community, the communities
  // (what was built, the grant), and their share of ARPA dollars. Selecting a community
  // opens its project; a row and its pin light together.
  function renderDisadvantaged() {
    var el = $("#disChart");
    if (state.src.size && !state.src.has("ARPA")) { el.innerHTML = '<p class="empty">ARPA is not among the selected funding sources.</p>'; return; }
    var list = disList();
    if (!list.length) { el.innerHTML = '<p class="empty">No disadvantaged communities in this selection.</p>'; return; }
    var others = F.filter(function (p) { return p.amounts.ARPA && !p.disadvantaged; });
    var v = sum(list, arpaOf), rest = sum(others, arpaOf), all = v + rest, share = all ? v / all : 0;
    var maxA = Math.max.apply(null, list.map(arpaOf));
    var map = '<svg class="dis-map" viewBox="' + GEO.viewBox + '" role="img" aria-label="' + esc("Map of New Hampshire with " + pluralW(list.length, "community", "communities") + ": " + list.map(function (p) { return p.town; }).join(", ")) + '">' +
      '<g class="dc-state">' + GEO.counties.map(function (c) { return '<path d="' + c.d + '"/>'; }).join("") + "</g>" +
      list.map(function (p, i) {
        if (!p.loc) return "";
        var r = 46 + 34 * Math.sqrt(arpaOf(p) / maxA);
        return '<g class="dis-pin" data-n="' + i + '"><circle cx="' + p.loc.x + '" cy="' + p.loc.y + '" r="' + r.toFixed(0) + '"/>' +
          '<text x="' + p.loc.x + '" y="' + (p.loc.y + 22) + '" text-anchor="middle">' + (i + 1) + "</text></g>";
      }).join("") + "</svg>";
    var rows = '<ol class="dis-list">' + list.map(function (p, i) {
      var works = worksFor(p), shift = shiftFor(p);
      return '<li class="dis-row" data-n="' + i + '"><span class="dis-num" aria-hidden="true">' + (i + 1) + '</span><div class="dis-main">' +
        '<button type="button" class="dis-name" data-pid="' + esc(p.id) + '">' + esc(p.party) + "</button>" +
        '<p class="dis-where">' + esc(p.town) + ", " + esc(p.county) + " County · " + p.water.map(function (w) { return '<span class="dis-w">' + icon("i-" + WATER_KEY[w]) + esc(WATER_SHORT[w]) + "</span>"; }).join(" ") + "</p>" +
        (works.length ? '<ul class="dis-works">' + works.map(function (w) { return "<li>" + esc(w.l) + "</li>"; }).join("") + "</ul>"
          : '<p class="dis-text">' + esc(firstSentence(p.description)) + "</p>") +
        (shift ? '<p class="dis-shift"><span>' + esc(shift.from) + '</span><span aria-hidden="true">→</span><span class="sr-only">became</span><strong>' + esc(shift.to) + "</strong></p>" : "") +
        '</div><p class="dis-amt">' + money(arpaOf(p)) + "<span>ARPA grant · " + monthYear(p.date) + "</span></p></li>";
    }).join("") + "</ol>";
    var stats = '<div class="dis-stats"><p class="dis-big">' + pct(v, all) + '</p><p class="dis-lead">of ARPA dollars in this selection went to <strong>' +
      pluralW(list.length, "community-owned association") + "</strong>, " + money(v) + " in all.</p>" +
      '<div class="share-bar" role="img" aria-label="' + esc(pct(v, all) + " of ARPA dollars to disadvantaged communities, " + money(v) + " of " + money(all)) + '">' +
      '<span class="sb-dis" style="flex:' + share.toFixed(4) + ' 1 0"></span>' + (rest ? '<span class="sb-rest" style="flex:' + (1 - share).toFixed(4) + ' 1 0"></span>' : "") + "</div>" +
      (others.length ? '<p class="dis-fact">Their median grant is <strong>' + money(median(list.map(arpaOf))) + "</strong>, against " + money(median(others.map(arpaOf))) + " for other ARPA projects.</p>" : "") +
      '<p class="dis-basis">' + (META.disadvantagedBasis === "supplied" ? "Designation supplied by NHDES." : "Designation read from recipient names until NHDES supplies it.") + "</p></div>";
    el.innerHTML = '<div class="dis-grid">' + map + rows + stats + "</div>";
    // a row and its pin light together
    function light(n) { $$("[data-n]", el).forEach(function (x) { x.classList.toggle("on", n != null && x.dataset.n === n); }); }
    $$("[data-n]", el).forEach(function (x) {
      x.addEventListener("mouseenter", function () { light(x.dataset.n); });
      x.addEventListener("mouseleave", function () { light(null); });
      x.addEventListener("focusin", function () { light(x.dataset.n); });
      x.addEventListener("focusout", function () { light(null); });
    });
  }

  // ---------- explorer ----------
  var PAGE = 10, PAGE_MAX = 30, PAGE_STACKED = 10;
  function listRows() {
    var s = state.sort;
    return F.filter(function (p) { return !state.selTown || p.town === state.selTown; }).sort(function (a, b) {
      var x = s.key === "total" ? amt(a) : (a[s.key] || ""), y = s.key === "total" ? amt(b) : (b[s.key] || "");
      return (x < y ? -1 : x > y ? 1 : 0) * s.dir || a.id.localeCompare(b.id);
    });
  }
  // The list ends where the map ends: rows per page are fitted to the map column's
  // height, so the card never grows past the map and nothing scrolls inside it.
  function renderList() {
    var first = state.page * PAGE;           // keep the same first row across refits
    var cols = getComputedStyle($(".explore")).gridTemplateColumns.split(" ").length;
    if (cols < 2 || state.selProject) { if (cols < 2) PAGE = PAGE_STACKED; }
    else {
      var target = $(".explore-map").getBoundingClientRect().height, main = $(".explore-main");
      PAGE = PAGE_MAX;
      state.page = Math.floor(first / PAGE); drawList();
      while (PAGE > 3 && main.getBoundingClientRect().height > target) {
        PAGE--; state.page = Math.floor(first / PAGE); drawList();
      }
    }
    state.page = Math.floor(first / PAGE);
    var sp = state.selProject;
    if (sp) {                                 // keep an open project's row on the page
      var i = listRows().map(function (r) { return r.id; }).indexOf(sp);
      if (i >= 0) state.page = Math.floor(i / PAGE);
    }
    drawList();
  }
  function drawList() {
    var rows = listRows(), s = state.sort;
    $("#mixKey").innerHTML = activeSources().map(function (k) { return '<li><span class="sw" style="background:var(--src-' + k + ')"></span>' + esc(srcShort(k)) + "</li>"; }).join("");
    var lt = $("#listTour"); if (lt) lt.hidden = rows.length < 2;   // a tour needs at least two projects
    var pages = Math.max(1, Math.ceil(rows.length / PAGE));
    state.page = Math.min(state.page, pages - 1);
    var slice = rows.slice(state.page * PAGE, state.page * PAGE + PAGE);
    $("#listSub").textContent = (state.selTown ? state.selTown + ": " : "") + plural(rows.length, "project") + " · " + money(sum(rows, amt)) +
      (state.src.size ? " from the selected sources" : "") + ". Select a project for details, photos and video.";
    $$("#ptable th[data-sort]").forEach(function (th) {
      var on = th.dataset.sort === s.key || th.dataset.sortAlt === s.key;
      th.setAttribute("aria-sort", on ? (s.dir > 0 ? "ascending" : "descending") : "none");
      $$("button", th).forEach(function (b) { b.classList.toggle("is-sorted", on && (b.dataset.sortkey || th.dataset.sort) === s.key); });
    });
    $("#ptable tbody").innerHTML = slice.map(function (p) {
      var loc = p.town && p.locality && p.locality !== p.town ? esc(p.locality) + ' <span class="row-id">in ' + esc(p.town) + "</span>" : esc(p.town || p.locality);
      var on = p.id === state.selProject;
      var water = p.water.map(function (w) { return WATER_SHORT[w]; }).join(", ");
      // Funding mix: the project's dollars split by source, under its name.
      var t = amt(p), mixParts = activeSources().filter(function (k) { return p.amounts[k]; });
      var mix = t ? '<span class="row-mix">' + mixParts.map(function (k) {
        return '<span style="flex:' + (p.amounts[k] / t).toFixed(4) + " 1 0;background:var(--src-" + k + ')" data-tip="' +
          esc("<strong>" + esc(srcShort(k)) + "</strong>" + moneyFull(p.amounts[k]) + " · " + pct(p.amounts[k], t) + " of this project") + '"></span>';
      }).join("") + '<span class="sr-only">Funding mix: ' + esc(mixParts.map(function (k) { return srcShort(k) + " " + pct(p.amounts[k], t); }).join(", ")) + "</span></span>" : "";
      return '<tr data-row="' + esc(p.id) + '"' + (on ? ' class="is-sel"' : "") + '><td><button type="button" class="row-title" data-pid="' + esc(p.id) + '"' + (on ? ' aria-current="true"' : "") + ">" + esc(p.party) + "</button>" +
        '<span class="row-meta"><span class="row-when"><span class="row-id">' + esc(p.id) + '</span><span class="row-sep" aria-hidden="true"> · </span><span class="row-date">Committed ' + dateLong(p.date) + "</span></span>" +
        (p.disadvantaged ? '<span class="row-dis">Disadvantaged</span>' : "") + "</span>" + mix + "</td>" +
        "<td>" + loc + "</td>" +
        '<td><span class="cell-type">' + esc(catShort(p.category)) + "</span></td>" +
        '<td><span class="cell-icons" title="' + esc(water) + '">' + p.water.map(function (w) { return icon("i-" + WATER_KEY[w]); }).join("") +
        '<span class="sr-only">' + esc(water) + "</span></span></td>" +
        '<td class="num">' + moneyFull(amt(p)) + "</td></tr>";
    }).join("") || '<tr><td colspan="5" class="empty">No projects match these filters.</td></tr>';
    var pg = '<span>Page ' + (state.page + 1) + " of " + pages + '</span><button type="button" data-page="prev" aria-label="Previous page"' + (state.page ? "" : " disabled") + ">‹</button>";
    var lo = Math.max(0, Math.min(state.page - 2, pages - 5)), hi = Math.min(pages, lo + 5);
    for (var i = lo; i < hi; i++) pg += '<button type="button" data-page="' + i + '"' + (i === state.page ? ' aria-current="page"' : "") + ' aria-label="Page ' + (i + 1) + '">' + (i + 1) + "</button>";
    pg += '<button type="button" data-page="next" aria-label="Next page"' + (state.page < pages - 1 ? "" : " disabled") + ">›</button>";
    $("#pager").innerHTML = pg;
  }
  function wireList() {
    $$("#ptable th[data-sort] button").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.dataset.sortkey || b.parentNode.dataset.sort;
        state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (k === "total" || k === "date" ? -1 : 1) };
        state.page = 0; renderList();
      });
    });
    $("#pager").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || b.disabled) return;
      var v = b.dataset.page; state.page = v === "prev" ? state.page - 1 : v === "next" ? state.page + 1 : +v;
      renderList(); $("#ptable").scrollIntoView({ block: "nearest" });
    });
    $("#ptable tbody").addEventListener("click", function (e) {
      var tr = e.target.closest("tr[data-row]"); if (tr && !e.target.closest("button")) selectProject(tr.dataset.row, tr);
    });
    $("#csvBtn").addEventListener("click", downloadCsv);
    // The tour starts from the list too: it opens the first listed project and steps on from there.
    document.addEventListener("click", function (e) {   // the button is redrawn with the Statewide row
      if (!e.target.closest("#listTour")) return;
      var rows = listRows(); if (rows.length < 2) return;
      selectProject(rows[0].id, e.target);
      startTour();
    });
  }
  function downloadCsv() {
    var cols = ["Project Number", "Party", "City/Town", "County", "Executive Council District", "Senate District",
      "State House District", "Project Description", "Project Category", "Project Sub-Category", "Binding Commitment Date"]
      .concat(SRC.map(function (k) { return "Commitment Amount " + srcShort(k); })).concat(["Commitment Amount All Sources", "Disadvantaged"]);
    var q = function (v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [cols.join(",")].concat(F.map(function (p) {
      return [p.id, p.party, p.locality, p.county, p.ec.join(" "), p.sd.join(" "), p.hd.map(hdName).join("; "), p.description, p.category, p.water.join(" & "), p.date]
        .concat(SRC.map(function (k) { return p.amounts[k] || 0; })).concat([p.total, p.disadvantaged ? "Y" : "N"]).map(q).join(",");
    }));
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nh-water-funding-" + META.id + "-" + F.length + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ---------- chart table views ----------
  // Data tables never show an empty cell or a dash: screen readers voice those unevenly (guidelines 2.9).
  function cellText(c) { return c === "" || c === "–" || c == null ? "No value" : c; }
  function tableHtml(caption, head, rows) {
    return '<table class="dtable"><caption>' + esc(caption) + "</caption><thead><tr>" + head.map(function (h, i) {
      return '<th scope="col"' + (i ? ' class="num"' : "") + ">" + esc(h) + "</th>";
    }).join("") + "</tr></thead><tbody>" + rows.map(function (r) {
      return "<tr>" + r.map(cellText).map(function (c, i) { return i ? '<td class="num">' + c + "</td>" : '<th scope="row" style="font-weight:500;color:var(--ink);border-bottom:1px solid var(--grid)">' + c + "</th>"; }).join("") + "</tr>";
    }).join("") + "</tbody></table>";
  }
  function renderTable(card) {
    var chart = $(".chart", card), tv = $(".table-view", card), id = chart.id || ($("[id]", chart) || {}).id, html = "";
    if (id === "flowChart") {
      html = tableHtml("Dollars by funding source and water system", ["Funding source"].concat(WATER_GROUPS.map(function (g) { return WATER_SHORT[g]; })).concat(["All"]),
        activeSources().map(function (k) {
          var ls = flowData().filter(function (l) { return l.s === k; });
          return [esc(srcLabel(k))].concat(WATER_GROUPS.map(function (g) { var l = ls.filter(function (x) { return x.t === g; })[0]; return l ? moneyFull(l.v) : "–"; }))
            .concat([moneyFull(sum(ls, function (l) { return l.v; }))]);
        }).concat((function () {
          var fl = flowData(), all = sum(fl, function (l) { return l.v; });
          var byG = WATER_GROUPS.map(function (g) { return sum(fl.filter(function (l) { return l.t === g; }), function (l) { return l.v; }); });
          var nG = WATER_GROUPS.map(function (g) { return F.filter(function (p) { return waterGroup(p) === g && activeSources().some(function (k) { return p.amounts[k]; }); }).length; });
          return [["All sources"].concat(byG.map(moneyFull)).concat([moneyFull(all)]),
                  ["Share of dollars"].concat(byG.map(function (v) { return pct(v, all); })).concat([pct(all, all)]),
                  ["Projects"].concat(nG.map(num)).concat([num(sum(nG, function (n) { return n; }))])];
        })()));
    } else if (id === "srcChart") {
      var tot = sum(F, amt);
      html = tableHtml("Dollars by funding source", ["Funding source", "Dollars", "Share", "Projects"], activeSources().map(function (k) {
        var l = F.filter(function (p) { return p.amounts[k]; }), v = sum(l, function (p) { return p.amounts[k]; });
        return [esc(srcLabel(k)), moneyFull(v), pct(v, tot), num(l.length)];
      }));
    } else if (id === "catChart") {
      html = tableHtml("Project type", ["Type", "Projects", "Dollars"], catRows().map(function (r) { return [esc(r.c), num(r.n), moneyFull(r.v)]; }));
    } else if (id === "waterChart") {
      var wr = waterRows(), wt = sum(wr, function (r) { return r.v; });
      html = tableHtml("Water system", ["Water system", "Projects", "Dollars", "Share"], wr.map(function (r) { return [esc(WATER_SHORT[r.g]), num(r.n), moneyFull(r.v), pct(r.v, wt)]; }));
    } else if (id === "timeChart") {
      html = tableHtml("Dollars by " + state.timeStep, ["Period"].concat(activeSources().map(srcShort)).concat(["Total", "Projects"]), timeBuckets().map(function (b) {
        return [state.timeStep === "year" ? b.key : "Q" + b.q + " " + b.y].concat(activeSources().map(function (k) { return moneyFull(b.v[k]); })).concat([moneyFull(b.t), num(b.n)]);
      }));
    } else if (card.classList.contains("card-map")) {
      var T = townTotals();
      // Fits the column under the map: the county sits under each town's name, not in a column of its own.
      html = tableHtml("Funding by town", ["Town", "Council district", "Projects", "Funding"], Object.keys(T).sort().map(function (n) {
        var t = GEO.towns.filter(function (x) { return x.n === n; })[0];
        return [esc(n) + '<span class="tt-county">' + esc(t.c) + " County</span>", t.ec.join(", "), num(T[n].n), moneyFull(T[n].v)];
      })).replace('<table class="dtable">', '<table class="dtable town-table">');
    } else if (id === "glChart") {
      var glBy = state.glBy === "water" ? "Water system" : "Project type";
      html = tableHtml("Grants and loans by funding source", ["Funding source", "Classed as", "Projects", "Dollars"], activeSources().map(function (k) {
        var l = F.filter(function (p) { return p.amounts[k]; });
        return [esc(srcLabel(k)), ({ grant: "Grant", loan: "Loan" })[GL_OF[k] || "loan"], num(l.length), moneyFull(sum(l, function (p) { return p.amounts[k]; }))];
      })) + tableHtml("Grants and loans by " + glBy.toLowerCase(), [glBy, "Grants", "Loans", "Total"], glGroups().map(function (g) {
        return [esc(g.full), moneyFull(g.t.grant), moneyFull(g.t.loan), moneyFull(g.v)];
      }));
    } else if (id === "arpaChart") {
      html = tableHtml("ARPA projects", ["Recipient", "Town", "Project type", "Water system", "ARPA grant", "Other funding", "Whole project"], arpaProjects().map(function (p) {
        return [esc(p.party), esc(p.town), esc(catShort(p.category)), esc(WATER_SHORT[waterGroup(p)]), moneyFull(arpaOf(p)), moneyFull(amt(p) - arpaOf(p)), moneyFull(amt(p))];
      }));
    } else if (id === "disChart") {
      html = tableHtml("Disadvantaged-community projects", ["Recipient", "Town", "Water system", "What was built", "ARPA grant"], disList().map(function (p) {
        var w = worksFor(p);
        return [esc(p.party), esc(p.town), esc(WATER_SHORT[waterGroup(p)]), esc(w.length ? w.map(function (x) { return x.l; }).join(", ") : firstSentence(p.description)), moneyFull(arpaOf(p))];
      }));
    }
    tv.innerHTML = html;
  }

  // ---------- project detail, inline beside the map ----------
  // ---------- tour: the project window steps through every listed project ----------
  // Every 3.5 seconds the next project in the list opens (after the last, the first again).
  // WCAG 2.2.2: the same button stops it, and so does Escape or any other choice the
  // visitor makes (Back, Previous / Next, another project, a filter). Focus stays on the
  // button and the page does not scroll; each new project is announced politely.
  var TOUR_MS = 3500, tourTimer = null;
  function startTour() {
    if (listRows().length < 2) return;
    state.tour = true;
    renderDetail(); tourFocus();
    announceTour("Tour started. A new project opens every 3.5 seconds. ");
    tourTimer = setTimeout(tourStep, TOUR_MS);
  }
  function stopTour(quiet) {
    if (!state.tour) return;
    state.tour = false; clearTimeout(tourTimer);
    $("#tourLive").textContent = "Tour stopped.";
    if (!quiet) { renderDetail(); tourFocus(); }
  }
  function tourStep() {
    var ids = listRows().map(function (r) { return r.id; });
    if (!state.tour || ids.length < 2) { stopTour(); return; }
    var i = ids.indexOf(state.selProject), pid = ids[(i + 1) % ids.length];
    var keep = $("#projectDetail").contains(document.activeElement);
    state.selProject = pid;
    state.page = Math.floor(ids.indexOf(pid) / PAGE);
    renderMap(); renderDetail(); renderList();
    if (keep) tourFocus();
    announceTour("");
    tourTimer = setTimeout(tourStep, TOUR_MS);
  }
  function tourFocus() { var b = $("#pdTour"); if (b) b.focus({ preventScroll: true }); }
  function announceTour(pre) {
    var ids = listRows().map(function (r) { return r.id; }), p = BY_ID[state.selProject];
    $("#tourLive").textContent = pre + "Project " + (ids.indexOf(p.id) + 1) + " of " + ids.length + ": " + p.party + ", " + p.town + ".";
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.tour) stopTour(); });

  function selectProject(pid, from) {
    stopTour(true);
    var p = BY_ID[pid]; if (!p) return;
    state.selProject = pid;
    if (state.selTown && p.town !== state.selTown) state.selTown = null;
    // Show the page of the list that holds the project.
    var i = listRows().map(function (r) { return r.id; }).indexOf(pid);
    if (i >= 0) state.page = Math.floor(i / PAGE);
    renderMap(); renderDetail(); renderList();
    // Bring the detail into view when it opened off-screen (a chart higher up, or the
    // map on a phone, where the detail sits below it).
    var d = $("#projectDetail"), r = d.getBoundingClientRect();
    if (r.top < 60 || r.top > innerHeight * 0.6) d.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    var h = $("#pdTitle"); if (h) h.focus({ preventScroll: true });
  }
  function closeProject() {
    stopTour(true);
    var pid = state.selProject;
    state.selProject = null;
    renderMap(); renderDetail(); renderList();
    var b = $$("#ptable [data-pid]").filter(function (x) { return x.getAttribute("data-pid") === pid; })[0];
    if (b) b.focus();
  }
  // A media slot is a button: it opens the photo or video large (openMedia). Until NHDES
  // sends files it shows a placeholder; a real item adds data-src (and, for a video, a
  // caption track and transcript link), and the pop-up then shows the file itself.
  function mediaSlot(kind, label, note) {
    return '<button type="button" class="media-slot" data-kind="' + kind + '" data-label="' + esc(label) + '" aria-haspopup="dialog" aria-label="' + esc(label + (kind === "video" ? " video" : " photo") + ": open larger") + '">' +
      '<span class="ms-cap"><strong>' + esc(label) + "</strong>" + note + "</span></button>";
  }

  // ---------- media pop-up ----------
  var mediaSet = [], mediaAt = 0, mediaFrom = null;
  function openMedia(slot) {
    if (state.tour) {                      // stop the tour and redraw its button; find the same slot again
      var all = $$("#projectDetail .media-slot"), k = all.indexOf(slot);
      stopTour(true); renderDetail();
      if (k >= 0) slot = $$("#projectDetail .media-slot")[k];
    }
    var group = slot.closest(".d-media, .dis-card") || slot.parentNode;
    mediaSet = $$(".media-slot", group);
    mediaAt = Math.max(0, mediaSet.indexOf(slot));
    var t = slot.closest(".pdetail") ? $("#pdTitle") : $("h3", group);
    $("#mediaDlg").dataset.project = t ? t.textContent : "";
    mediaFrom = slot;
    showMedia();
    $("#mediaDlg").showModal();
  }
  function showMedia() {
    var m = mediaSet[mediaAt], kind = m.dataset.kind, label = m.dataset.label, video = kind === "video", src = m.dataset.src;
    var name = /photo|video/i.test(label) ? label : label + (video ? " video" : " photo");
    $("#h-media").textContent = name;
    $("#mediaSub").textContent = $("#mediaDlg").dataset.project;
    $("#mediaStage").innerHTML = src
      ? (video ? '<video controls preload="metadata" src="' + esc(src) + '">' + (m.dataset.captions ? '<track kind="captions" srclang="en" label="English" src="' + esc(m.dataset.captions) + '" default>' : "") + "</video>" +
                 (m.dataset.transcript ? '<p><a href="' + esc(m.dataset.transcript) + '">Read the transcript</a></p>' : "")
               : '<img src="' + esc(src) + '" alt="' + esc(m.dataset.alt || "") + '">')
      : '<div class="media-ph">' +
        "<p><strong>" + esc(name) + "</strong></p><p>" +
        (video ? "The NHDES video (.mp4) plays here, with captions and a link to its transcript."
               : "The NHDES photo (.jpg) shows here at full size, with its alt text.") + "</p></div>";
    $("#mediaCount").textContent = (mediaAt + 1) + " of " + mediaSet.length;
    $("#mediaPrev").disabled = mediaAt === 0;
    $("#mediaNext").disabled = mediaAt === mediaSet.length - 1;
    $(".media-nav").hidden = mediaSet.length < 2;
  }
  function stepMedia(d) {
    var n = mediaAt + d; if (n < 0 || n >= mediaSet.length) return;
    mediaAt = n; showMedia();
  }
  (function wireMedia() {
    var dlg = $("#mediaDlg");
    // Close and hand focus back directly, not only from the "close" event (which the
    // browser queues, and may not fire before the next focus change).
    function closeMedia() { if (dlg.open) dlg.close(); afterClose(); }
    $("#mediaClose").addEventListener("click", closeMedia);
    dlg.addEventListener("click", function (e) { if (e.target === dlg) closeMedia(); });
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeMedia(); });   // Escape
    $("#mediaPrev").addEventListener("click", function () { stepMedia(-1); if (this.disabled) $("#mediaNext").focus(); });
    $("#mediaNext").addEventListener("click", function () { stepMedia(1); if (this.disabled) $("#mediaPrev").focus(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); stepMedia(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); stepMedia(1); }
    });
    // Back to the slot that opened it, or to the one now showing when it is still on the page.
    function afterClose() {
      var v = $("video", dlg); if (v) v.pause();
      var at = mediaSet[mediaAt], back = at && document.contains(at) ? at : mediaFrom;
      if (back && document.contains(back) && document.activeElement !== back) back.focus();
    }
    dlg.addEventListener("close", afterClose);
    document.addEventListener("click", function (e) { var ms = e.target.closest(".media-slot"); if (ms) { hideTip(); openMedia(ms); } });
  })();
  // Keep the open project within the map's height: first compact the media, then
  // clamp a long narrative behind "Show more" (a reader's choice may exceed it).
  function fitDetail() {
    var el = $("#projectDetail"), main = $(".explore-main");
    el.classList.remove("compact", "clamped");
    if (getComputedStyle($(".explore")).gridTemplateColumns.split(" ").length < 2) return;
    var target = $(".explore-map").getBoundingClientRect().height;
    function over() { return main.getBoundingClientRect().height > target + 1; }
    if (over()) el.classList.add("compact");
    var narr = $(".d-narr", el);
    if (over() && narr) {
      el.classList.add("clamped");
      var more = document.createElement("button");
      more.type = "button"; more.className = "link-btn more-btn"; more.textContent = "Show more";
      more.setAttribute("aria-expanded", "false");
      more.addEventListener("click", function () {
        var open = el.classList.toggle("clamped") === false;
        more.textContent = open ? "Show less" : "Show more"; more.setAttribute("aria-expanded", open);
      });
      narr.insertAdjacentElement("afterend", more);
      if (narr.scrollHeight <= narr.clientHeight + 1) more.remove();   // short text: nothing hidden
    }
  }
  function renderDetail() {
    var el = $("#projectDetail"), p = state.selProject && BY_ID[state.selProject];
    $(".explore-main").classList.toggle("has-detail", !!p);
    el.classList.toggle("is-touring", !!p && state.tour);
    if (!p) { el.hidden = true; el.innerHTML = ""; return; }
    var town = GEO.towns.filter(function (t) { return t.n === p.town; })[0];
    var srcs = SRC.filter(function (k) { return p.amounts[k]; });
    el.hidden = false;
    var many = listRows().length > 1;
    el.innerHTML = (state.tour ? '<div class="tour-progress" aria-hidden="true"><span></span></div>' : "") +
      '<div class="pd-top"><button type="button" class="link-btn pd-back" id="pdClose">Back to the list</button>' +
      (many ? '<button type="button" class="btn-tour" id="pdTour" aria-pressed="' + state.tour + '">' +
        (state.tour ? "Stop the tour" : "Take the tour") + "</button>" : "") + "</div>" +
      '<div class="d-head"><div><p class="d-kicker"><span class="tag">' + esc(catShort(p.category)) + "</span>" +
      p.water.map(function (w) { return '<span class="tag">' + icon("i-" + WATER_KEY[w]) + esc(WATER_SHORT[w]) + "</span>"; }).join("") +
      (p.disadvantaged ? '<span class="tag">Disadvantaged community</span>' : "") + "</p>" +
      '<h3 class="d-title" id="pdTitle" tabindex="-1">' + esc(p.party) + "</h3>" +
      // place line: town, county and districts, so the window needs no separate facts box
      '<p class="card-sub d-where"><span class="d-dist">' + esc(p.locality) + (p.locality !== p.town ? " (" + esc(p.town) + ")" : "") + ", " + esc(p.county) + " County</span>" +
      (town ? '<span class="d-dist"><span aria-hidden="true"> · </span>Council District ' + town.ec.join(", ") + '</span><span class="d-dist"><span aria-hidden="true"> · </span>' +
        (town.sd.length > 1 ? "Senate Districts " + town.sd.join(", ") + " (split town)" : "Senate District " + town.sd[0]) + "</span>" +
        '<span class="d-dist"><span aria-hidden="true"> · </span>' + hdText(town) + "</span>" : "") +
      "</p></div>" +
      '<div class="pd-nav">' + (function () {
        var ids = listRows().map(function (r) { return r.id; }), i = ids.indexOf(p.id);
        return '<button type="button" class="btn-ghost btn-sm" id="pdPrev"' + (i > 0 ? ' data-to="' + esc(ids[i - 1]) + '"' : " disabled") + ' aria-label="Previous project">‹</button>' +
          '<span class="count">' + (i >= 0 ? (i + 1) + " of " + ids.length : "") + "</span>" +
          '<button type="button" class="btn-ghost btn-sm" id="pdNext"' + (i >= 0 && i < ids.length - 1 ? ' data-to="' + esc(ids[i + 1]) + '"' : " disabled") + ' aria-label="Next project">›</button>';
      })() + "</div></div>" +
      // Funding across the full width of the window, then the NHDES narrative.
      '<div class="d-grid">' +
      '<section class="d-fund" aria-label="Funding"><p class="kpi-label">Committed ' + dateLong(p.date) + " · Project " + esc(p.id) + '</p><p class="d-amt">' + moneyFull(p.total) + "</p>" +
      '<div class="stack" role="img" aria-label="' + esc(srcs.map(function (k) { return srcShort(k) + " " + pct(p.amounts[k], p.total); }).join(", ")) + '">' +
      srcs.map(function (k) { return '<span style="flex-grow:' + p.amounts[k] + ";background:var(--src-" + k + ')"></span>'; }).join("") + "</div>" +
      // one line of sources under the bar, by acronym (spelled out in the hero chart and in
      // About); the full name is the item's title and is read by screen readers
      '<ul class="d-sources">' + srcs.map(function (k) {
        return '<li title="' + esc(srcLabel(k)) + '">' + srcDot(k) + '<abbr title="' + esc(srcLabel(k)) + '">' + esc(srcShort(k)) + '</abbr><span class="sr-only"> (' + esc(srcLabel(k)) + ')</span><span class="v">' + moneyFull(p.amounts[k]) + "</span></li>";
      }).join("") + "</ul></section></div>" +
      '<p class="d-narr">' + esc(p.description) + "</p>" +
      '<div class="d-media"><div class="media-row">' +
      mediaSlot("photo", "Before", "Photo from NHDES (.jpg), with alt text") + mediaSlot("photo", "Construction", "Photo from NHDES (.jpg), with alt text") + mediaSlot("video", "Video", "From NHDES (.mp4), with captions and a transcript") +
      // second row: the finished work, and a second video (A15: three to six photos, one or two videos)
      '</div><div class="media-row">' +
      mediaSlot("photo", "After", "Photo from NHDES (.jpg), with alt text") + mediaSlot("photo", "After 2", "Photo from NHDES (.jpg), with alt text") + mediaSlot("video", "Video 2", "From NHDES (.mp4), with captions and a transcript") +
      '</div></div>';
    fitDetail();
    $("#pdClose").addEventListener("click", closeProject);
    var tb = $("#pdTour"); if (tb) tb.addEventListener("click", function () { if (state.tour) stopTour(); else startTour(); });
    ["#pdPrev", "#pdNext"].forEach(function (sel) {
      var b = $(sel); if (b.dataset.to) b.addEventListener("click", function () { selectProject(b.dataset.to, b); var n = $(sel); if (n && !n.disabled) n.focus(); });
    });
  }

  // ---------- about ----------
  function renderAbout() {
    var total = sum(P, function (p) { return p.total; }), towns = new Set(P.map(function (p) { return p.town; }));
    var notice = META.kind === "illustrative"
      ? "<strong>Illustrative data.</strong> Town names are real; every recipient, amount, date and narrative is invented to show the dashboard at full scale."
      : "<strong>Data provided by NHDES with RFP DES 2026-23 Addendum 4 on September 25, 2026.</strong> This is a partial sample for illustration only.";
    var stats = [
      [num(P.length), "projects"],
      [money(total), "committed"],
      [num(towns.size), towns.size === 1 ? "community" : "communities"],
      [monthYear(META.dateRange[0]) + " – " + monthYear(META.dateRange[1]), "commitment dates"]
    ];
    var notes = [
      "<strong>Amounts are binding commitments:</strong> the dollars NHDES has agreed to provide, not necessarily what has been spent yet.",
      "<strong>A project with several funding sources</strong> counts toward each one, so source totals can add up to more than the projects' total.",
      "<strong>Map locations are approximate.</strong> Each project is shown in its town or village until NHDES provides street addresses.",
      "<strong>State House districts</strong> are matched by town. A project in a city split into several House districts, such as Manchester or Concord, is counted in each of them until NHDES provides street addresses."
    ];
    if (META.disadvantagedBasis !== "supplied")
      notes.push("<strong>Disadvantaged communities</strong> are identified from recipient names for now; NHDES will supply the official designation.");
    $("#aboutData").innerHTML = '<p class="ab-notice">' + notice + "</p>" +
      '<section class="ab-block" aria-labelledby="ab-glance"><h3 id="ab-glance">At a glance</h3><ul class="ab-stats">' +
      stats.map(function (x) { return '<li><span class="ab-big">' + esc(x[0]) + '</span><span class="ab-lbl">' + esc(x[1]) + "</span></li>"; }).join("") +
      '</ul><p class="ab-asof">Data as of ' + dateLong(META.ingested) + ".</p></section>" +
      '<section class="ab-block" aria-labelledby="ab-notes"><h3 id="ab-notes">Good to know</h3><ul class="ab-notes">' +
      notes.map(function (n) { return "<li>" + n + "</li>"; }).join("") + "</ul></section>";
  }

  // ---------- orchestration ----------
  function renderCharts() {
    renderHero(); renderSources(); renderCategories(); renderMap(); renderArpa(); renderTime();
    $$("[data-view='table']").forEach(renderTable);
  }
  function update() {
    stopTour(true);
    state.page = 0;
    applyFilters();
    syncControls();
    renderKpis();
    renderActive();
    if (state.selProject && !F.some(function (p) { return p.id === state.selProject; })) state.selProject = null;
    renderCharts();
    renderDetail();
    renderList();
  }
  function loadDataset(id, push) {
    if (!DATA[id]) id = Object.keys(DATA)[0];
    state.ds = id; D = DATA[id]; META = D.meta; P = D.projects;
    BY_ID = {}; P.forEach(function (p) { BY_ID[p.id] = p; });
    // House districts come from the town (NHDES does not supply them); a city split by ward lists each one
    P.forEach(function (p) { var t = TOWN_BY[p.town]; p.hd = t ? t.hd : []; });
    buildControls();
    resetFilters();
    renderAbout();
    update();
  }

  wireControls();
  wireDrawer();
  wireList();
  loadDataset("sample");
})();
