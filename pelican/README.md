# Loading Screen als Pelican-Container

Betreibt den Ladebildschirm als eigenen Server im Pelican-Panel — mit
Start/Stopp, Konsole, Dateimanager und Reinstall als Deploy.

```
pelican/
├── egg-bib-loadingscreen.json   In Pelican importieren
├── server.cjs                   Der Webserver
└── README.md
```

---

## Was der Container macht — und was nicht

**Macht er:** liefert den gebauten Screen (`dist/`) über einen
abhängigkeitsfreien Node-Server aus. Kein Express, kein `serve`, kein
`npm install` zur Laufzeit — nur die Node-Standardbibliothek. Damit gibt
es im Container nichts, was veralten oder brechen kann.

**Macht er nicht:** die PHP-API unter `/api/`. PHP läuft in einem
Node-Container nicht. Die bleibt bei nginx und PHP-FPM, so wie
eingerichtet. nginx reicht `/` an den Container durch und behandelt
`/api/` weiterhin selbst — siehe unten.

---

## Einrichten

### 1. Egg importieren

Im Panel unter **Admin → Eggs → Import Egg** die Datei
`egg-bib-loadingscreen.json` hochladen.

### 2. Server anlegen

- **Egg:** BiB Loading Screen
- **Docker Image:** Node.js 22
- **Allocation:** Port **3002**
- **Ressourcen:** 128 MB RAM und 10 % CPU reichen reichlich. Der Server
  liefert nur statische Dateien aus.

### 3. Variablen setzen

| Variable | Bedeutung |
|---|---|
| `GIT_REPO` | `https://github.com/Deadshotlp/bib-loadingscreen.git` |
| `GIT_BRANCH` | `main` |
| `GIT_TOKEN` | **nur bei privatem Repository** |
| `SERVE_DIR` | `/home/container/dist` — unverändert lassen |

Das Repository ist privat, du brauchst also einen Token. Nimm einen
**Fine-grained Personal Access Token** mit ausschließlich
**Contents: Read** auf genau dieses eine Repository. Kein `write`, keine
anderen Repositories, kein Kontopasswort.

> Der Token wird im Panel gespeichert und ist für jeden sichtbar, der
> Zugriff auf die Server-Einstellungen hat. Deshalb nur Leserecht, und
> ausschließlich auf dieses Repository. Das Installationsskript
> maskiert ihn in Fehlerausgaben, damit er nicht in der Konsole landet.

### 4. Installieren

Pelican führt die Installation automatisch aus: Repository klonen,
`npm ci`, `npm run build`, Ergebnis nach `/home/container/dist`.
Den Fortschritt siehst du im Installations-Log.

Danach starten. In der Konsole muss stehen:

```
[BIB] Wurzelverzeichnis: /home/container/dist
[BIB] Loading Screen bereit auf 0.0.0.0:3002
```

An dieser Zeile erkennt Pelican auch, dass der Server läuft.

---

## nginx davorschalten

Der Container horcht nur lokal auf 3002. In
`/etc/nginx/sites-available/loading.deadshot-development.de` ersetzt du
den letzten `location /`-Block durch:

```nginx
    location / {
        proxy_pass         http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
```

**Alles zu `/api/` bleibt unverändert stehen**, ebenso `root /var/www/loading;`
— sonst findet PHP-FPM seine Skripte nicht.

> ⚠️ **Die Blöcke `location /bundle/` und `location = /config.js` müssen
> gelöscht werden** — auch im HTTPS-Block, den certbot angelegt hat.
>
> Sie enthalten kein `proxy_pass`, nginx bedient sie deshalb weiterhin aus
> `root /var/www/loading`. Dort liegen die Dateien nach der Umstellung
> nicht mehr: CSS, JavaScript und `config.js` geben 404 zurück, während
> `/` sauber zum Container geht. Das Ergebnis ist eine unformatierte
> Seite — schwarze SVG-Formen auf leerem Grund, ohne jede Fehlermeldung
> im Browser.
>
> Erkennungszeichen im Container-Log: es kommen ausschließlich
> `GET /`-Zeilen an, nie `GET /bundle/…`.
>
> Um die Cache-Header kümmert sich `server.cjs` selbst.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Aktualisieren

**Reinstall** im Panel. Das klont neu und baut neu — das ist dein
Deploy-Knopf.

> ⚠️ **Reinstall überschreibt `dist/` vollständig.** Hast du
> `dist/config.js` im Dateimanager bearbeitet, sind diese Änderungen
> danach weg. Dauerhafte Änderungen gehören in `public/config.js` im
> Repository.

Für schnelle Textänderungen zwischendurch: `dist/config.js` im
Dateimanager bearbeiten und den Server neu starten. Die Datei wird mit
`no-store` ausgeliefert, Clients sehen die Änderung also sofort.

---

## Cache-Verhalten

`server.cjs` setzt die Header selbst:

| Pfad | Header | Warum |
|---|---|---|
| `/config.js` | `no-store` | wird von Hand geändert, muss sofort wirken |
| `/` und `*.html` | `no-cache` | verweist auf die gehashten Bundles |
| `/bundle/*` | `public, max-age=2592000, immutable` | Dateinamen enthalten einen Hash |
| Rest | `public, max-age=3600` | Bilder, Audio |

---

## Wenn es klemmt

| Konsolenausgabe | Ursache |
|---|---|
| `FEHLER: Verzeichnis nicht gefunden` | Installation lief nicht durch — Installations-Log ansehen |
| `FEHLER: index.html fehlt` | falscher Ordner hochgeladen, oder Build fehlgeschlagen |
| `git clone fehlgeschlagen` | `GIT_TOKEN` fehlt oder hat keine Leserechte auf das Repository |
| Server läuft, nginx meldet 502 | Allocation ist nicht 3002, oder `proxy_pass` zeigt auf den falschen Port |

Der Container bindet an `0.0.0.0` und den Port aus `SERVER_PORT`. Steht
in der Startzeile ein anderer Port als erwartet, stimmt die Allocation
im Panel nicht.

Alle Anfragen werden in der Pelican-Konsole protokolliert
(Status, Methode, Pfad, Dauer) — dort siehst du direkt, ob Anfragen
ankommen.

---

## Ohne Repository-Zugriff

Falls du keinen Token einrichten willst: `GIT_REPO` leer lassen, dann
bricht die Installation mit einem Hinweis ab. Lade anschließend über den
Dateimanager hoch:

- den **Inhalt** von `dist/` nach `/home/container/dist/`
- `pelican/server.cjs` nach `/home/container/server.cjs`

Danach starten. Der Nachteil: jedes Update ist wieder Handarbeit.
