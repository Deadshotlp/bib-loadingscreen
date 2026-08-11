<?php
/**
 * Brothers in Blue — Loading Screen API
 * Hilfsfunktionen: Konfiguration, Datenbank, Steam, Drosselung.
 *
 * Diese Datei wird von player.php eingebunden und liefert selbst
 * keine Ausgabe.
 */

declare(strict_types=1);

/* =====================================================================
   AUSGABEPUFFER

   Schutz gegen eine haeufige und sehr unangenehme Fehlerquelle:
   Enthaelt config.php ein UTF-8-BOM oder eine Leerzeile vor '<?php'
   — was praktisch jeder Windows-Editor produziert —, gilt das als
   Ausgabe. Danach laesst sich kein Header und kein Statuscode mehr
   setzen: die API antwortet mit 200 statt 400/429/503 und schiebt
   PHP-Warnungen in den JSON-Body.

   Wir puffern deshalb alles und verwerfen streunende Ausgabe, bevor
   wir Header senden.
   ===================================================================== */

ob_start();

/* Fehler gehoeren ins Log, nicht in eine JSON-Antwort. */
@ini_set('display_errors', '0');
@ini_set('log_errors', '1');

/**
 * Verwirft gepufferte Fremdausgabe, laesst den Puffer aber AKTIV.
 *
 * Wichtig: ob_end_clean() wuerde den Puffer schliessen — spaetere
 * Ausgabe (z.B. ein zweites Einlesen der config.php mit BOM) ginge dann
 * direkt raus und wuerde Header und Statuscode blockieren.
 */
function bib_discard_stray_output(): void
{
    if (ob_get_level() > 0) {
        @ob_clean();
    }
}

/**
 * Debug-Schalter. Bewusst mit eigenem static, damit config.php auch
 * dann hoechstens einmal eingelesen wird, wenn bib_fail() zuschlaegt,
 * bevor bib_config() je gelaufen ist.
 */
function bib_debug_enabled(): bool
{
    static $known = null;
    if ($known !== null) {
        return $known;
    }

    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        return $known = false;
    }

    $c = @include $path;
    return $known = (is_array($c) && !empty($c['debug']));
}

/* =====================================================================
   KONFIGURATION
   ===================================================================== */

function bib_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }

    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        bib_fail(500, 'not_configured',
            'config.php fehlt. config.example.php kopieren und ausfuellen.');
    }

    $cfg = require $path;
    if (!is_array($cfg)) {
        bib_fail(500, 'bad_config', 'config.php liefert kein Array zurueck.');
    }
    return $cfg;
}

/* =====================================================================
   AUSGABE
   ===================================================================== */

