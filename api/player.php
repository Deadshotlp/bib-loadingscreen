<?php
/**
 * Brothers in Blue — Loading Screen API
 * GET /api/player.php?steamid=7656119XXXXXXXXXX
 *
 * Antwort (200):
 * {
 *   "ok": true,
 *   "name": "CT-1409 'Echo'",
 *   "avatar": "https://avatars.steamstatic.com/....jpg",
 *   "unit": "Torrent Company",
 *   "rank": "Sergeant",
 *   "platoon": "2. Zug — HIP",
 *   "playtime": "142 h",
 *   "returning": true
 * }
 *
 * Kein Charakter gefunden (200):
 * { "ok": true, "found": false, "returning": false }
 *
 * ACHTUNG — DIESES ENDPOINT IST OEFFENTLICH.
 * Die SteamID im Parameter ist trivial faelschbar. Es darf deshalb
 * ausschliesslich Anzeigedaten ausgeben, die ohnehin jeder Mitspieler
 * im Spiel sehen kann. Keine IP-Adressen, keine Adminnotizen, keine
 * Ban-Gruende, kein Geld, keine internen IDs.
 */

declare(strict_types=1);

require __DIR__ . '/lib.php';

bib_send_headers();

/* Preflight kurz beantworten, falls der Screen auf anderer Origin liegt */
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Max-Age: 600');
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    bib_fail(405, 'method_not_allowed');
}

bib_rate_limit();

/* ---------------------------------------------------------------------
   Eingabe
   --------------------------------------------------------------------- */

$steamid = trim((string)($_GET['steamid'] ?? ''));

if ($steamid === '') {
    bib_fail(400, 'missing_steamid');
}
if (!bib_valid_steamid64($steamid)) {
    bib_fail(400, 'invalid_steamid');
}

/* ---------------------------------------------------------------------
   Charakter
   --------------------------------------------------------------------- */

$row = bib_fetch_character($steamid);

/* Steam-Daten auch ohne Charakter holen — ein Neuling soll wenigstens
   mit seinem Steam-Namen begruesst werden. */
$steam = bib_fetch_steam($steamid);

if ($row === null) {
    $out = [
        'ok'        => true,
        'found'     => false,
        'returning' => false,
    ];
    if ($steam !== null) {
        if ($steam['persona'] !== '') { $out['name']   = $steam['persona']; }
        if ($steam['avatar']  !== '') { $out['avatar'] = $steam['avatar']; }
    }
    bib_json($out);
}

/* ---------------------------------------------------------------------
   Aufbereiten
   --------------------------------------------------------------------- */

$playtimeSec = (int)($row['char_playtime'] ?? 0);

/* Als Rueckkehrer gilt, wer schon Spielzeit hat oder dessen letzter
   Login vom Erstelldatum abweicht. */
$created   = (string)($row['char_cratedate']    ?? '');
$lastSeen  = (string)($row['char_lastplaytime'] ?? '');
$returning = $playtimeSec > 0 || ($lastSeen !== '' && $lastSeen !== $created);

/* Charaktername hat Vorrang vor dem Steam-Namen — im Rollenspiel
   zaehlt der Charakter, nicht der Account. */
$name = trim((string)($row['char_name'] ?? ''));
if ($name === '' && $steam !== null && $steam['persona'] !== '') {
    $name = $steam['persona'];
}

$out = [
    'ok'        => true,
    'found'     => true,
    'name'      => $name,
    'unit'      => (string)($row['faction_unit'] ?? ''),
    'rank'      => trim((string)($row['char_rank'] ?? '')) !== ''
                     ? (string)$row['char_rank']
                     : (string)($row['job_name'] ?? ''),
    'platoon'   => bib_map_platoon($row),
    'playtime'  => bib_format_playtime($playtimeSec),
    'returning' => $returning,
];

if ($steam !== null && $steam['avatar'] !== '') {
    $out['avatar'] = $steam['avatar'];
}

/* Leere Felder gar nicht erst senden — der Screen blendet fehlende
   Werte ohnehin aus, das spart Rauschen. */
$out = array_filter($out, static function ($v) {
    return $v !== '' && $v !== null;
});

bib_json($out);
