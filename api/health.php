<?php
/**
 * Brothers in Blue — Loading Screen API
 * GET /api/health.php
 *
 * Kurzer Lebenszeichen-Check fuer Einrichtung und Monitoring.
 *
 * Standard (oeffentlich, verraet nichts):
 *   {"ok":true,"service":"bib-loadingscreen-api"}
 *
 * Nur wenn in der config.php 'debug' => true gesetzt ist, kommen
 * zusaetzlich Diagnosewerte dazu. Im Betrieb debug auf false lassen —
 * sonst erfaehrt jeder Fremde, ob deine Datenbank gerade laeuft.
 */

declare(strict_types=1);

require __DIR__ . '/lib.php';

bib_send_headers();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    http_response_code(204);
    exit;
}

$out = [
    'ok'      => true,
    'service' => 'bib-loadingscreen-api',
];

if (bib_debug_enabled()) {

    $cacheDir      = __DIR__ . '/cache';
    $cacheWritable = is_dir($cacheDir) ? is_writable($cacheDir) : is_writable(__DIR__);

    /* Verbindung hier BEWUSST selbst aufbauen statt ueber bib_db():
       bib_db() bricht bei Fehlern per bib_fail() mit exit ab. Damit
       wuerde ausgerechnet der Fall, den diese Diagnose melden soll,
       die Diagnose beenden — 503 statt einer brauchbaren Meldung. */
    $dbOk     = false;
    $tableOk  = false;
    $dbDetail = 'nicht geprueft';

    $c   = bib_config()['db'] ?? [];
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        (string)($c['host'] ?? '127.0.0.1'),
        (int)($c['port'] ?? 3306),
        (string)($c['name'] ?? ''),
        (string)($c['charset'] ?? 'utf8mb4')
    );

    try {
        $pdo = new PDO($dsn, (string)($c['user'] ?? ''), (string)($c['pass'] ?? ''), [
            PDO::ATTR_ERRMODE          => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT          => 3,
        ]);
        $pdo->query('SELECT 1');
        $dbOk     = true;
        $dbDetail = 'verbunden';

        /* Ist die Charaktertabelle da und lesbar? */
        $table = (string)(bib_config()['table'] ?? 'pd_characters');
        if (preg_match('/^[A-Za-z0-9_]+$/', $table)) {
            try {
                $pdo->query("SELECT 1 FROM `{$table}` LIMIT 1");
                $tableOk = true;
            } catch (Throwable $e) {
                $dbDetail = 'verbunden, Tabelle nicht lesbar: ' . $e->getMessage();
            }
        }
    } catch (Throwable $e) {
        $dbDetail = $e->getMessage();
    }

    $out['debug'] = [
        'php'            => PHP_VERSION,
        'pdo_mysql'      => extension_loaded('pdo_mysql'),
        'curl'           => function_exists('curl_init'),
        'config_present' => is_file(__DIR__ . '/config.php'),
        'cache_writable' => $cacheWritable,
        'db'             => $dbDetail,
        'table_readable' => $tableOk,
        'steam_key_set'  => ((string)(bib_config()['steam']['api_key'] ?? '')) !== '',
    ];
}

bib_json($out);
