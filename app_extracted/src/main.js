const { app, BrowserWindow, Menu, Notification, dialog, ipcMain, shell } = require('electron');
const { FRAME_GRAY } = require('./server');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const server = require('./server');
const { forward, policyServer } = require('./forward');
const updater = require('./updater');

function findFlashPlugin() {
  const name = {
    darwin: 'PepperFlashPlayer.plugin',
    win32: 'pepflashplayer.dll',
    linux: 'libpepflashplayer.so',
  }[process.platform];
  const p = path.join(cfg.flashPluginDir, name);
  return fs.existsSync(p) ? p : null;
}

if (cfg.profileDir) app.setPath('userData', path.resolve(cfg.profileDir));

// Nur einmal starten (je Profil): ein zweiter Start holt das offene Fenster nach vorn statt an belegten Ports zu
// scheitern. DB_PROFILE (zweiter Test-Client) hat ein eigenes Profil und damit eine eigene Sperre.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
}
app.setAboutPanelOptions({ applicationName: 'Dungeon Blitz', copyright: 'Fan project, not affiliated with Blue Mammoth Games.' });

// Protokoll in <userData>/launcher.log (gepackt sieht man die Konsole nicht) – zur Fehlersuche bei Spielern,
// im Updater-Bildschirm "Open log". Wird bei jedem Start neu angelegt.
const logFile = path.join(app.getPath('userData'), 'launcher.log');
try {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, `Dungeon Blitz Launcher ${app.getVersion()} (${process.platform}), ${new Date().toISOString()}\n`);
  for (const level of ['log', 'warn', 'error']) {
    const orig = console[level];
    console[level] = (...args) => {
      orig(...args);
      try {
        fs.appendFileSync(logFile, `${new Date().toTimeString().slice(0, 8)} ${args.join(' ')}\n`);
      } catch (e) {
        // Protokoll ist nur Hilfe
      }
    };
  }
} catch (e) {
  // kein Protokoll
}
if (cfg.updater) {
  // Spieldateien aus dem Zwischenspeicher des Updaters, nicht aus dem Repo
  cfg.cacheDir = path.resolve(cfg.cacheDir || path.join(app.getPath('userData'), 'client'));
  cfg.contentDir = cfg.cacheDir;
  cfg.patchedDir = null;
}

const flashPath = findFlashPlugin();
if (flashPath) {
  app.commandLine.appendSwitch('ppapi-flash-path', flashPath);
  app.commandLine.appendSwitch('ppapi-flash-version', cfg.flashVersion);
}

// Bildrate: das Spiel verlangt selbst 100 FPS (Main.as: stage.frameRate = §_-Rf§ ab Flash 11), Chromium bremst
// Plugins aber auf die Bildschirmfrequenz (meist 60). DB_VSYNC=1 lässt die Bremse an (bei Bildreißen).
if (process.env.DB_VSYNC !== '1') {
  app.commandLine.appendSwitch('disable-frame-rate-limit');
  app.commandLine.appendSwitch('disable-gpu-vsync');
}

// Kein Proxy: Chromium redet nur mit dem Launcher selbst (127.0.0.1 per host-resolver-rules). VPN-Programme stellen
// oft einen System-Proxy ein – dann gingen Flash-Sockets und Seitenabrufe an den Proxy, der die alte Login-IP
// 199.229.253.141 bzw. db.bmgstatic.com selbst auflöst, und nichts kam beim Launcher an (Spieler mit VPN, 10/2026).
// Nach außen verbindet sich nur Node (forward.js, updater.js), und das geht ohnehin am System-Proxy vorbei.
app.commandLine.appendSwitch('no-proxy-server');

// Alte Domains auf den lokalen Server bzw. unseren Game-Server umleiten
const rules = [
  ...cfg.mirroredHosts.map((h) => `MAP ${h} 127.0.0.1:${cfg.httpPort}`),
  ...Object.entries(cfg.gameServerRedirects).map(([from, to]) => `MAP ${from} ${to}`),
];
app.commandLine.appendSwitch('host-resolver-rules', rules.join(', '));

// Ports des Servers von ihm selbst (content.py /client/server.json) – dann genügt in server.txt die Adresse
async function refreshServerPorts() {
  if (!cfg.remote) return;
  try {
    const ports = await updater.fetchJson(`${cfg.contentUrl}/client/server.json`);
    for (const name of ['login', 'game']) if (Number.isInteger(ports[name])) cfg.ports[name] = ports[name];
    console.log(`[server] Ports: Login ${cfg.ports.login}, Game ${cfg.ports.game}`);
  } catch (e) {
    console.log(`[server] Ports nicht abrufbar (${e.message}), nehme Login ${cfg.ports.login}, Game ${cfg.ports.game}`);
  }
}

