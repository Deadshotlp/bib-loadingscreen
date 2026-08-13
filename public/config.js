/* =====================================================================
   Brothers in Blue — 501st Roleplay
   ZENTRALE KONFIGURATION

   Alles, was du regelmaessig aenderst, steht in dieser Datei.
   Die loading.js musst du dafuer nicht anfassen.
   ===================================================================== */

window.BIB_CONFIG = {

  /* ---------------------------------------------------------------
     SERVER-IDENTITAET
     --------------------------------------------------------------- */
  server: {
    name:    "BROTHERS IN BLUE",
    sub:     '501<sup>st</sup> ROLEPLAY · TORRENT COMPANY',
    // Wird angezeigt, solange GMod noch keinen Hostnamen geliefert hat
    fallbackHostname: "Brothers in Blue — 501st Roleplay"
  },

  /* ---------------------------------------------------------------
     FUNKNETZ
     --------------------------------------------------------------- */
  discord: {
    label: "https://discord.gg/AUaKGACn34",     // <- eintragen
    // QR-Code als Bilddatei (empfohlen: 300x300 PNG, schwarz auf weiss).
    // Leer lassen -> es wird ein Platzhalter angezeigt.
    qr: ""                            // z.B. "assets/img/discord-qr.png"
  },

  /* ---------------------------------------------------------------
     DIENSTVORSCHRIFT  (Kurzfassung — max. 6 Punkte, sonst wird es unleserlich)
     <b>...</b> hebt hervor.
     --------------------------------------------------------------- */
  rules: [
    "<b>Keine Freunde? Kein Problem</b> Hier findest du schnell neue Bekanntschaften unter deinen Brüdern",
    "<b>Bug oder Fehler gefunden?</b> Bitte melde dich im Discord und melde Fehler",
    "<b>Hab Spaß</b> :) ",
    "<b>Bleib in der Rolle.</b> OOC-Gespräche gehören in den dafür vorgesehenen Kanal.",
    "<b>Respekt.</b> Beleidigungen, Diskriminierung und Belästigung führen zum Ausschluss.",
    "<b>Im Zweifel fragen.</b> Das Team erreichst du per @"
  ],

  /* ---------------------------------------------------------------
     FELDHINWEISE  (rotieren automatisch)
     --------------------------------------------------------------- */
  tips: [
    "Mit <b>F6</b> kannst du respawnen.",
    "Die <b>Waffenkiste</b> in der Waffenkammer gibt dir nur die Ausrüstung, die dein Job erlaubt.",
    "Über das <b>Comlink</b> auf H kannst du funken",
    "Sanitäter behandeln Verletzungen — <b>renn nicht weg</b>, wenn dich einer versorgt.",
    "Spiele fair und halte dich an Regeln. Es wird sich für dich lohnen!",
    "Spezeille Ausrüstungen brauchen spezeille Fortbildungen. Frag deinen Vorgesetzten.",
    "Halte deine <b>Rüstung</b> instand. Sauber in die Schlacht, dreckig wieder raus."
  ],

  /* ---------------------------------------------------------------
     AENDERUNGSPROTOKOLL  (die letzten 4-5 Eintraege reichen)
     --------------------------------------------------------------- */
  changelog: [
    { tag: "NEWS",  text: "Captain Rex hat den letzten Banthaburger gegessen" },
    { tag: "WOW",  text: "Yularen neuer Schachgroßmeister. Yoda ist raus." },
    { tag: "OLDS",  text: "General Skywalker ist im Urlaub auf Naboo (schon wieder lol)" },
    { tag: "Iiihh",  text: "Doofschuss hat einen Pickel auf der Nase" }
  ],

  /* ---------------------------------------------------------------
     KOMPANIESTRUKTUR  (View 2)

     Die Farben kommen aus der style.css:
       var(--lip)  hellblau   var(--hip)  501st-blau
       var(--med)  weiss      var(--eng)  bernstein
     --------------------------------------------------------------- */
  structure: {
    hq: {
      abbr:  "TC",
      name:  "Torrent Company",
      role:  "Kompanieführung · Befehlsgewalt über alle PLatoons"
    },

    platoons: [
      {
        ord:      "1. Platoon",
        badge:    "1st",
        name:     "1. Platoon",
        full:     "First Platoon",
        color:    "var(--1st)",
        role:     "Beweglicher Vorstoß, Aufklärung und Sicherung der Flanken. Das erste Platoon, das Feindkontakt meldet.",
        duties:   [
          "Aufklärung und Erstkontakt",
          "Flankensicherung im Vormarsch",
          "Schnelle Verlegung und Verfolgung"
        ],
        strengthLabel: "Schwerpunkt",
        strength:      "Tempo"
      },
      {
        ord:      "2. Platoon",
        badge:    "2nd",
        name:     "2. Platoon",
        full:     "Second Platoon",
        color:    "var(--2nd)",
        role:     "Massierte Feuerkraft für den Durchbruch befestigter Stellungen und das Halten eroberter Linien.",
        duties:   [
          "Schwere Waffen und Unterdrückungsfeuer",
          "Durchbruch befestigter Stellungen",
          "Verteidigung gehaltener Positionen"
        ],
        strengthLabel: "Schwerpunkt",
        strength:      "Durchschlag"
      },
      {
        ord:      "3. Platoon",
        badge:    "MED",
        name:     "Medical",
        full:     "Medical Platoon",
        color:    "var(--med)",
        role:     "Sanitätsdienst der Kompanie. Versorgt Verwundete im Gefecht und betreibt die Medbay.",
        duties:   [
          "Verwundetenversorgung unter Feuer",
          "Betrieb der Medbay",
          "Evakuierung und Nachsorge"
        ],
        strengthLabel: "Schwerpunkt",
        strength:      "Erhalt"
      },
      {
        ord:      "4. Platoon",
        badge:    "CE",
        name:     "Combat Engineers",
        full:     "Combat Engineer Platoon",
        color:    "var(--eng)",
        role:     "Pionierdienst. Öffnet Wege für den Vormarsch, sperrt sie für den Gegner und hält die Technik am Laufen.",
        duties:   [
          "Sprengung und Entschärfung",
          "Bau von Befestigungen und Sperren",
          "Technische Instandsetzung"
        ],
        strengthLabel: "Schwerpunkt",
        strength:      "Gelände"
      }
    ]
  },

  /* ---------------------------------------------------------------
     MUSIK

     Lege deine Dateien unter  assets/audio/  ab und trage sie hier ein.
     Empfohlen:  MP3, 128-160 kbps, Mono reicht fuer Ambient.
     Halte die Gesamtgroesse klein — die Datei laedt parallel zum
     Spielcontent des Spielers.

     WICHTIG: Chromium blockiert Autoplay ohne Nutzerinteraktion.
     Der Screen zeigt dann unten rechts einen Hinweis; ein Klick
     irgendwo auf die Seite startet die Wiedergabe. Baue den Screen
     so, dass er ohne Ton vollstaendig funktioniert.
     --------------------------------------------------------------- */
  audio: {
    enabled:  true,
    shuffle:  true,
    loop:     true,

    // Grundlautstaerke 0.0 - 1.0. Wird zusaetzlich mit der
    // Spiellautstaerke multipliziert, die GMod uebergibt.
    baseVolume: 0.35,

    // Sanftes Ein-/Ausblenden zwischen Titeln, in Millisekunden
    fadeMs: 1200,

    tracks: [
      // { title: "Titelname", artist: "Interpret", src: "assets/audio/track01.mp3" },
      // { title: "Titelname", artist: "Interpret", src: "assets/audio/track02.mp3" }
    ]
  },

  /* ---------------------------------------------------------------
     ANSICHTS-ROTATION

     Falls ein Client keine Mausklicks an die Seite durchreicht,
     wechseln die Ansichten automatisch weiter.
     autoRotate:false  -> nur manuelles Umschalten per Tab
     --------------------------------------------------------------- */
  views: {
    autoRotate:      true,
    rotateSeconds:   18,
    // Nach einem manuellen Klick pausiert die Rotation so lange (Sekunden)
    pauseAfterClick: 45
  },

  tipSeconds: 9,

  /* ---------------------------------------------------------------
     BACKEND FUER PERSONALISIERUNG   (optional, Stufe 3)

     Leer lassen -> das Dossier bleibt ausgeblendet, alles andere
     funktioniert normal.

     Erwartete JSON-Antwort deines Endpoints:
     {
       "name":     "CT-1409 'Echo'",
       "avatar":   "https://.../avatar.jpg",
       "unit":     "Torrent Company",
       "rank":     "Sergeant",
       "platoon":  "2. Zug — HIP",
       "playtime": "142 h",
       "returning": true
     }

     Das passende Backend liegt fertig in  api/  — siehe api/README.md.
     Nach dessen Einrichtung hier die URL eintragen.
     --------------------------------------------------------------- */
  api: {
    // z.B. "https://deine-domain.de/api/player.php"
    // Die SteamID64 wird als ?steamid=... angehaengt.
    playerEndpoint: "",
    timeoutMs: 4000
  },

  /* ---------------------------------------------------------------
     ENTWICKLUNG

     mock:true  -> simuliert einen Ladevorgang, wenn die Seite
     ausserhalb von GMod geoeffnet wird. Zum Testen im Browser.
     Kann ruhig aktiviert bleiben: sobald GMod die echten Callbacks
     feuert, wird die Simulation automatisch abgeschaltet.
     --------------------------------------------------------------- */
  dev: {
    mock: true,
    mockSteamId: "76561198000000000"
  }
};
