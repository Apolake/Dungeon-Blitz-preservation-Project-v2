# 🏰 Dungeon Blitz - Preservation Project

### Preserving the authentic, original Dungeon Blitz game experience with all original Flash assets, animations, audio, SQLite persistence, and zero-configuration Docker containerization.

🐾 The project [Contributors](../../contributors)

---

## 🚀 Instant Quick Start (Docker - Recommended)

Run the authentic game server, assets, and in-browser WebAssembly Flash player with a single command:

```bash
docker compose up -d --build
```

Open your browser to: **[http://localhost:8090](http://localhost:8090)** (or `http://<your-vps-ip>:8090`)

* **Authentic Game Experience:** Runs the **exact original game SWF client** (`DungeonBlitz.swf`) with all 70+ character animations, level assets, monster sprites, and original soundtrack directly in the browser via Ruffle WebAssembly.
* **Ports Configured:**
  * Port **`8090`**: Web client, asset server (`/p/`), and WebSocket bridge (`/ws`).
  * Port **`8092`**: TCP game server (for standalone Adobe Flash Player Projector).
* **SQLite Persistence:** Embedded SQLite WAL-mode database (`dungeonblitz.db`) with automatic migrations, mounted in a persistent Docker volume (`dungeon-blitz-data`).

---

## 🛠️ Local Development Quick Start (Without Docker)

### 1. Install Dependencies
```bash
cd server
pip install -r requirements.txt
```

### 2. Start the Server
```bash
python server.py
```

### 3. Play
* **In Modern Browsers (Chrome / Firefox / Edge / Safari):**
  Open **`http://localhost:8090`** (runs the authentic game via WebAssembly).
* **In Native Adobe Flash Player Projector:**
  Open URL: `http://localhost:8090/p/cbv/DungeonBlitz.swf?fv=cbq&gv=cbv` (connects to TCP port `8092`).

---

## 🎮 Play Options

1. **🌐 Web Browser (Ruffle WebAssembly)**
   * Zero plugins required.
   * Runs the exact original ActionScript 3 client with automatic asset rewriting and socket proxying.
   * Access via `http://<host>:8090/`.

2. **⚡ Adobe Flash Player Projector (Standalone Native Client)**
   * 100% native Flash engine execution for maximum FPS and performance.
   * Open the Projector and paste:
     ```
     http://<host>:8090/p/cbv/DungeonBlitz.swf?fv=cbq&gv=cbv
     ```
   * Connects directly to TCP port `8092`.

---

## 🏗️ Architecture Overview

```
Dungeon-Blitz-preservation-Project/
├── Dockerfile                  # Lightweight Python 3.12 container
├── docker-compose.yml          # Container configuration with persistent SQLite volume
└── server/
    ├── server.py               # Main game server & dual-transport dispatch
    ├── websocket_server.py     # aiohttp HTTP + WebSocket gateway (/ws)
    ├── database.py             # SQLite WAL-mode database (auto-migrates legacy JSON)
    ├── BitBuffer.py/bitreader  # Bit-level binary serialization protocol
    ├── PKTTYPES.py             # 150+ OpCodes (Combat, Forge, Pets, Quests, Socials)
    └── content/localhost/      # Authentic game assets:
        ├── index.html          # Web launcher with Ruffle WebAssembly
        └── p/                  # Original SWF binaries, SWZs, and MP3 audio
```

---

## 📜 Legal Notice

This project is for **archival** and **educational purposes**.
The maintainers do not endorse monetization, paid access, or commercial exploitation of preserved content.
