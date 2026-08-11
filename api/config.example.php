<?php
/**
 * Brothers in Blue — Loading Screen API
 * Beispielkonfiguration.
 *
 * KOPIEREN nach  config.php  und ausfuellen.
 * config.php ist per .gitignore ausgeschlossen und darf NIEMALS
 * ins Repository wandern — sie enthaelt Zugangsdaten.
 */

return [

    /* -----------------------------------------------------------------
       DATENBANK

       Lege dafuer einen EIGENEN MySQL-Benutzer mit NUR-LESE-Rechten an.
       Der Webserver ist von aussen erreichbar; er hat auf deiner
       Gamemode-Datenbank nichts zu schreiben.

           CREATE USER 'loadingscreen_ro'@'localhost'
                  IDENTIFIED BY 'ein-langes-zufaelliges-passwort';
           GRANT SELECT ON starwarsrp.pd_characters
                 TO 'loadingscreen_ro'@'localhost';
           FLUSH PRIVILEGES;

       Nur SELECT, nur auf die eine Tabelle.
       ----------------------------------------------------------------- */
    'db' => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'starwarsrp',
        'user'    => 'loadingscreen_ro',
        'pass'    => '',
        'charset' => 'utf8mb4',
    ],

    /* Tabellenname aus _character/sv_functions.lua (charSQLTable) */
    'table' => 'pd_characters',

    /* -----------------------------------------------------------------
       STEAM WEB API   (optional)

       Nur noetig fuer Avatar und Steam-Name.
       Key holen: https://steamcommunity.com/dev/apikey
       Leer lassen -> der Screen nutzt Charaktername und Helm-Platzhalter.

       Der Key bleibt serverseitig. Er darf NIE im Browser landen.
       ----------------------------------------------------------------- */
    'steam' => [
        'api_key'   => '',
        'cache_ttl' => 3600,   // Sekunden; Steam nicht unnoetig anfragen
        'timeout'   => 3,      // Sekunden, damit der Screen nicht haengt
    ],

    /* -----------------------------------------------------------------
       ZUORDNUNG SUBUNIT -> ANZEIGENAME DES ZUGES

       Geprueft wird gegen faction_subunit, faction_unit und job_unit,
       case-insensitiv als Teilstring. Der erste Treffer gewinnt.
       Passe die Schluessel an eure tatsaechlichen Bezeichnungen an.
       ----------------------------------------------------------------- */
    'platoons' => [
        'lip'      => '1. Zug — LIP',
        'light'    => '1. Zug — LIP',
        'hip'      => '2. Zug — HIP',
        'heavy'    => '2. Zug — HIP',
        'med'      => '3. Zug — Medical',
        'sani'     => '3. Zug — Medical',
        'engineer' => '4. Zug — Combat Engineers',
        'pionier'  => '4. Zug — Combat Engineers',
        'ce'       => '4. Zug — Combat Engineers',
    ],

    /* -----------------------------------------------------------------
       ZUGRIFF
       ----------------------------------------------------------------- */

    /* Liegt der Loading Screen auf derselben Domain wie diese API,
       leer lassen. Sonst die Origin des Screens eintragen,
       z.B. 'https://loading.deine-domain.de'. Niemals '*'. */
    'cors_origin' => '',

    /* Einfache Drosselung pro IP */
    'rate_limit' => [
        'max'    => 30,   // Anfragen
        'window' => 60,   // pro X Sekunden
    ],

    /* Schreibbares Verzeichnis fuer Steam- und Rate-Limit-Cache */
    'cache_dir' => __DIR__ . '/cache',

    /* NUR fuer die Einrichtung auf true stellen. Im Betrieb false,
       sonst landen Datenbankfehler im Klartext beim Client. */
    'debug' => false,
];
