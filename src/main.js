/* =====================================================================
   Brothers in Blue — 501st Roleplay
   Loading Screen · Ablauflogik

   Aenderungen an Texten gehoeren in public/config.js, nicht hierher.
   ===================================================================== */

import "./style.css";

(function () {
"use strict";

var CFG = window.BIB_CONFIG || {};
var $  = function (id) { return document.getElementById(id); };

/* Zustand */
var state = {
  filesTotal:   0,
  filesNeeded:  0,
  haveTotals:   false,
  transferDone: false,   // true, sobald GMod die Lua-Ladephase meldet
  gmodSeen:     false,   // true, sobald GMod irgendeinen Callback gefeuert hat
  steamid:      null,
  view:         "briefing",
  rotateTimer:  null,
  rotatePaused: 0,
  tipIndex:     0
};

/* =====================================================================
   1 · INHALTE AUS DER KONFIGURATION AUFBAUEN
   ===================================================================== */

function buildStaticContent() {

  /* Servername / Untertitel */
  if (CFG.server) {
    if (CFG.server.name) $("brand-name").textContent = CFG.server.name;
    if (CFG.server.sub)  $("brand-sub").innerHTML   = CFG.server.sub;
    if (CFG.server.fallbackHostname) $("wt-server").textContent = CFG.server.fallbackHostname;
  }

  /* Dienstvorschrift */
  var rules = $("rules-list");
  (CFG.rules || []).forEach(function (r) {
    var li = document.createElement("li");
    li.innerHTML = r;
    rules.appendChild(li);
  });

  /* Aenderungsprotokoll */
  var cl = $("changelog-list");
  (CFG.changelog || []).forEach(function (c) {
    var li = document.createElement("li");
    li.innerHTML = (c.tag ? "<em>" + esc(c.tag) + "</em>" : "") + esc(c.text || "");
    cl.appendChild(li);
  });

  /* Funknetz */
  if (CFG.discord) {
    if (CFG.discord.label) $("discord-link").textContent = CFG.discord.label;
    if (CFG.discord.qr) {
      var slot = $("qr-slot");
      slot.innerHTML = "";
      var img = document.createElement("img");
      img.src = CFG.discord.qr;
      img.alt = "Discord QR-Code";
      img.onerror = function () { slot.innerHTML = "<span>QR</span>"; };
      slot.appendChild(img);
    }
  }

  /* Tipp-Punkte */
  var dots = $("tip-dots");
  (CFG.tips || []).forEach(function (_, i) {
    var d = document.createElement("i");
    if (i === 0) d.className = "on";
    dots.appendChild(d);
  });
  if ((CFG.tips || []).length) $("tip-text").innerHTML = CFG.tips[0];

  buildStructure();
}

/* ---------- View 2: Kompaniestruktur ---------- */
function buildStructure() {
  var st = CFG.structure;
  if (!st) return;

  /* Kompanieführung */
  if (st.hq) {
    var hq = document.querySelector(".hq-text");
    hq.innerHTML =
      '<span class="hq-abbr">' + esc(st.hq.abbr || "") + "</span>" +
      "<h3>" + esc(st.hq.name || "") + "</h3>" +
      "<p>"  + esc(st.hq.role || "") + "</p>";
  }

  /* Zuege */
  var wrap = $("platoons");
  var list = st.platoons || [];

  list.forEach(function (p) {
    var card = document.createElement("article");
    card.className = "panel pl-card";
    card.style.setProperty("--c", p.color || "var(--blue-br)");

    var duties = (p.duties || []).map(function (d) {
      return "<li>" + esc(d) + "</li>";
    }).join("");

    card.innerHTML =
      '<div class="corner tl"></div><div class="corner br"></div>' +
      '<div class="pl-head">' +
        '<span class="pl-badge">' + esc(p.badge || "") + "</span>" +
        '<span class="pl-ord">'   + esc(p.ord   || "") + "</span>" +
      "</div>" +
      "<h4>" + esc(p.name || "") + "</h4>" +
      '<p class="pl-full">' + esc(p.full || "") + "</p>" +
      '<p class="pl-role">' + esc(p.role || "") + "</p>" +
      '<ul class="pl-duties">' + duties + "</ul>" +
      '<div class="pl-strength">' +
        "<label>" + esc(p.strengthLabel || "Schwerpunkt") + "</label>" +
        "<b>" + esc(p.strength || "") + "</b>" +
      "</div>";

    wrap.appendChild(card);
  });

  /* Verbindungslinien passend zur Anzahl der Zuege setzen */
  var drops = $("conn-drops");
  var n = list.length;
  for (var i = 0; i < n; i++) {
    var bar = document.createElement("i");
    bar.style.left = ((i + 0.5) * (100 / n)) + "%";
    drops.appendChild(bar);
  }
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* =====================================================================
   2 · ANSICHTSWECHSEL
   ===================================================================== */

function setView(name, manual) {
  if (name === state.view) return;
  state.view = name;

  document.querySelectorAll(".view").forEach(function (v) {
    v.classList.toggle("is-active", v.id === "view-" + name);
  });
  document.querySelectorAll(".tab").forEach(function (t) {
    t.classList.toggle("is-active", t.dataset.view === name);
  });

  moveMarker();

  if (manual) {
    var p = (CFG.views && CFG.views.pauseAfterClick) || 45;
    state.rotatePaused = Date.now() + p * 1000;
  }
}

function moveMarker() {
  var active = document.querySelector(".tab.is-active");
  var marker = $("tab-marker");
  if (!active || !marker) return;
  marker.style.left  = active.offsetLeft + "px";
  marker.style.width = active.offsetWidth + "px";
}

function initViews() {
  $("tabs").addEventListener("click", function (e) {
    var tab = e.target.closest(".tab");
    if (tab) setView(tab.dataset.view, true);
  });

  moveMarker();
  window.addEventListener("resize", moveMarker);

  var v = CFG.views || {};
  if (v.autoRotate !== false) {
    var every = (v.rotateSeconds || 18) * 1000;
    state.rotateTimer = setInterval(function () {
      if (Date.now() < state.rotatePaused) return;
      setView(state.view === "briefing" ? "structure" : "briefing", false);
    }, every);
  }
}

/* =====================================================================
   3 · FELDHINWEISE ROTIEREN
   ===================================================================== */

function initTips() {
  var tips = CFG.tips || [];
  if (tips.length < 2) return;

  var box  = $("tip-box");
  var text = $("tip-text");
  var dots = $("tip-dots").children;

  setInterval(function () {
    box.classList.add("is-swap");
    setTimeout(function () {
      state.tipIndex = (state.tipIndex + 1) % tips.length;
      text.innerHTML = tips[state.tipIndex];
      for (var i = 0; i < dots.length; i++) {
        dots[i].className = (i === state.tipIndex) ? "on" : "";
      }
      box.classList.remove("is-swap");
    }, 320);
  }, (CFG.tipSeconds || 9) * 1000);
}

/* =====================================================================
   4 · FORTSCHRITTSANZEIGE
   ===================================================================== */

function renderProgress() {
  var bar  = $("bar");
  var fill = $("bar-fill");
  var pct  = $("pct");
  var cnt  = $("files-count");

  /* Transfer durch, aber nie Dateizahlen bekommen -> voll statt
     endlos wandernder Balken. */
  if (state.transferDone && (!state.haveTotals || state.filesTotal <= 0)) {
    bar.classList.remove("indeterminate");
    fill.style.width = "100%";
    pct.innerHTML = "100<i>%</i>";
    cnt.textContent = "";
    return;
  }

  if (!state.haveTotals || state.filesTotal <= 0) {
    bar.classList.add("indeterminate");
    pct.innerHTML = "--<i>%</i>";
    cnt.textContent = "";
    return;
  }

  bar.classList.remove("indeterminate");

  var done = state.filesTotal - state.filesNeeded;
  if (done < 0) done = 0;
  if (done > state.filesTotal) done = state.filesTotal;

  var p = Math.round((done / state.filesTotal) * 100);
  if (p < 0) p = 0;
  if (p > 100) p = 100;

  fill.style.width = p + "%";
  pct.innerHTML = p + "<i>%</i>";
  cnt.textContent = done.toLocaleString("de-DE") + " / " +
                    state.filesTotal.toLocaleString("de-DE") + " Dateien";
}

/* GMod liefert englische Statustexte. Bekannte uebersetzen,
   unbekannte unveraendert durchreichen. */
var STATUS_MAP = [
  [/workshop/i,                    "Workshop-Inhalte werden geladen…"],
  [/download/i,                    "Serverinhalte werden übertragen…"],
  [/lua/i,                         "Gamemode wird initialisiert…"],
  [/client\s*info/i,               "Clientdaten werden übermittelt…"],
  [/server\s*info/i,               "Serverdaten werden abgerufen…"],
  [/map|level/i,                   "Sektor wird geladen…"],
  [/connect/i,                     "Verbindung wird hergestellt…"],
  [/sign|auth/i,                   "Authentifizierung läuft…"]
];

function translateStatus(s) {
  if (!s) return null;
  for (var i = 0; i < STATUS_MAP.length; i++) {
    if (STATUS_MAP[i][0].test(s)) return STATUS_MAP[i][1];
  }
  return s;
}

function setStatus(text) {
  var el = $("status");
  var t  = translateStatus(text);
  if (t && t !== el.textContent) el.textContent = t;
}

function setFileName(name) {
  if (!name) return;
  // Nur die letzten Pfadbestandteile zeigen, sonst wird es unleserlich
  var short = String(name).split(/[\\/]/).slice(-2).join("/");
  $("file").textContent = short;
}

/* =====================================================================
   5 · GMOD-CALLBACKS
   Diese Funktionen ruft der Client auf. Namen und Reihenfolge sind
   von GMod vorgegeben — nicht umbenennen.
   ===================================================================== */

/* Wird am Anfang jedes Callbacks aufgerufen. Stammt der Aufruf aus der
   Simulation, passiert nichts — sonst wird die Simulation beendet. */
function fromGMod() {
  if (inMock) return;
  state.gmodSeen = true;
  stopMock();
}

window.GameDetails = function (servername, serverurl, mapname, maxplayers,
                               steamid, gamemode, volume, language) {
  fromGMod();

  if (servername) $("wt-server").textContent = servername;
  if (mapname)    $("stat-map").textContent  = prettyMap(mapname);
  if (maxplayers) $("stat-slots").textContent = maxplayers;

  if (steamid) {
    state.steamid = String(steamid);
    $("id-num").textContent = state.steamid.slice(-4);
    fetchPlayer(state.steamid);
  }

  // Spiellautstaerke des Clients respektieren (0.0 - 1.0)
  if (typeof volume === "number" && !isNaN(volume)) {
    Audio501.setGameVolume(volume);
  }

  setStatus("Verbindung wird hergestellt…");
};

window.SetFilesTotal = function (total) {
  fromGMod();
  var n = parseInt(total, 10);
  if (!isNaN(n) && n > 0) {
    state.filesTotal  = n;
    state.filesNeeded = n;
    state.haveTotals  = true;
  }
  renderProgress();
};

window.SetFilesNeeded = function (needed) {
  fromGMod();
  var n = parseInt(needed, 10);
  if (!isNaN(n)) {
    state.filesNeeded = n;
    if (n > state.filesTotal) { state.filesTotal = n; state.haveTotals = true; }
  }
  renderProgress();
};

window.DownloadingFile = function (fileName) {
  fromGMod();
  setFileName(fileName);
  setStatus("Serverinhalte werden übertragen…");
};

window.SetStatusChanged = function (status) {
  fromGMod();

  /* "Starting Lua..." bedeutet: der Dateitransfer ist abgeschlossen.
     GMod ruft SetFilesNeeded(0) nicht verlaesslich auf — ohne diesen
     Abgleich stuende der Balken waehrend der laengsten Ladephase
     weiter bei 0%. */
  if (status && /lua/i.test(String(status))) {
    if (state.haveTotals) {
      state.filesNeeded = 0;
    }
    state.transferDone = true;
    renderProgress();
  }

  setStatus(status);
};

function prettyMap(m) {
  return String(m).replace(/^(rp|gm|ttt|de|cs)_/i, "").replace(/_/g, " ");
}

/* =====================================================================
   6 · MUSIK
   ===================================================================== */

var Audio501 = (function () {

  var cfg      = CFG.audio || {};
  var el       = $("player");
  var queue    = [];
  var index    = 0;
  var muted    = false;
  var userVol  = (typeof cfg.baseVolume === "number") ? cfg.baseVolume : 0.35;
  var gameVol  = 1;
  var fadeTimer= null;
  var started  = false;

  function targetVolume() {
    return muted ? 0 : Math.max(0, Math.min(1, userVol * gameVol));
  }

  function fadeTo(v, ms, done) {
    clearInterval(fadeTimer);
    var from  = el.volume;
    var steps = Math.max(1, Math.round((ms || 800) / 40));
    var i     = 0;
    fadeTimer = setInterval(function () {
      i++;
      var t = i / steps;
      el.volume = Math.max(0, Math.min(1, from + (v - from) * t));
      if (i >= steps) {
        clearInterval(fadeTimer);
        if (done) done();
      }
    }, 40);
  }

  function label(track) {
    if (!track) return "—";
    return track.artist ? track.artist + " — " + track.title : track.title;
  }

  function play(i) {
    if (!queue.length) return;
    index = ((i % queue.length) + queue.length) % queue.length;
    var t = queue[index];

    el.src    = t.src;
    el.volume = 0;
    $("track-title").textContent = label(t);

    var p = el.play();
    if (p && typeof p.catch === "function") {
      p.then(function () {
        started = true;
        hideNudge();
        fadeTo(targetVolume(), cfg.fadeMs || 1200);
      }).catch(function () {
        // Autoplay blockiert — auf die erste Nutzerinteraktion warten
        showNudge();
      });
    }
  }

  function next() {
    if (!queue.length) return;
    if (index + 1 >= queue.length && cfg.loop === false) return;
    play(index + 1);
  }

  function showNudge() {
    var n = $("audio-nudge");
    if (!n || started) return;
    n.hidden = false;
  }
  function hideNudge() {
    var n = $("audio-nudge");
    if (n) n.hidden = true;
  }

  function init() {
    var tracks = (cfg.tracks || []).filter(function (t) { return t && t.src; });

    if (cfg.enabled === false || !tracks.length) {
      // Keine Musik konfiguriert -> Bedienelemente ausblenden
      var dock = $("audio-dock");
      if (dock) dock.hidden = true;
      return;
    }

    queue = tracks.slice();
    if (cfg.shuffle) {
      for (var i = queue.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = queue[i]; queue[i] = queue[j]; queue[j] = tmp;
      }
    }

    el.addEventListener("ended", next);
    el.addEventListener("error", function () {
      // Defekte oder fehlende Datei ueberspringen, nicht haengenbleiben
      if (queue.length > 1) setTimeout(next, 400);
      else $("track-title").textContent = "Titel nicht ladbar";
    });

    /* Bedienelemente */
    var slider = $("volume");
    slider.value = Math.round(userVol * 100);
    slider.addEventListener("input", function () {
      userVol = slider.value / 100;
      if (muted && userVol > 0) toggle(false);
      el.volume = targetVolume();
    });

    $("audio-toggle").addEventListener("click", function () { toggle(); });

    /* Erste Nutzerinteraktion loest blockiertes Autoplay aus */
    ["click", "keydown", "mousedown"].forEach(function (ev) {
      document.addEventListener(ev, function once() {
        document.removeEventListener(ev, once);
        if (!started && !muted) play(index);
      }, { once: true });
    });

    play(0);
  }

  function toggle(force) {
    muted = (typeof force === "boolean") ? force : !muted;
    $("audio-toggle").classList.toggle("is-muted", muted);
    fadeTo(targetVolume(), 350);
    if (!muted && !started) play(index);
  }

  return {
    init: init,
    setGameVolume: function (v) {
      gameVol = Math.max(0, Math.min(1, v));
      if (started) el.volume = targetVolume();
    }
  };
})();

/* =====================================================================
   7 · PERSONALISIERUNG   (optional)
   ===================================================================== */

function fetchPlayer(steamid) {
  var api = CFG.api || {};
  if (!api.playerEndpoint) return;

  var url = api.playerEndpoint +
            (api.playerEndpoint.indexOf("?") >= 0 ? "&" : "?") +
            "steamid=" + encodeURIComponent(steamid);

  var done = false;
  var timer = setTimeout(function () { done = true; }, api.timeoutMs || 4000);

  fetch(url, { credentials: "omit" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      clearTimeout(timer);
      if (done || !data) return;
      applyPlayer(data);
    })
    .catch(function () { clearTimeout(timer); /* still ignorieren */ });
}

function applyPlayer(d) {
  if (d.name) {
    $("welcome-line").textContent =
      (d.returning ? "Willkommen zurück, " : "Willkommen an Bord, ") + d.name + ".";
  }

  if (d.avatar) {
    var a = $("avatar");
    var img = document.createElement("img");
    img.src = d.avatar;
    img.alt = "";
    img.onload  = function () { a.innerHTML = ""; a.appendChild(img); };
    img.onerror = function () { /* Helm-Platzhalter behalten */ };
  }

  var map = { unit: d.unit, rank: d.rank, platoon: d.platoon, playtime: d.playtime };
  var any = false;
  Object.keys(map).forEach(function (k) {
    if (!map[k]) return;
    var el = document.querySelector('[data-slot="' + k + '"]');
    if (el) { el.textContent = map[k]; any = true; }
  });
  if (any) $("dossier").hidden = false;
}

/* =====================================================================
   8 · UHR
   ===================================================================== */

function initClock() {
  function tick() {
    var d = new Date();
    $("stat-clock").textContent =
      String(d.getHours()).padStart(2, "0") + ":" +
      String(d.getMinutes()).padStart(2, "0");
  }
  tick();
  setInterval(tick, 20000);
}

/* =====================================================================
   9 · SIMULATION FUER DIE ENTWICKLUNG
   Laeuft nur, solange GMod keinen echten Callback gefeuert hat.
   ===================================================================== */

var mockTimer = null;
var inMock    = false;

/* Ruft einen Callback so auf, dass fromGMod() ihn nicht als echten
   GMod-Aufruf wertet und die Simulation abwuergt. */
function mockCall(fn) {
  inMock = true;
  try { fn(); } finally { inMock = false; }
}

function startMock() {
  if (!(CFG.dev && CFG.dev.mock)) return;

  setTimeout(function () {
    if (state.gmodSeen) return;   // GMod war schneller — nichts simulieren

    var total = 640;
    var needed = total;
    var files = [
      "materials/models/501st/armour_phase2.vmt",
      "models/player/501st/trooper_lip.mdl",
      "sound/bib/comlink_open.wav",
      "materials/vgui/bib/logo.vmt",
      "models/weapons/w_dc15a.mdl",
      "materials/models/501st/pauldron_ce.vtf"
    ];

    mockCall(function () {
      window.GameDetails(
        (CFG.server && CFG.server.fallbackHostname) || "Testserver",
        "", "rp_kamino_bib", 96,
        (CFG.dev && CFG.dev.mockSteamId) || "76561198000000000",
        "starwarsrp", 1, "de"
      );
      window.SetFilesTotal(total);
    });

    mockTimer = setInterval(function () {
      needed -= Math.floor(Math.random() * 9) + 2;

      if (needed <= 0) {
        mockCall(function () {
          window.SetFilesNeeded(0);
          window.SetStatusChanged("Starting Lua...");
        });
        clearInterval(mockTimer);
        mockTimer = null;
        return;
      }

      mockCall(function () {
        window.SetFilesNeeded(needed);
        window.DownloadingFile(files[Math.floor(Math.random() * files.length)]);
      });
    }, 260);
  }, 1400);
}

function stopMock() {
  if (mockTimer) { clearInterval(mockTimer); mockTimer = null; }
}

/* =====================================================================
   START
   ===================================================================== */

function boot() {
  buildStaticContent();
  initViews();
  initTips();
  initClock();
  renderProgress();
  Audio501.init();
  startMock();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

})();
