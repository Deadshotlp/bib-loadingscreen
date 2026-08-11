# Loading Screen API

Liefert dem Ladebildschirm die Charakterdaten des joinenden Spielers.
Reines PHP, keine Composer-Abhängigkeiten. PHP 7.4+, `pdo_mysql`.

---

## Einrichtung

**1. Nur-Lese-Benutzer in MySQL anlegen.** Der Webserver ist von außen
erreichbar und hat auf eurer Gamemode-Datenbank nichts zu schreiben:

```sql
CREATE USER 'loadingscreen_ro'@'localhost'
       IDENTIFIED BY 'ein-langes-zufaelliges-passwort';
GRANT SELECT ON starwarsrp.pd_characters TO 'loadingscreen_ro'@'localhost';
FLUSH PRIVILEGES;
```

Nur `SELECT`, nur auf `pd_characters`.

**2. Konfiguration anlegen:**

```bash
cp config.example.php config.php
```

Dann `config.php` ausfüllen. Sie ist per `.gitignore` ausgeschlossen.

**3. Cacheverzeichnis beschreibbar machen:**

```bash
mkdir -p cache && chmod 770 cache
```

**4. Endpoint im Screen eintragen** — in `public/config.js`:

```js
api: {
  playerEndpoint: "https://deine-domain.de/api/player.php",
  timeoutMs: 4000
}
```

Liegt die API auf einer **anderen** Domain als der Screen, zusätzlich
`cors_origin` in der `config.php` auf die Origin des Screens setzen.
Niemals `*`.

---

## Test

```bash
curl "https://deine-domain.de/api/player.php?steamid=76561198000000000"
```

Erwartete Antworten:

| Fall | Status | Body |
|---|---|---|
| Charakter gefunden | 200 | `{"ok":true,"found":true,"name":"…",…}` |
| Kein Charakter | 200 | `{"ok":true,"found":false,"returning":false}` |
| Kaputte SteamID | 400 | `{"ok":false,"error":"invalid_steamid"}` |
| Zu viele Anfragen | 429 | `{"ok":false,"error":"rate_limited"}` |
| DB nicht erreichbar | 503 | `{"ok":false,"error":"db_unavailable"}` |

Diese müssen **404** liefern, sonst stimmt der Schutz nicht:

```
https://deine-domain.de/api/config.php
https://deine-domain.de/api/lib.php
https://deine-domain.de/api/cache/
```

Zur Fehlersuche kurzzeitig `'debug' => true` setzen — dann stehen
Datenbankfehler im Klartext in der Antwort. **Im Betrieb wieder auf
`false`.**

Getestet wurde gegen einen PHP-Entwicklungsserver mit absichtlich
toter Datenbank — alle sechs Pfade oben liefern die erwarteten
Statuscodes und einen sauberen JSON-Body.

### BOM in der config.php

Die API ist dagegen abgehärtet, aber es lohnt sich zu wissen:

Schreibt dein Editor die `config.php` mit **UTF-8-BOM** (Notepad,
PowerShell `Set-Content -Encoding utf8` und andere tun das
standardmäßig), gelten die drei Bytes vor `<?php` als Ausgabe. Ohne
Gegenmaßnahme kann PHP danach weder Header noch Statuscode setzen: die
API antwortet mit **200 statt 400/429/503** und schiebt Warnungen in den
JSON-Body — ein Fehlerbild, das schwer zu deuten ist.

`lib.php` puffert deshalb ab der ersten Zeile und verwirft
Fremdausgabe, bevor Header rausgehen. Trotzdem: speichere die
`config.php` als **UTF-8 ohne BOM** und lass keine Leerzeile vor
`<?php` stehen.

---

## nginx

Die mitgelieferte `.htaccess` greift nur bei Apache. Für nginx:

```nginx
location /api/ {
    location ~ ^/api/(config\.php|config\.example\.php|lib\.php)$ { return 404; }
    location ~ ^/api/cache/                                       { return 404; }

    location ~ ^/api/player\.php$ {
        include        fastcgi_params;
        fastcgi_pass   unix:/run/php/php8.2-fpm.sock;
        fastcgi_param  SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    return 404;
}
```

Die Reihenfolge ist wichtig: die Sperren stehen **vor** dem
`player.php`-Block.

---

## Woher die Daten kommen

Tabelle `pd_characters` aus `_character/sv_functions.lua`:

| Spalte | Verwendung |
|---|---|
| `char_name` | Anzeigename (hat Vorrang vor dem Steam-Namen) |
| `char_rank` | Rang, ersatzweise `job_name` |
| `char_playtime` | Dienstzeit, BIGINT in **Sekunden** |
| `char_cratedate` / `char_lastplaytime` | ob „Willkommen zurück" oder „Willkommen an Bord" |
| `faction_unit` | Einheit |
| `faction_subunit` / `job_unit` | Zuordnung zum Zug über die `platoons`-Map |

Hat ein Spieler mehrere Charaktere, gewinnt der **zuletzt gespielte**.

> `char_lastplaytime` steht als `%d.%m.%Y %H:%M:%S` in der Datenbank und
> ist damit nicht lexikografisch sortierbar. Die Abfrage geht deshalb
> über `STR_TO_DATE(...)`, mit `char_playtime` und `slot_index` als
> Rückfallebene. Ohne das bekämst du bei mehreren Charakteren den
> falschen.

### Zug-Zuordnung anpassen

Die `platoons`-Map in der `config.php` prüft case-insensitiv als
Teilstring gegen Subunit, Unit und Job-Unit. Passe die Schlüssel an eure
tatsächlichen Bezeichnungen an:

```php
'platoons' => [
    'lip' => '1. Zug — LIP',
    'hip' => '2. Zug — HIP',
    // …
],
```

Kein Treffer → es wird die Rohbezeichnung aus `faction_subunit`
ausgegeben.

---

## Sicherheit

**Das Endpoint ist öffentlich und die SteamID im Parameter ist trivial
fälschbar.** Jeder kann für jede beliebige SteamID abfragen. Es gibt
deshalb ausschließlich Anzeigedaten aus, die ohnehin jeder Mitspieler im
Spiel sieht.

Eingebaut:

- SteamID64 wird gegen `/^7656119[0-9]{10}$/` geprüft, bevor die
  Datenbank sie sieht
- ausschließlich Prepared Statements; der Tabellenname kommt nicht aus
  Benutzereingaben und wird zusätzlich gegen `[A-Za-z0-9_]+` validiert
- Drosselung pro IP (Standard 30 Anfragen / 60 s), Basis ist
  `REMOTE_ADDR` — bewusst **nicht** `X-Forwarded-For`, das wäre
  fälschbar. Hinter einem Reverse Proxy in `bib_client_ip()` anpassen.
- Datenbankfehler gehen ins Error-Log, nicht zum Client (außer bei
  `debug`)
- Steam-Key bleibt serverseitig und landet nie im Browser
- Steam-Antworten werden gecacht (Standard 1 h)

**Nicht ausgegeben und dabei belassen:** `char_money`, interne IDs,
IP-Adressen, Warns, Ban-Gründe.

Wenn du später mehr Felder ergänzt, prüfe jedes einzeln gegen die Frage:
*Darf das ein Fremder über eine beliebige SteamID abfragen?*