function bib_send_headers(): void
{
    $cfg = bib_config();

    bib_discard_stray_output();

    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');

    /* Antworten nicht cachen — der Screen soll aktuelle Daten sehen. */
    header('Cache-Control: no-store, max-age=0');

    $origin = (string)($cfg['cors_origin'] ?? '');
    if ($origin !== '') {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
}

function bib_json($data, int $status = 200): void
{
    bib_discard_stray_output();
    http_response_code($status);
    echo json_encode($data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Bricht mit einem Fehler ab. Details landen nur im Log bzw. bei
 * aktiviertem debug in der Antwort — nie versehentlich beim Client.
 */
function bib_fail(int $status, string $code, string $detail = ''): void
{
    $debug = bib_debug_enabled();

    if ($detail !== '') {
        error_log('[bib-api] ' . $code . ': ' . $detail);
    }

    $body = ['ok' => false, 'error' => $code];
    if ($debug && $detail !== '') {
        $body['detail'] = $detail;
    }

    bib_discard_stray_output();
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

/* =====================================================================
   EINGABEPRUEFUNG
   ===================================================================== */

/**
 * Eine SteamID64 ist 17-stellig und beginnt bei Individual-Accounts
 * mit 7656119. Alles andere weisen wir ab, bevor es die Datenbank sieht.
 */
function bib_valid_steamid64(string $id): bool
{
    return (bool)preg_match('/^7656119[0-9]{10}$/', $id);
}

/* =====================================================================
   DROSSELUNG
   Dateibasiertes gleitendes Fenster pro IP. Reicht fuer diesen Zweck
   und braucht kein Redis.
   ===================================================================== */

function bib_cache_dir(): string
{
    $cfg = bib_config();
    $dir = (string)($cfg['cache_dir'] ?? (__DIR__ . '/cache'));

    if (!is_dir($dir) && !@mkdir($dir, 0770, true) && !is_dir($dir)) {
        bib_fail(500, 'cache_unavailable', 'Cache-Verzeichnis nicht anlegbar: ' . $dir);
    }
    return $dir;
}

function bib_client_ip(): string
{
    /* REMOTE_ADDR bewusst ohne X-Forwarded-For: das waere faelschbar.
       Hinter einem Reverse Proxy hier gezielt anpassen. */
    return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function bib_rate_limit(): void
{
    $cfg    = bib_config();
    $max    = (int)($cfg['rate_limit']['max'] ?? 30);
    $window = (int)($cfg['rate_limit']['window'] ?? 60);
    if ($max <= 0) {
        return;
    }

    $file = bib_cache_dir() . '/rl_' . sha1(bib_client_ip()) . '.json';
    $now  = time();

    $hits = [];
    if (is_file($file)) {
        $raw = @file_get_contents($file);
        $dec = $raw !== false ? json_decode($raw, true) : null;
        if (is_array($dec)) {
            $hits = $dec;
        }
    }

    /* Alles ausserhalb des Fensters verwerfen */
    $hits = array_values(array_filter($hits, static function ($t) use ($now, $window) {
        return is_int($t) && ($now - $t) < $window;
    }));

    if (count($hits) >= $max) {
        header('Retry-After: ' . $window);
        bib_fail(429, 'rate_limited');
    }

    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
}

/* =====================================================================
   DATENBANK
   ===================================================================== */

function bib_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $c = bib_config()['db'] ?? [];

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        (string)($c['host'] ?? '127.0.0.1'),
        (int)($c['port'] ?? 3306),
        (string)($c['name'] ?? ''),
        (string)($c['charset'] ?? 'utf8mb4')
    );

    try {
        $pdo = new PDO($dsn, (string)($c['user'] ?? ''), (string)($c['pass'] ?? ''), [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_TIMEOUT            => 3,
        ]);
    } catch (Throwable $e) {
        bib_fail(503, 'db_unavailable', $e->getMessage());
    }

    return $pdo;
}

/**
 * Holt den zuletzt gespielten Charakter zu einer SteamID64.
 *
 * char_lastplaytime steht als '%d.%m.%Y %H:%M:%S' in der Datenbank und
 * ist damit NICHT lexikografisch sortierbar — deshalb STR_TO_DATE.
 * Faellt das aus (leeres oder kaputtes Feld), greift char_playtime,
 * danach der niedrigste Slot.
 */
function bib_fetch_character(string $steamid64): ?array
{
    $cfg   = bib_config();
    $table = (string)($cfg['table'] ?? 'pd_characters');

    /* Tabellennamen koennen nicht als Parameter gebunden werden.
       Deshalb streng validieren statt zu vertrauen. */
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        bib_fail(500, 'bad_config', 'Ungueltiger Tabellenname: ' . $table);
    }

    $sql = "SELECT `char_name`, `char_rank`, `char_playtime`,
                   `char_cratedate`, `char_lastplaytime`,
                   `faction_unit`, `faction_subunit`, `faction_job`,
                   `job_name`, `job_unit`, `slot_index`
              FROM `{$table}`
             WHERE `steamid64` = :sid
          ORDER BY STR_TO_DATE(`char_lastplaytime`, '%d.%m.%Y %H:%i:%s') DESC,
                   `char_playtime` DESC,
                   `slot_index` ASC
             LIMIT 1";

    try {
        $st = bib_db()->prepare($sql);
        $st->execute([':sid' => $steamid64]);
        $row = $st->fetch();
    } catch (Throwable $e) {
        bib_fail(503, 'db_query_failed', $e->getMessage());
    }

    return is_array($row) ? $row : null;
}

/* =====================================================================
   STEAM
   ===================================================================== */

/**
 * Avatar und Persona-Name von der Steam Web API, mit Dateicache.
 * Gibt null zurueck, wenn kein Key gesetzt ist oder etwas schiefgeht —
 * der Screen kommt ohne diese Daten aus.
 */
function bib_fetch_steam(string $steamid64): ?array
{
    $cfg = bib_config();
    $key = (string)($cfg['steam']['api_key'] ?? '');
    if ($key === '') {
        return null;
    }

    $ttl   = (int)($cfg['steam']['cache_ttl'] ?? 3600);
    $cache = bib_cache_dir() . '/steam_' . $steamid64 . '.json';

    if (is_file($cache) && (time() - (int)filemtime($cache)) < $ttl) {
        $dec = json_decode((string)@file_get_contents($cache), true);
        if (is_array($dec)) {
            return $dec;
        }
    }

    $url = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/'
         . '?key=' . urlencode($key)
         . '&steamids=' . urlencode($steamid64);

    $json = bib_http_get($url, (int)($cfg['steam']['timeout'] ?? 3));
    if ($json === null) {
        return null;
    }

    $dec = json_decode($json, true);
    $p   = $dec['response']['players'][0] ?? null;
    if (!is_array($p)) {
        return null;
    }

    $out = [
        'persona' => (string)($p['personaname'] ?? ''),
        'avatar'  => (string)($p['avatarfull'] ?? $p['avatarmedium'] ?? ''),
    ];

    @file_put_contents($cache, json_encode($out), LOCK_EX);
    return $out;
}

function bib_http_get(string $url, int $timeout): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => $timeout,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_USERAGENT      => 'bib-loadingscreen/1.0',
        ]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($body !== false && $code === 200) ? (string)$body : null;
    }

    $ctx = stream_context_create(['http' => [
        'timeout' => $timeout,
        'header'  => "User-Agent: bib-loadingscreen/1.0\r\n",
    ]]);
    $body = @file_get_contents($url, false, $ctx);
    return $body !== false ? (string)$body : null;
}

