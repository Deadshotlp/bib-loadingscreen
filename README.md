# Brothers in Blue — 501st Roleplay · Loading Screen

Ladebildschirm für den Garry's-Mod-Server **Brothers in Blue**.
Vite-Projekt, keine Runtime-Abhängigkeiten, keine CDN-Requests — der
fertige Build besteht aus vier Dateien und läuft von jedem Webspace.

![Vite](https://img.shields.io/badge/Vite-7-646CFF) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## Schnellstart

```bash
npm install
npm run dev        # http://localhost:5173 mit Live-Reload
npm run build      # erzeugt dist/
npm run preview    # dist/ lokal gegenprüfen
```

Beim Aufruf ohne GMod startet nach 1,4 s eine **simulierte Ladesequenz**
mit Fortschrittsbalken, Statuswechseln und Dateinamen. So kannst du am
Design arbeiten, ohne dich ständig neu zu verbinden. Sobald GMod einen
echten Callback feuert, schaltet sich die Simulation selbst ab.

---

## Projektstruktur

```
├── index.html              Vite-Einstiegspunkt
├── public/
│   ├── config.js           >>> HIER änderst du alles Redaktionelle <<<
│   └── assets/
│       ├── audio/          Musikdateien
│       └── img/            QR-Code, optionales Logo
├── src/
│   ├── main.js             Callbacks, Fortschritt, Audio-Engine
│   └── style.css           Design
├── vite.config.js
├── FASTDL.md               separate Anleitung
└── dist/                   Build-Ergebnis (nicht versioniert)
```

### Warum `config.js` in `public/` liegt

Vite würde die Datei sonst mit hashiertem Namen ins Bundle packen. Dann
müsstest du für jede Regeländerung neu bauen und deployen.

So bleibt sie unangetastet als `dist/config.js` liegen und lässt sich
**direkt auf dem Webserver editieren** — Regeln, Feldhinweise,
Änderungsprotokoll, Zugbeschreibungen, Discord-Link, Musiktitel. Kein
Build, kein Deploy, kein Git.

Sie wird als klassisches `<script>` vor dem Modul geladen, läuft also
garantiert zuerst.

---

## Zwei Ansichten in einer Datei

GMod lädt genau **eine** URL. Zwei getrennte HTML-Dateien würden bedeuten,
dass der Spieler nur eine davon je zu sehen bekommt. Deshalb stecken beide
Seiten als umschaltbare Ansichten in `index.html`:

| Ansicht | Inhalt |
|---|---|
| **01 Einsatzbriefing** | Begrüßung mit Trooper-Kennung, Dienstvorschrift, rotierende Feldhinweise, Discord, Änderungsprotokoll |
| **02 Kompaniestruktur** | Torrent Company als Organigramm mit den vier Zügen |

Umschalten per Klick auf die Tabs. Zusätzlich rotieren die Ansichten alle
18 s automatisch — falls ein Client keine Klicks durchreicht, sieht der
Spieler trotzdem beides. Nach einem manuellen Klick pausiert die Rotation
45 s. Alles einstellbar unter `views` in der `config.js`.

### Kompaniestruktur

```
                    Torrent Company
                          │
      ┌───────────┬───────┴───────┬───────────┐
   1. Zug      2. Zug          3. Zug      4. Zug
    LIP          HIP             MED          CE
  Light        Heavy          Medical      Combat
Infantry     Infantry                     Engineers
```

---

## Deployment

```bash
npm run build
```

Den **Inhalt** von `dist/` auf den Webspace laden, z. B. nach
`https://deine-domain.de/loading/`. Dann in `garrysmod/cfg/server.cfg`:

```
sv_loadingurl "https://deine-domain.de/loading/"
```

Server neu starten.

> `vite.config.js` setzt `base: "./"`. Das ist wichtig: mit dem
> Vite-Standard `"/"` würden alle Asset-Pfade ins Leere zeigen, sobald
> der Screen in einem Unterordner liegt.

Optional mit Platzhaltern, die GMod ersetzt (`%s` = SteamID64,
`%m` = Map) — für diesen Screen **nicht nötig**, er bekommt beides über
den `GameDetails`-Callback:

```
sv_loadingurl "https://deine-domain.de/loading/?steamid=%s&map=%m"
```

---

## Die GMod-Schnittstelle

Der Client ruft fünf Funktionen auf. Sie sind in `src/main.js`
implementiert — **Namen nicht ändern**, sie sind von GMod vorgegeben.

| Funktion | Wirkung |
|---|---|
| `GameDetails(servername, serverurl, mapname, maxplayers, steamid, gamemode, volume, language)` | Servername, Sektor, Slots, Spieler-ID, Musiklautstärke |
| `SetFilesTotal(total)` | Nenner des Fortschritts |
| `SetFilesNeeded(needed)` | Zähler → Prozentzahl |
| `DownloadingFile(name)` | Dateiname unten links |
| `SetStatusChanged(status)` | Statuszeile, englische Meldungen werden übersetzt |

Solange keine Dateizahlen vorliegen, läuft der Balken in einem
unbestimmten Zustand statt bei 0 % zu stehen. `SetStatusChanged` feuert
laut Facepunch-Wiki erst, wenn der Client mit Server- bzw.
Workshop-Dateien arbeitet — die ersten Sekunden gibt es schlicht keine
Daten.

Einzelne Zustände in der Browser-Konsole durchspielen:

```js
GameDetails("Brothers in Blue", "", "rp_kamino", 96, "76561198000000000", "starwarsrp", 1, "de");
SetFilesTotal(500);
SetFilesNeeded(120);
DownloadingFile("materials/models/501st/armour.vmt");
SetStatusChanged("Starting Lua...");
```

---

## Musik

Dateien nach `public/assets/audio/`, dann in `config.js` unter
`audio.tracks` eintragen. Playlist, Shuffle, Loop, Ein-/Ausblenden,
Mute-Button und Lautstärkeregler sind fertig.

Die Spiellautstärke des Clients wird automatisch eingerechnet — wer sein
Spiel leise gestellt hat, wird nicht angeschrien. Defekte Dateien
überspringt der Player, statt hängenzubleiben. Sind keine Titel
konfiguriert, blendet sich die Audio-Leiste aus.

**Chromium blockiert Autoplay ohne Nutzerinteraktion.** Passiert das,
erscheint unten rechts ein Hinweis; der erste Klick startet die
Wiedergabe. Der Screen funktioniert ohne Ton vollständig — verlass dich
nicht darauf, dass die Musik läuft.

Richtwert für die Gesamtgröße aller Titel: **unter 4 MB**. Die Musik lädt
parallel zu den Serverinhalten und konkurriert um dieselbe Leitung.

> Audio- und Bilddateien sind per `.gitignore` ausgenommen — sie sind
> groß, binär und meist lizenzbehaftet.

---

## Personalisierung (optional)

`api.playerEndpoint` in der `config.js` setzen. Der Screen hängt
`?steamid=…` an und erwartet JSON:

```json
{
  "name":      "CT-1409 'Echo'",
  "avatar":    "https://.../avatar.jpg",
  "unit":      "Torrent Company",
  "rank":      "Sergeant",
  "platoon":   "2. Zug — HIP",
  "playtime":  "142 h",
  "returning": true
}
```

Dann erscheint das Dossier im Begrüßungsbanner. Ohne Endpoint bleibt es
ausgeblendet, alles andere funktioniert normal.

> **Sicherheit:** Das Endpoint ist öffentlich und bekommt eine SteamID als
> Parameter — die ist trivial fälschbar. Nur unkritische Anzeigedaten
> ausgeben. Keine IPs, keine Adminnotizen, keine Ban-Gründe. Rate-Limit
> einbauen.

---

## Was nicht funktioniert

- **Klickbare Links.** Es öffnet sich kein Browser → QR-Code und
  abtippbare Adresse statt `<a href>`.
- **Garantierte Musik.** Siehe oben.
- **`asset://`-URLs.** Laut Facepunch-Wiki praktisch nutzlos.
- **Verlass auf Sichtbarkeit.** Nicht jeder Client zeigt den Screen.
  Wichtige Infos gehören zusätzlich woanders hin.

---

## Größe

Der Build liegt ohne Musik und Bilder bei rund **41 KB** (gzip ~13 KB).
Halte es dabei — der Screen konkurriert mit dem Content-Download des
Spielers um dessen Bandbreite.

Für die eigentliche Ladezeit ist FastDL entscheidend, nicht der Screen.
Siehe [FASTDL.md](FASTDL.md).

---

## Lizenz

MIT — siehe [LICENSE](LICENSE).