// Weiterleitungen (forward.js): entfernter Server -> Login + Game (direkt oder Tunnel); lokaler Server mit eigenem
// Login-Port -> nur 443. Die Flash-Policy beantwortet dann der Launcher.
function forwardList() {
  const route = (name) => ({
    name,
    host: cfg.serverHost,
    port: () => cfg.ports[name],
    contentUrl: cfg.remote ? cfg.contentUrl : null,
  });
  if (cfg.remote) return [route('login'), route('game')];
  return cfg.ports.login !== cfg.localPorts.login ? [route('login')] : [];
}

async function startForwards() {
  const routes = forwardList();
  for (const r of routes) {
    await forward(cfg.localPorts[r.name], r);
    console.log(`[forward] 127.0.0.1:${cfg.localPorts[r.name]} -> ${r.host} (${r.name})`);
  }
  if (routes.length) await policyServer(cfg.localPorts.policy);
}

const playUrl = 'http://db.bmgstatic.com/__play';
const UPDATER_BG = '#0d1314';     // Hintergrund des Updaters (wie die Webseite), im Spiel FRAME_GRAY
let win = null;
let updating = false;
let updateAvailable = false;

function sendUpdater(ev) {
  if (win && !win.isDestroyed()) win.webContents.send('updater:event', ev);
}

function setTitle() {
  if (win && !win.isDestroyed()) win.setTitle(updateAvailable ? 'Dungeon Blitz (update ready)' : 'Dungeon Blitz');
}

function startGame() {
  updateAvailable = false;
  setTitle();
  win.setBackgroundColor(FRAME_GRAY);
  win.loadURL(playUrl);
}

// Updater-Bildschirm zeigen, Dateien abgleichen, dann das Spiel laden. Läuft beim Start, nach jedem
// Verbindungsabbruch (das Spiel will dann www.dungeonblitz.com laden) und über das Menü.
async function runUpdate({ repair = false } = {}) {
  if (!cfg.updater) return startGame();
  if (updating) return;
  updating = true;
  try {
    win.setBackgroundColor(UPDATER_BG);
    await win.loadFile(path.join(__dirname, 'ui', 'updater.html'));
    await refreshServerPorts();
    await updater.update({ contentUrl: cfg.contentUrl, cacheDir: cfg.cacheDir, repair }, sendUpdater);
    await new Promise((r) => setTimeout(r, 600)); // "Entering World" kurz zeigen
    startGame();
  } catch (e) {
    console.log(`[update] Fehler: ${e.message}`);
    const offline = updater.installedComplete(cfg.cacheDir);
    sendUpdater({ phase: 'error', message: e.message, offline, unreachable: !!e.code }); // Netzwerkfehler haben einen code
  } finally {
    updating = false;
  }
}

ipcMain.on('updater:retry', () => runUpdate());
ipcMain.on('updater:offline', () => {
  if (!updating && updater.installedComplete(cfg.cacheDir)) startGame();
});
ipcMain.on('updater:quit', () => app.quit());
ipcMain.on('updater:repair', () => runUpdate({ repair: true }));
ipcMain.on('updater:log', () => shell.showItemInFolder(logFile));

// Während des Spiels: neue Client-Dateien auf dem Server? Dann Hinweis (Titel, Systemmeldung) – beim nächsten Start
// bzw. Verbindungsabbruch holt der Updater sie ohnehin; mitten im Spiel neu zu laden wäre schlimmer.
function watchForUpdates() {
  if (!cfg.updater) return;
  setInterval(async () => {
    if (updating || updateAvailable || !win || win.webContents.getURL() !== playUrl) return;
    try {
      const remote = await updater.remoteVersion(cfg.contentUrl);
      if (remote && remote !== updater.readState(cfg.cacheDir).version) {
        updateAvailable = true;
        setTitle();
        if (Notification.isSupported()) {
          new Notification({ title: 'Dungeon Blitz', body: 'A game update is ready. It installs the next time you start the game.' }).show();
        }
      }
    } catch (e) {
      // Server gerade nicht erreichbar -> beim nächsten Mal
    }
  }, cfg.updateCheckMinutes * 60 * 1000);
}

