# FastDL einrichten — Schritt für Schritt

Gilt für `Brothers in Blue`. Aktuell steht in deiner `server.cfg`
`sv_downloadurl ""` — Clients ziehen Custom-Content also direkt vom
Gameserver, gedrosselt auf **64 kb/s**. Das ist der Grund, warum
Erstjoins ewig dauern.

---

## 1. Was FastDL ist — und was es nicht abdeckt

FastDL ist ein ganz normaler **Webserver**, der dieselben Dateien
ausliefert wie dein Gameserver. Der Client lädt sie per HTTP mit voller
Geschwindigkeit statt über den gedrosselten Spielkanal.

Wichtig ist, was **nicht** über FastDL läuft:

| Inhalt | Weg zum Client | FastDL nötig? |
|---|---|---|
| Workshop-Addons (`resource.AddWorkshop`) | Steam | **Nein** |
| Lua-Dateien (`AddCSLuaFile`) | eigener Spielkanal | **Nein** |
| Models, Materials, Sounds, Particles | ServerDL **oder** FastDL | **Ja** |
| Maps (`.bsp`) | ServerDL **oder** FastDL | **Ja** |

Du hast rund 98 Workshop-Addons gemountet — die laufen bereits über
Steam und profitieren nicht von FastDL. FastDL brauchst du für alles,
was **nicht** aus dem Workshop kommt: eigene Models, eigene Materials,
eigene Sounds, eure Maps.

---

## 2. Webspace vorbereiten

Du brauchst irgendeinen HTTP-Server. Eine Subdomain reicht:
`https://fastdl.deine-domain.de/`

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name fastdl.deine-domain.de;

    root /var/www/fastdl;

    # Verzeichnislisting aus — niemand muss deinen Content durchblättern
    autoindex off;

    # Lange cachen, die Dateien ändern sich praktisch nie
    location / {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # bz2 korrekt ausliefern
    location ~ \.bz2$ {
        types { }
        default_type application/x-bzip2;
        expires 30d;
    }

    # Kein Bedarf, irgendetwas anderes auszuliefern
    location ~ /\. { deny all; }
}
```

### Apache

```apache
<VirtualHost *:443>
    ServerName fastdl.deine-domain.de
    DocumentRoot /var/www/fastdl

    <Directory /var/www/fastdl>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    AddType application/x-bzip2 .bz2

    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresDefault "access plus 30 days"
    </IfModule>
</VirtualHost>
```

---

## 3. Ordnerstruktur

Der Client baut den Pfad **exakt** so zusammen, wie die Datei im
`garrysmod`-Ordner liegt. `sv_downloadurl` zeigt auf die Wurzel, darunter
spiegelst du die Struktur:

```
/var/www/fastdl/
├── maps/            *.bsp
├── materials/       *.vmt  *.vtf  *.png
├── models/          *.mdl  *.vvd  *.dx90.vtx  *.phy
├── sound/           *.wav  *.mp3  *.ogg
├── particles/       *.pcf
└── resource/
    └── fonts/       *.ttf
```

Beispiel: markierst du `materials/hud/killicon.vmt` und `sv_downloadurl`
ist `https://fastdl.deine-domain.de/`, dann fragt der Client an:

```
https://fastdl.deine-domain.de/materials/hud/killicon.vmt.bz2   <- zuerst
https://fastdl.deine-domain.de/materials/hud/killicon.vmt       <- falls .bz2 fehlt
```

**Der Client versucht immer zuerst die `.bz2`-Variante** und fällt auf die
unkomprimierte zurück. Daraus folgt Punkt 4.

---

## 4. Komprimieren

bzip2 halbiert die Übertragungsmenge bei Materials und Models locker.
Ergebnis pro Datei: `killicon.vmt` **plus** `killicon.vmt.bz2` im selben
Ordner.

Beides hochzuladen ist die sichere Variante — kostet nur Speicherplatz,
und du hast einen Fallback, falls die Dekomprimierung beim Client
klemmt.

> **Bekanntes Problem bei Maps:** Es gibt gemeldete Fälle, in denen GMod
> `.bsp.bz2` nicht sauber entpackt und eine 0-Byte-Datei zurückbleibt.
> Der Client hält die Map dann für heruntergeladen und scheitert.
> **Empfehlung: `.bsp` zusätzlich unkomprimiert hochladen.**

### Sync-Skript für Windows (PowerShell + 7-Zip)

Setzt 7-Zip voraus (`C:\Program Files\7-Zip\7z.exe`).

```powershell
# sync-fastdl.ps1
$Quelle = "C:\Pfad\zu\garrysmod"
$Ziel   = "C:\fastdl"
$SevenZ = "C:\Program Files\7-Zip\7z.exe"

$Ordner = @("materials","models","sound","particles","maps","resource\fonts")
$Endungen = @(".vmt",".vtf",".mdl",".vvd",".vtx",".phy",".ani",
              ".wav",".mp3",".ogg",".pcf",".bsp",".ttf",".png")

foreach ($o in $Ordner) {
    $src = Join-Path $Quelle $o
    if (-not (Test-Path $src)) { continue }

    Get-ChildItem $src -Recurse -File | Where-Object {
        $Endungen -contains $_.Extension.ToLower()
    } | ForEach-Object {
        $rel = $_.FullName.Substring($Quelle.Length + 1)
        $dst = Join-Path $Ziel $rel
        $dir = Split-Path $dst -Parent
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }

        # Nur kopieren, wenn neuer
        if ((-not (Test-Path $dst)) -or
            ($_.LastWriteTime -gt (Get-Item $dst).LastWriteTime)) {
            Copy-Item $_.FullName $dst -Force
            if (Test-Path "$dst.bz2") { Remove-Item "$dst.bz2" -Force }
            & $SevenZ a -tbzip2 "$dst.bz2" "$dst" | Out-Null
            Write-Host "  + $rel"
        }
    }
}
Write-Host "Fertig. Inhalt von $Ziel auf den Webserver hochladen."
```

