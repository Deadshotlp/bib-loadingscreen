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
    label: "discord.gg/deinlink",     // <- eintragen
    // QR-Code als Bilddatei (empfohlen: 300x300 PNG, schwarz auf weiss).
    // Leer lassen -> es wird ein Platzhalter angezeigt.
    qr: ""                            // z.B. "assets/img/discord-qr.png"
  },

  /* ---------------------------------------------------------------
     DIENSTVORSCHRIFT  (Kurzfassung — max. 6 Punkte, sonst wird es unleserlich)
     <b>...</b> hebt hervor.
     --------------------------------------------------------------- */
  rules: [
    "<b>Kein RDM.</b> Gewalt gegen andere Trooper braucht immer einen Rollenspielgrund.",
    "<b>Befehlskette einhalten.</b> Anweisungen von Vorgesetzten werden im Dienst ausgeführt.",
    "<b>Kein Metagaming.</b> Was dein Charakter nicht weiß, weiß dein Charakter nicht.",
    "<b>Bleib in der Rolle.</b> OOC-Gespräche gehören in den dafür vorgesehenen Kanal.",
    "<b>Respekt.</b> Beleidigungen, Diskriminierung und Belästigung führen zum Ausschluss.",
    "<b>Im Zweifel fragen.</b> Das Teamleitung-Team ist über Discord erreichbar."
  ],

  /* ---------------------------------------------------------------
     FELDHINWEISE  (rotieren automatisch)
     --------------------------------------------------------------- */
  tips: [
    "Mit <b>F3</b> öffnest du das Charaktermenü und siehst deinen aktuellen Zug.",
    "Die <b>Waffenkiste</b> in der Kaserne gibt dir nur die Ausrüstung, die dein Job erlaubt.",
    "Über das <b>Comlink</b> erreichst du deinen Zugführer, ohne den Nahfunk zu belegen.",
    "Sanitäter behandeln Verletzungen — <b>renn nicht weg</b>, wenn dich einer versorgt.",
    "Das <b>Squadsystem</b> zeigt deine Truppmitglieder im HUD an. Nutzt es im Einsatz.",
    "Trainings werden im Discord angekündigt. <b>Wer trainiert, wird befördert.</b>",
    "Halte deine <b>Rüstung</b> instand — beschädigte Platten schützen schlechter."
  ],

  /* ---------------------------------------------------------------
     AENDERUNGSPROTOKOLL  (die letzten 4-5 Eintraege reichen)
     --------------------------------------------------------------- */
  changelog: [
    { tag: "NEU",  text: "Combat Engineers als 4. Zug aufgestellt." },
    { tag: "FIX",  text: "Funkreichweite im Hangar korrigiert." },
    { tag: "BAL",  text: "Ausrüstungslisten für LIP und HIP überarbeitet." },
    { tag: "NEU",  text: "Neue Trainingsmap in die Rotation aufgenommen." }
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
      role:  "Kompanieführung · Befehlsgewalt über alle vier Züge"
    },

    platoons: [
      {
        ord:      "1. Zug",
        badge:    "LIP",
        name:     "Light Infantry",
        full:     "Light Infantry Platoon",
        color:    "var(--lip)",
        role:     "Beweglicher Vorstoß, Aufklärung und Sicherung der Flanken. Der erste Zug, der Feindkontakt meldet.",
        duties:   [
          "Aufklärung und Erstkontakt",
          "Flankensicherung im Vormarsch",
          "Schnelle Verlegung und Verfolgung"
        ],
        strengthLabel: "Schwerpunkt",
        strength:      "Tempo"
      },
      {
        ord:      "2. Zug",
        badge:    "HIP",
        name:     "Heavy Infantry",
        full:     "Heavy Infantry Platoon",
        color:    "var(--hip)",
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
        ord:      "3. Zug",
        badge:    "MED",
        name:     "Medical",
        full:     "Medical Platoon",
        color:    "var(--med)",
        role:     "Sanitätsdienst der Kompanie. Versorgt Verwundete im Gefecht und betreibt das Feldlazarett.",
        duties:   [
          "Verwundetenversorgung unter Feuer",
          "Betrieb des Feldlazaretts",
          "Evakuierung und Nachsorge"
        ],
        strengthLabel: "Schwerpunkt",
        strength:      "Erhalt"
      },
      {
        ord:      "4. Zug",
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
