/* =====================================================================
   Brothers in Blue — Loading Screen
   Statischer Webserver fuer den Pelican-Container.

   Bewusst OHNE Abhaengigkeiten: kein npm install zur Laufzeit, nichts
   was im Container kaputtgehen oder veralten kann. Reines Node.

   Umgebungsvariablen (setzt Pelican):
     SERVER_PORT   Port aus der Allocation        (Pflicht, Fallback 3002)
     SERVER_IP     Bind-Adresse                   (Fallback 0.0.0.0)
     SERVE_DIR     Auszulieferndes Verzeichnis    (Fallback ./dist)
   ===================================================================== */

"use strict";

const http = require("http");
const fs   = require("fs");
const path = require("path");
const url  = require("url");

const PORT = parseInt(process.env.SERVER_PORT || "3002", 10);
const HOST = process.env.SERVER_IP || "0.0.0.0";
const ROOT = path.resolve(process.env.SERVE_DIR || path.join(__dirname, "dist"));

/* ---------------------------------------------------------------------
   MIME-Typen. Nur was der Loading Screen tatsaechlich ausliefert.
   --------------------------------------------------------------------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".mp3":  "audio/mpeg",
  ".ogg":  "audio/ogg",
  ".wav":  "audio/wav",
  ".webm": "video/webm",
  ".mp4":  "video/mp4",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".txt":  "text/plain; charset=utf-8"
};

/* ---------------------------------------------------------------------
   Cache-Strategie

   bundle/    gehashte Dateinamen -> darf ewig gecacht werden
   config.js  wird von Hand geaendert -> niemals cachen
   index.html Einstiegspunkt, verweist auf die Hashes -> nicht cachen
   Rest       moderat
   --------------------------------------------------------------------- */
function cacheHeader(pathname) {
  if (pathname === "/config.js")            return "no-store";
  if (pathname === "/" ||
      pathname.endsWith(".html"))           return "no-cache";
  if (pathname.startsWith("/bundle/"))      return "public, max-age=2592000, immutable";
  return "public, max-age=3600";
}

/* ---------------------------------------------------------------------
   Pfadaufloesung mit Schutz gegen Directory Traversal.
   Gibt null zurueck, wenn der Pfad aus ROOT herausfuehrt.
   --------------------------------------------------------------------- */
function resolveSafe(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (e) {
    return null;                       // kaputtes Prozent-Encoding
  }

  if (decoded.indexOf("\0") !== -1) return null;

  if (decoded === "/" || decoded === "") decoded = "/index.html";

  const target = path.resolve(ROOT, "." + path.posix.normalize(decoded));

  /* Muss innerhalb von ROOT liegen. Der Separator verhindert, dass
     z.B. /var/www/loading-evil als Treffer fuer /var/www/loading gilt. */
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;

  return target;
}

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  }, headers || {}));
  res.end(body);
}

const server = http.createServer(function (req, res) {
  const started = Date.now();

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method Not Allowed", { "Allow": "GET, HEAD" });
    return log(req, res, started);
  }

  const pathname = url.parse(req.url).pathname || "/";
  const file = resolveSafe(pathname);

  if (!file) {
    send(res, 400, "Bad Request");
    return log(req, res, started);
  }

  fs.stat(file, function (err, stat) {
    if (err || !stat.isFile()) {
      send(res, 404, "Not Found");
      return log(req, res, started);
    }

    const headers = {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": cacheHeader(pathname),
      "Last-Modified": stat.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff"
    };

    /* Unveraendert seit dem letzten Abruf? Dann nichts uebertragen. */
    const since = req.headers["if-modified-since"];
    if (since && Date.parse(since) >= Math.floor(stat.mtime.getTime() / 1000) * 1000) {
      res.writeHead(304, headers);
      res.end();
      return log(req, res, started);
    }

    res.writeHead(200, headers);

    if (req.method === "HEAD") {
      res.end();
      return log(req, res, started);
    }

    const stream = fs.createReadStream(file);
    stream.on("error", function () {
      res.destroy();
    });
    stream.on("close", function () {
      log(req, res, started);
    });
    stream.pipe(res);
  });
});

function log(req, res, started) {
  /* Landet in der Pelican-Konsole */
  console.log(
    "[" + new Date().toISOString().substring(11, 19) + "] " +
    res.statusCode + " " + req.method + " " + req.url +
    " (" + (Date.now() - started) + "ms)"
  );
}

/* ---------------------------------------------------------------------
   Start
   --------------------------------------------------------------------- */

if (!fs.existsSync(ROOT)) {
  console.error("[BIB] FEHLER: Verzeichnis nicht gefunden: " + ROOT);
  console.error("[BIB] Liegt der Build im Container? Erwartet wird der");
  console.error("[BIB] Inhalt von dist/ unter /home/container/dist/.");
  process.exit(1);
}

if (!fs.existsSync(path.join(ROOT, "index.html"))) {
  console.error("[BIB] FEHLER: index.html fehlt in " + ROOT);
  console.error("[BIB] Vermutlich wurde der Build nie erzeugt oder der");
  console.error("[BIB] falsche Ordner hochgeladen.");
  process.exit(1);
}

server.listen(PORT, HOST, function () {
  console.log("[BIB] Wurzelverzeichnis: " + ROOT);
  console.log("[BIB] Loading Screen bereit auf " + HOST + ":" + PORT);
});

/* Pelican stoppt per SIGINT/SIGTERM — sauber herunterfahren. */
["SIGINT", "SIGTERM"].forEach(function (sig) {
  process.on(sig, function () {
    console.log("[BIB] " + sig + " empfangen, fahre herunter.");
    server.close(function () { process.exit(0); });
    setTimeout(function () { process.exit(0); }, 3000).unref();
  });
});
