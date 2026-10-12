const net = require('net');
const http = require('http');

// Verbindungen des Clients zum Server über den Launcher (nur bei einem Server auf einem anderen Rechner).
// Der Client verbindet sich fest auf Port 443 (Connection.LOGINSERVER_PORT) und danach auf die Game-Server-Adresse
// aus TRANSFER_TO_GAMESERVER. main.js leitet beide IPs auf 127.0.0.1 um; hier nimmt der Launcher sie an
// (443 bzw. Game-Port) und reicht sie weiter – je Verbindung auf dem ersten Weg, der klappt:
//   direkt   <host>:<Port des Servers> (Ports aus /client/server.json, sonst server.txt)
//   Tunnel   über den Port der Client-Dateien (HTTP-Upgrade, server/dbserver/content.py), falls bei einem Spieler
//            nur dieser durchkommt (Firewall, Provider sperrt 4443/7498 – im Browser lädt die Seite aber).
// Der zuletzt funktionierende Weg wird zuerst versucht. Die Flash-Socket-Policy (843) beantwortet der Launcher selbst.

const CONNECT_TIMEOUT_MS = 5000;
const POLICY_REQUEST = '<policy-file-request/>';
const POLICY_FILE =
  '<?xml version="1.0"?><cross-domain-policy><allow-access-from domain="*" to-ports="*"/></cross-domain-policy>\0';

const preferred = {}; // Ziel -> 'direkt' | 'Tunnel'
let policyAnswered = false;

function connectDirect(host, port) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, host);
    sock.setTimeout(CONNECT_TIMEOUT_MS, () => sock.destroy(new Error(`Zeitüberschreitung (${host}:${port})`)));
    sock.once('connect', () => {
      sock.setTimeout(0);
      sock.removeListener('error', reject);
      resolve(sock);
    });
    sock.once('error', reject);
  });
}

function connectTunnel(contentUrl, name) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${contentUrl}/tunnel/${name}`, {
      headers: { Connection: 'Upgrade', Upgrade: 'dbtunnel' },
      timeout: CONNECT_TIMEOUT_MS,
    });
    req.on('upgrade', (res, sock, head) => {
      if (head.length) sock.unshift(head);
      resolve(sock);
    });
    req.on('response', (res) => {
      res.resume();
      reject(new Error(`Tunnel: HTTP ${res.statusCode}`));
    });
    req.on('timeout', () => req.destroy(new Error(`Zeitüberschreitung (${contentUrl})`)));
    req.on('error', reject);
    req.end();
  });
}

async function openUpstream(route) {
  const ways = preferred[route.name] === 'Tunnel' ? ['Tunnel', 'direkt'] : ['direkt', 'Tunnel'];
  const errors = [];
  for (const way of ways) {
    if (way === 'Tunnel' && !route.contentUrl) continue;
    try {
      const sock =
        way === 'direkt' ? await connectDirect(route.host, route.port()) : await connectTunnel(route.contentUrl, route.name);
      if (preferred[route.name] !== way) console.log(`[forward] ${route.name}: ${way} verbunden`);
      preferred[route.name] = way;
      return sock;
    } catch (e) {
      errors.push(`${way}: ${e.message}`);
    }
  }
  throw new Error(errors.join('; '));
}

// macOS erlaubt Ports < 1024 ohne Admin-Rechte nur auf 0.0.0.0, nicht auf 127.0.0.1 (EACCES)
function listen(server, localPort) {
  return new Promise((resolve, reject) => {
    server.once('error', (e) => {
      if (e.code !== 'EACCES') return reject(e);
      server.once('error', reject);
      server.listen(localPort, '0.0.0.0', () => resolve(server));
    });
    server.listen(localPort, '127.0.0.1', () => resolve(server));
  });
}

// route: { name: 'login' | 'game', host, port: () => Zahl, contentUrl }
function forward(localPort, route) {
  const server = net.createServer({ pauseOnConnect: true }, async (client) => {
    client.on('error', () => client.destroy());
    console.log(`[forward] ${route.name}: Verbindung vom Spiel`);
    let upstream;
    try {
      upstream = await openUpstream(route);
    } catch (e) {
      console.log(`[forward] ${route.name}: Server nicht erreichbar (${e.message})`);
      return client.destroy();
    }
    if (client.destroyed) return upstream.destroy();
    const close = () => {
      client.destroy();
      upstream.destroy();
    };
    upstream.on('error', (e) => {
      console.log(`[forward] ${route.name}: Verbindung abgebrochen (${e.message})`);
      close();
    });
    client.on('close', close);
    upstream.on('close', close);
    client.on('data', (d) => {
      let off = 0;
      while (off + 4 <= d.length) {
        const id = d.readUInt16BE(off);
        const len = d.readUInt16BE(off + 2);
        console.log('[packet] Client -> ' + route.name + ': 0x' + id.toString(16) + ' (len ' + len + ')');
        if (id === 0x7c) {
          const report = d.subarray(off + 4, Math.min(d.length, off + 4 + len)).toString('utf8');
          console.log('\n==================================================');
          console.log('[FLASH CRASH REPORT 0x7C RECEIVED FROM GAME CLIENT]:');
          console.log(report);
          console.log('==================================================\n');
        }
        off += 4 + len;
      }
    });
    upstream.on('data', (d) => {
      let off = 0;
      while (off + 4 <= d.length) {
        const id = d.readUInt16BE(off);
        const len = d.readUInt16BE(off + 2);
        console.log('[packet] ' + route.name + ' -> Client: 0x' + id.toString(16) + ' (len ' + len + ')');
        off += 4 + len;
      }
    });
    client.pipe(upstream);
    upstream.pipe(client);
  });
  return listen(server, localPort);
}

// Flash fragt vor jeder Socket-Verbindung die Policy auf Port 843 des Ziels ab – hier also beim Launcher selbst.
function policyServer(localPort) {
  const server = net.createServer((sock) => {
    sock.on('error', () => sock.destroy());
    let data = '';
    sock.on('data', (d) => {
      data += d.toString('latin1');
      if (data.startsWith(POLICY_REQUEST)) {
        if (!policyAnswered) console.log('[forward] Flash-Policy beantwortet');
        policyAnswered = true;
        sock.end(POLICY_FILE);
      }
      else if (data.length >= POLICY_REQUEST.length || !POLICY_REQUEST.startsWith(data)) sock.destroy();
    });
  });
  return listen(server, localPort);
}

module.exports = { forward, policyServer };