/* =====================================================================
   AUFBEREITUNG
   ===================================================================== */

/**
 * char_playtime steht in Sekunden. Fuer den Screen reicht eine grobe,
 * gut lesbare Angabe.
 */
function bib_format_playtime(int $seconds): string
{
    if ($seconds <= 0) {
        return '—';
    }
    if ($seconds < 3600) {
        return max(1, (int)floor($seconds / 60)) . ' min';
    }

    $h = (int)floor($seconds / 3600);
    $m = (int)floor(($seconds % 3600) / 60);

    if ($h < 10 && $m > 0) {
        return $h . ' h ' . $m . ' min';
    }
    return $h . ' h';
}

/**
 * Sucht den Anzeigenamen des Zuges. Geprueft wird gegen Subunit, Unit
 * und Job-Unit, case-insensitiv als Teilstring.
 */
function bib_map_platoon(array $row): string
{
    $map = bib_config()['platoons'] ?? [];
    if (!is_array($map) || !$map) {
        return '';
    }

    $haystacks = [
        (string)($row['faction_subunit'] ?? ''),
        (string)($row['faction_unit']    ?? ''),
        (string)($row['job_unit']        ?? ''),
    ];

    foreach ($haystacks as $h) {
        if ($h === '') {
            continue;
        }
        $lh = mb_strtolower($h);
        foreach ($map as $needle => $label) {
            if ($needle !== '' && mb_strpos($lh, mb_strtolower((string)$needle)) !== false) {
                return (string)$label;
            }
        }
    }

    /* Kein Treffer -> lieber die Rohbezeichnung als gar nichts */
    return (string)($row['faction_subunit'] ?? '');
}
