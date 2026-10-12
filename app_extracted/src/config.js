const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Gepackte Version (npm run build): Flash-Plugin und server.txt stecken in der App (resources/, scripts/build.js
// schreibt die Server-Adresse beim Bauen hinein). Eine server.txt neben der .exe/.app geht vor (Tests, eigene Server).
const packaged = app.isPackaged;
const appDir = !packaged
  ? null
  : process.platform === 'darwin'
    ? path.resolve(process.execPath, '..', '..', '..', '..') // X.app/Contents/MacOS/X -> Ordner der .app
    : path.dirname(process.execPath);

// server.txt: erste Zeile Server-Adresse, optional eine Zeile "content=<URL>" für den Updater.
// Zuerst neben der .exe/.app, sonst die beim Bauen eingebaute in resources/.
function serverTxt() {
  if (!appDir) return [];
  for (const dir of [appDir, process.resourcesPath]) {
    try {
      const lines = fs.readFileSync(path.join(dir, 'server.txt'), 'utf8').split(/\r?\n/).map((l) => l.trim());
      if (lines.some(Boolean)) return lines;
    } catch (e) {
      // nicht da -> nächste Stelle
    }
  }
  return []; // nirgends -> lokal
}
const txt = serverTxt();

// Server-Adresse: DB_SERVER, sonst erste Zeile von server.txt, sonst lokal.
// Form "host" oder "host:loginport" (z. B. 193.111.248.52:4443, wenn 443 auf dem Server belegt ist).
function serverAddress() {
  if (process.env.DB_SERVER) return process.env.DB_SERVER;
  if (txt[0] && !txt[0].includes('=')) return txt[0];
  return '127.0.0.1';
}

function flashPluginDir() {
  if (!packaged) return path.resolve(__dirname, '..', 'plugins');
  return path.join(process.resourcesPath, 'plugins'); // beide Systeme: in der App (scripts/build.js extraResource)
}

const LOGIN_PORT = 443; // Connection.LOGINSERVER_PORT, im Client fest
const GAME_PORT = 7498; // server/dbserver/config.py (--game-port)
const CONTENT_PORT = 7499; // server/dbserver/content.py (--content-port)
const POLICY_PORT = 843; // Flash-Socket-Policy
const [serverHost, portText] = serverAddress().split(':');
const loginPort = Number(portText) || LOGIN_PORT;
// Server auf einem anderen Rechner: alle Verbindungen laufen über den Launcher (forward.js), mit Tunnel als Ausweg
const remote = !['127.0.0.1', 'localhost', '::1'].includes(serverHost);

const contentLine = txt.find((l) => l.startsWith('content='));

module.exports = {
  // Client-Updater (updater.js): Spieldateien vom Server in einen lokalen Zwischenspeicher laden.
  // Gepackt immer; beim Entwickeln (npm start) nur mit DB_UPDATE=1, sonst direkt aus client/ des Repos.
  updater: packaged || process.env.DB_UPDATE === '1',
  contentUrl: (process.env.DB_CONTENT_URL || (contentLine && contentLine.slice(8)) || `http://${serverHost}:${CONTENT_PORT}`)
    .replace(/\/+$/, ''),
  // Zwischenspeicher: DB_CACHE, sonst <userData>/client (wird in main.js gesetzt, nach DB_PROFILE)
  cacheDir: process.env.DB_CACHE || null,
  updateCheckMinutes: 5, // während des Spiels nach neuen Client-Dateien fragen

  // Ohne Updater: Ordner mit den gespiegelten Webseiten (ein Unterordner pro Hostname) …
  contentDir: path.resolve(__dirname, '..', '..', 'client', 'content'),
  // … und Erweiterungen (server/tools/patch_client.py): gleiche Pfade wie contentDir, haben Vorrang
  patchedDir: path.resolve(__dirname, '..', '..', 'client', 'patched'),

  // Lokaler HTTP-Server, auf den alle unten gelisteten Hosts umgeleitet werden
  // DB_HTTP_PORT: anderer Port, z. B. für einen zweiten Client auf demselben Rechner
  httpPort: Number(process.env.DB_HTTP_PORT) || 8090,
  mirroredHosts: ['db.bmgstatic.com', 'api.gameanalytics.com', 'www.dungeonblitz.com', 'dungeonblitz.com'],

  // Der Client hat die Login-Server-IP fest eingebaut -> auf unseren eigenen Server umbiegen
  // (DB_SERVER=<IP oder Hostname> bzw. server.txt für einen Server auf einem anderen Rechner).
  // Entfernter Server: Login-IP und Server-Adresse (= Game-Server aus TRANSFER_TO_GAMESERVER, deshalb in server.txt
  // die IP aus --public-host eintragen) auf 127.0.0.1, der Launcher reicht 443/Game-Port weiter (forward.js).
  // Lokal mit eigenem Login-Port: nur 443 weiterreichen.
  gameServerRedirects: remote
    ? { '199.229.253.141': '127.0.0.1', [serverHost]: '127.0.0.1' }
    : { '199.229.253.141': loginPort === LOGIN_PORT ? serverHost : '127.0.0.1' },
  serverHost,
  remote,
  // Ports des Servers: aus server.txt bzw. Standard, main.js übernimmt /client/server.json des Servers
  ports: { login: loginPort, game: GAME_PORT, policy: POLICY_PORT },
  localPorts: { login: LOGIN_PORT, game: GAME_PORT, policy: POLICY_PORT },

  // DB_PROFILE: eigener Profilordner (Cache, Flash-Speicher), nötig für einen zweiten Client gleichzeitig
  profileDir: process.env.DB_PROFILE || null,

  // Entspricht dem Flashpoint-Launch-Command: DungeonBlitz.swf?fv=cbq&gv=cbv
  swfUrl: 'http://db.bmgstatic.com/p/cbv/DungeonBlitz.swf?fv=cbq&gv=cbv',
  stage: { width: 1152, height: 768 },

  flashVersion: '32.0.0.344',
  flashPluginDir: flashPluginDir(),
};
