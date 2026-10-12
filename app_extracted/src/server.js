const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.swf': 'application/x-shockwave-flash',
  '.swz': 'application/octet-stream',
  '.xml': 'text/xml; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript',
  '.css': 'text/css',
};

const OPEN_CROSSDOMAIN =
  '<?xml version="1.0"?><cross-domain-policy><site-control permitted-cross-domain-policies="all"/>' +
  '<allow-access-from domain="*" secure="false"/><allow-http-request-headers-from domain="*" headers="*" secure="false"/>' +
  '</cross-domain-policy>';

// Grau des Spielrahmens (UI_0.swf a_EdgeFull, Fläche #484955): der Rahmen hat ausgeschnittene Ecken, und bei
// abweichendem Seitenverhältnis bleibt neben der Bühne Platz - beides soll wie der Rahmen aussehen, nicht schwarz.
const FRAME_GRAY = '#484955';

function playPage(cfg) {
  const { width, height } = cfg.stage;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Dungeon Blitz</title>
<style>
  html, body { margin: 0; height: 100%; background: ${FRAME_GRAY}; overflow: hidden; }
  embed { display: block; width: 100%; height: 100%; }
</style></head>
<body>
  <embed src="${cfg.swfUrl}" type="application/x-shockwave-flash"
    width="${width}" height="${height}" quality="high" scale="showall" bgcolor="${FRAME_GRAY}"
    allowscriptaccess="always" allowfullscreen="true" allownetworking="all" wmode="direct"
    flashvars="${new URL(cfg.swfUrl).search.slice(1)}">
</body></html>`;
}

function start(cfg) {
  const server = http.createServer((req, res) => {
    const host = (req.headers.host || '').split(':')[0].toLowerCase();
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (process.env.DB_LOG) console.log(`[http] ${req.method} ${host}${req.url}`);

    if (urlPath === '/__play') {
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      return res.end(playPage(cfg));
    }

    const hostDir = path.join(cfg.contentDir, host);
    let file = path.join(hostDir, urlPath);
    if (!file.startsWith(hostDir + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    const patched = cfg.patchedDir && path.join(cfg.patchedDir, host, urlPath);
    if (patched && fs.existsSync(patched)) file = patched;

    fs.stat(file, (err, st) => {
      if (!err && st.isFile()) {
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Content-Length': st.size,
          'Cache-Control': 'no-store', // lokal ohnehin schnell; so taucht jede Anfrage im Log auf
        });
        if (urlPath.endsWith('/DungeonBlitz.swf')) console.log('[http] Spiel wird geladen');
        return fs.createReadStream(file).pipe(res);
      }
      // GameAnalytics-Tracking ist tot -> einfach bestätigen
      if (host === 'api.gameanalytics.com') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end('{"status":"ok"}');
      }
      if (urlPath === '/crossdomain.xml') {
        res.writeHead(200, { 'Content-Type': MIME['.xml'] });
        return res.end(OPEN_CROSSDOMAIN);
      }
      console.warn(`[http] 404 ${host}${req.url}`);
      res.writeHead(404);
      res.end();
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(cfg.httpPort, '127.0.0.1', () => resolve(server));
  });
}

module.exports = { start, FRAME_GRAY };
