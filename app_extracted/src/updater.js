// Client-Updater: holt die Spieldateien (SWF/SWZ/MP3) vom Server (server/dbserver/content.py) in einen lokalen
// Zwischenspeicher und lädt nur, was sich geändert hat. Ablauf:
//   GET <contentUrl>/client/manifest.json -> {version, notes, files: {"<host>/<pfad>": {size, sha256}}}
//   mit dem installierten Stand (<cacheDir>/manifest.json) vergleichen -> fehlende/geänderte Dateien laden
//   (mehrere gleichzeitig, erst als .part, SHA-256 prüfen, dann umbenennen), Überzählige löschen.
// Der lokale HTTP-Server (server.js) spielt danach direkt aus <cacheDir> ab, gleiche Ordnerstruktur wie client/content.
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const PARALLEL = 4;
const TIMEOUT_MS = 20000;
const STATE_FILE = 'manifest.json';

function request(url, onResponse) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { timeout: TIMEOUT_MS }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} bei ${url}`));
      }
      onResponse(res, resolve, reject);
    });
    req.on('timeout', () => req.destroy(new Error(`Zeitüberschreitung bei ${url}`)));
    req.on('error', reject);
  });
}

function fetchJson(url) {
  return request(url, (res, resolve, reject) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(e);
      }
    });
    res.on('error', reject);
  });
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file)
      .on('data', (c) => h.update(c))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });
}

// Pfad aus dem Manifest -> Datei im Zwischenspeicher (nie außerhalb davon)
function localPath(cacheDir, rel) {
  const file = path.resolve(cacheDir, ...rel.split('/'));
  if (!file.startsWith(path.resolve(cacheDir) + path.sep) || rel.split('/').some((p) => p === '..' || p === '')) {
    throw new Error(`Ungültiger Pfad im Manifest: ${rel}`);
  }
  return file;
}

function readState(cacheDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cacheDir, STATE_FILE), 'utf8'));
  } catch (e) {
    return { version: null, files: {} };
  }
}

function writeState(cacheDir, state) {
  const file = path.join(cacheDir, STATE_FILE);
  fs.writeFileSync(file + '.tmp', JSON.stringify(state));
  fs.renameSync(file + '.tmp', file);
}

// Ist der installierte Stand vollständig (alle Dateien da, richtige Größe)? Dann kann man auch ohne Server-Kontakt spielen.
function installedComplete(cacheDir) {
  const state = readState(cacheDir);
  const entries = Object.entries(state.files);
  if (!state.version || !entries.length) return false;
  return entries.every(([rel, e]) => {
    try {
      return fs.statSync(localPath(cacheDir, rel)).size === e.size;
    } catch (err) {
      return false;
    }
  });
}

async function remoteVersion(contentUrl) {
  return (await fetchJson(`${contentUrl}/client/manifest.json`)).version;
}

function download(contentUrl, rel, entry, dest, onBytes) {
  const url = `${contentUrl}/client/files/${rel.split('/').map(encodeURIComponent).join('/')}`;
  const part = dest + '.part';
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  return request(url, (res, resolve, reject) => {
    const h = crypto.createHash('sha256');
    const out = fs.createWriteStream(part);
    let got = 0;
    res.on('data', (c) => {
      h.update(c);
      got += c.length;
      onBytes(c.length);
    });
    res.on('error', reject);
    out.on('error', reject);
    out.on('finish', () => {
      const sha = h.digest('hex');
      if (got !== entry.size || sha !== entry.sha256) {
        fs.unlink(part, () => {});
        const err = new Error(`Prüfsumme falsch: ${rel}`);
        err.changed = true; // Datei hat sich auf dem Server während des Ladens geändert -> Manifest neu holen
        return reject(err);
      }
      fs.renameSync(part, dest);
      resolve();
    });
    res.pipe(out);
  });
}

// Bringt <cacheDir> auf den Stand des Servers. progress(ev) bekommt:
//   {phase: 'check'} | {phase: 'download', done, total, bytes, totalBytes, file, speed} | {phase: 'done', ...}
// repair: alle vorhandenen Dateien neu hashen statt dem gespeicherten Stand zu vertrauen.
async function update({ contentUrl, cacheDir, repair = false }, progress) {
  fs.mkdirSync(cacheDir, { recursive: true });
  for (let attempt = 0; ; attempt++) {
    try {
      return await updateOnce(contentUrl, cacheDir, repair, progress);
    } catch (e) {
      if (!e.changed || attempt >= 2) throw e;
      console.log(`[update] ${e.message} -> neuer Versuch`);
    }
  }
}

async function updateOnce(contentUrl, cacheDir, repair, progress) {
  progress({ phase: 'check' });
  const remote = await fetchJson(`${contentUrl}/client/manifest.json`);
  const state = readState(cacheDir);
  progress({ phase: 'notes', version: remote.version, notes: remote.notes || '' });

  const todo = [];
  for (const [rel, entry] of Object.entries(remote.files)) {
    const file = localPath(cacheDir, rel);
    const have = state.files[rel];
    let ok = false;
    try {
      const st = fs.statSync(file);
      if (st.size === entry.size) {
        ok = repair ? (await sha256File(file)) === entry.sha256 : !!have && have.sha256 === entry.sha256;
      }
    } catch (e) {
      ok = false;
    }
    if (ok) state.files[rel] = entry;
    else todo.push([rel, entry, file]);
  }

  // Dateien, die der Server nicht mehr hat
  for (const rel of Object.keys(state.files)) {
    if (remote.files[rel]) continue;
    try {
      fs.unlinkSync(localPath(cacheDir, rel));
    } catch (e) {
      // schon weg
    }
    delete state.files[rel];
  }

  const totalBytes = todo.reduce((s, [, e]) => s + e.size, 0);
  let bytes = 0;
  let done = 0;
  const started = Date.now();
  const current = new Set();
  const report = () =>
    progress({
      phase: 'download',
      done,
      total: todo.length,
      bytes,
      totalBytes,
      file: [...current][0] || '',
      speed: bytes / Math.max(0.25, (Date.now() - started) / 1000),
    });

  if (todo.length) {
    console.log(`[update] ${todo.length} Dateien (${(totalBytes / 1e6).toFixed(1)} MB) von ${contentUrl}`);
    state.version = null; // unvollständig, bis alles da ist
    writeState(cacheDir, state);
    report();
    const queue = todo.slice();
    let lastReport = 0;
    const worker = async () => {
      while (queue.length) {
        const [rel, entry, file] = queue.shift();
        current.add(rel);
        await download(contentUrl, rel, entry, file, (n) => {
          bytes += n;
          if (Date.now() - lastReport > 100) {
            lastReport = Date.now();
            report();
          }
        });
        current.delete(rel);
        done++;
        state.files[rel] = entry;
        writeState(cacheDir, state);
        report();
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker));
  }

  state.version = remote.version;
  writeState(cacheDir, state);
  const result = { phase: 'done', version: remote.version, updated: todo.length, totalBytes };
  progress(result);
  return result;
}

module.exports = { update, installedComplete, remoteVersion, readState, fetchJson };