### Auf Linux

```bash
cd /var/www/fastdl
find . -type f ! -name '*.bz2' -exec bzip2 -k -f {} \;
```

---

## 5. Dateien in Lua anmelden

FastDL allein reicht nicht — der Server muss dem Client **sagen**, welche
Dateien er braucht. Das passiert serverseitig mit `resource.AddFile`,
z. B. in `gamemodes/starwarsrp/gamemode/init.lua` oder einem eigenen
Modul:

```lua
-- Einzelne Datei
resource.AddFile("materials/vgui/bib/logo.vmt")

-- Ganze Ordner automatisch anmelden
local function AddDir(dir)
    local files, dirs = file.Find(dir .. "/*", "GAME")
    for _, f in ipairs(files) do
        resource.AddFile(dir .. "/" .. f)
    end
    for _, d in ipairs(dirs) do
        AddDir(dir .. "/" .. d)
    end
end

AddDir("materials/models/501st")
AddDir("models/player/501st")
AddDir("sound/bib")
```

Für Workshop-Addons stattdessen:

```lua
resource.AddWorkshop("1688784363")
```

**Maps brauchen kein `resource.AddFile`.** Der Client benötigt die Map,
bevor überhaupt Lua läuft — sie wird automatisch über
`sv_downloadurl` aus dem `maps/`-Ordner gezogen.

---

## 6. server.cfg

```
sv_downloadurl "https://fastdl.deine-domain.de/"
sv_allowdownload 1
sv_allowupload 0
```

Zu `sv_allowdownload`:

- **`1`** — fällt auf den langsamen Direktdownload zurück, wenn eine
  Datei auf FastDL fehlt. Robuster, aber laut Facepunch-Wiki eine
  Angriffsfläche: Clients mit modifizierter Software können
  Dateianfragen spammen und den Server ausbremsen.
- **`0`** — erzwingt FastDL. Schneller und sicherer, aber jede Datei, die
  du zu spiegeln vergisst, fehlt dem Spieler ersatzlos.

Empfehlung: mit `1` starten, und sobald der Sync zuverlässig läuft, auf
`0` umstellen.

`sv_allowupload 0` sollte immer gesetzt sein — Clients haben keinen Grund,
Dateien zu deinem Server zu schicken.

---

## 7. Testen

**Schritt 1 — Datei direkt im Browser aufrufen.**

```
https://fastdl.deine-domain.de/materials/vgui/bib/logo.vmt
https://fastdl.deine-domain.de/materials/vgui/bib/logo.vmt.bz2
```

Beides muss einen Download auslösen, keinen 403 und keinen 404.

**Schritt 2 — Als Client mit leerem Cache verbinden.**

`garrysmod/download/` beim Testclient löschen, dann verbinden. In der
Client-Konsole siehst du die Downloads durchlaufen.

**Schritt 3 — Kontrollieren, was wirklich ankam.**

Heruntergeladene Dateien landen beim Client unter `garrysmod/download/`.
Liegt dort nichts, greift FastDL nicht.

---

## 8. Typische Fehlerquellen

| Symptom | Ursache |
|---|---|
| 404 auf alle Dateien | Ordnerstruktur stimmt nicht — `materials/` muss **direkt** unter der `sv_downloadurl`-Wurzel liegen, nicht unter `garrysmod/materials/` |
| Einzelne Dateien fehlen | **Groß-/Kleinschreibung.** Linux-Webserver unterscheiden sie, Windows nicht. Alles konsequent kleinschreiben |
| `.bz2` wird als Text ausgeliefert | MIME-Typ fehlt → `application/x-bzip2` konfigurieren |
| Map lädt nicht, 0-Byte-Datei | siehe Warnung in Abschnitt 4 — `.bsp` unkomprimiert daneben legen |
| Downloads bleiben langsam | `sv_downloadurl` falsch geschrieben oder Server nicht neu gestartet. Tippfehler fallen nicht auf, es wird still auf ServerDL zurückgefallen |
| Neue Dateien kommen nicht an | `resource.AddFile` vergessen — hochladen allein genügt nicht |
| Alte Version bleibt hängen | Client-Cache. `garrysmod/download/` löschen lassen |
| 403 Forbidden | Dateirechte auf dem Webserver, oder `autoindex`/Directory-Regel blockiert |

---

## 9. Reihenfolge für den ersten Aufbau

1. Subdomain + Webserver einrichten, HTTPS aktivieren
2. Sync-Skript einmal laufen lassen, Ergebnis hochladen
3. Eine Testdatei im Browser aufrufen — erst weitermachen, wenn das klappt
4. `sv_downloadurl` setzen, Server neu starten
5. Mit leerem `download/`-Ordner verbinden und beobachten
6. `resource.AddFile` für alles ergänzen, was noch fehlt
7. Wenn stabil: `sv_allowdownload 0`

---

## Quellen

- [Serving Content — Garry's Mod Wiki](https://wiki.facepunch.com/gmod/Serving_Content)
- [sv_downloadurl — Valve Developer Community](https://developer.valvesoftware.com/wiki/Sv_downloadurl)
- [Trouble with extracting bz2 files — garrysmod-issues #4106](https://github.com/Facepunch/garrysmod-issues/issues/4106)