function createWindow() {
  win = new BrowserWindow({
    width: cfg.stage.width,
    height: cfg.stage.height,
    useContentSize: true,
    backgroundColor: UPDATER_BG,
    title: 'Dungeon Blitz',
    icon: process.platform === 'darwin' ? undefined : path.join(__dirname, 'ui', 'icon.png'), // Taskleiste
    autoHideMenuBar: true,
    webPreferences: {
      plugins: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'ui', 'preload.js'),
    },
  });
  win.on('page-title-updated', (e) => e.preventDefault()); // Titel setzt der Launcher (Update-Hinweis)
  win.webContents.on('before-input-event', (event, input) => shortcut(event, input));
  win.webContents.on('console-message', (ev, lvl, msg, line, src) => console.log('[console] (' + lvl + ') ' + msg + ' (' + src + ':' + line + ')'));
  runUpdate();

  // Das Spiel springt nach einem Verbindungsabbruch auf die alte Startseite
  // (www.dungeonblitz.com), um sich neu zu laden. Die gibt es nicht mehr -> Updater, dann Spiel neu laden.
  // Andere Links (Forum, News, ...) öffnen kein neues Fenster.
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== playUrl) {
      event.preventDefault();
      console.log(`[nav] ${url} -> Spiel neu laden`);
      runUpdate();
    }
  });
  win.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    console.log(`[nav] Popup blockiert: ${url}`);
  });

  // Debug: DB_SCREENSHOT=/pfad/bild.png -> Screenshot nach DB_SCREENSHOT_DELAY ms
  // und jedes Mal, wenn der Prozess SIGUSR2 bekommt (kill -USR2 <pid>)
  if (process.env.DB_SCREENSHOT) {
    const shoot = async () => {
      const img = await win.webContents.capturePage();
      fs.writeFileSync(process.env.DB_SCREENSHOT, img.toPNG());
      console.log(`[debug] Screenshot gespeichert: ${process.env.DB_SCREENSHOT}`);
    };
    setTimeout(shoot, Number(process.env.DB_SCREENSHOT_DELAY) || 15000);
    process.on('SIGUSR2', shoot);
  }
}

// Kein Spiel-Menü mehr (Spieler brauchen weder Neu laden noch DevTools): Windows ohne Menüleiste, macOS nur das
// übliche App-Menü (Über, Ausblenden, Beenden) und Fenster (Vollbild). Updates/Reparieren/Protokoll stehen im
// Updater-Bildschirm. Entwickeln (npm start) oder DB_DEBUG=1: DevTools per F12 / ⌥⌘I.
const devTools = true;

function setupMenu() {
  if (process.platform !== 'darwin') return Menu.setApplicationMenu(null);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' },
      { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { role: 'windowMenu', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'togglefullscreen' }] },
  ]));
}

// Tasten ohne Menü: F11 Vollbild (Windows), DevTools nur beim Entwickeln
function shortcut(event, input) {
  if (input.type !== 'keyDown') return;
  if (input.key === 'F11' && process.platform !== 'darwin') {
    win.setFullScreen(!win.isFullScreen());
    event.preventDefault();
  } else if (devTools && (input.key === 'F12' || (input.meta && input.alt && input.key.toLowerCase() === 'i'))) {
    win.webContents.toggleDevTools();
    event.preventDefault();
  }
}

app.whenReady().then(async () => {
  if (!app.hasSingleInstanceLock()) return;
  if (!flashPath) {
    dialog.showErrorBox('Dungeon Blitz', `The Flash player that runs the game is missing:\n${cfg.flashPluginDir}\n\n` +
      'Please reinstall Dungeon Blitz.');
    app.quit();
    return;
  }
  console.log(`[server] ${cfg.serverHost} (Login ${cfg.ports.login}), Client-Dateien ${cfg.contentUrl}`);
  try {
    await startForwards();
  } catch (e) {
    console.log(`[forward] ${e.message}`);
    dialog.showErrorBox('Dungeon Blitz', 'Dungeon Blitz is already running, or another program uses one of its ports ' +
      `(443, 843, 7498).\n\n${e.message}`);
    app.quit();
    return;
  }
  if (!cfg.updater) refreshServerPorts();
  try {
    await server.start(cfg);
    console.log(`[http] Inhalte aus ${cfg.contentDir} auf 127.0.0.1:${cfg.httpPort}`);
    if (cfg.updater) console.log(`[update] Client-Dateien von ${cfg.contentUrl}`);
  } catch (e) {
    dialog.showErrorBox('Dungeon Blitz', `Port ${cfg.httpPort} is in use by another program.\n\n${e.message}`);
    app.quit();
    return;
  }
  setupMenu();
  createWindow();
  watchForUpdates();
});

app.on('window-all-closed', () => app.quit());
