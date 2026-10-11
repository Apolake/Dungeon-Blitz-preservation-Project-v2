# 🏰 Dungeon Blitz - Modern Web Revival & Preservation Project

### Reviving the original Dungeon Blitz experience with modern web architecture, WebSockets, in-browser play, and instant Docker containerization.

🐾 The project [Contributors](../../contributors)

---

## 🚀 Instant Quick Start (Docker - Recommended)

Run the full game server, database, and modern web client with a single command:

```bash
docker compose up -d
```

Open your browser to: **[http://localhost:8080](http://localhost:8080)**

* Works in **all modern browsers** (Chrome, Edge, Firefox, Safari, Mobile).
* Single-port setup (Web assets + WebSockets on port 8080).
* Embedded persistent SQLite database automatically mounted in `dungeon-blitz-data` volume.

---

## 🛠️ Local Development Quick Start (Without Docker)

### 1. Install Dependencies
```bash
# Backend requirements
cd server
pip install -r requirements.txt

# (Optional) Rebuild modern web client
cd ../web
npm install
npm run build
```

### 2. Start the Server
```bash
cd ../server
python server.py
```

### 3. Play in Browser
Open **`http://localhost:8080`** in your browser.

---

## 🌟 Dual Play Modes

1. **✨ Modern Web Client (HTML5 / TypeScript / WebSockets)**
   * Hardware-accelerated 2D canvas rendering with 60 FPS real-time side-scrolling physics.
   * Responsive medieval HUD (Health/Mana/XP bars, skill hotbar with cooldowns, interactive chat, currency tracking).
   * Hero creation & customization (Paladin, Rogue, Mage classes, hair/skin/armor color pickers).
   * Fully native: zero plugins, zero Flash player required.

2. **🏛️ WebAssembly Flash Preservation (Ruffle)**
   * One-click toggle in the top-right header to switch to the original compiled Flash SWFs running inside modern WebAssembly.
   * Backward-compatible with standalone Flash Projector at:
     `http://localhost:8080/p/cbv/DungeonBlitz.swf?fv=cbq&gv=cbv` (TCP port `8082`).

---

## 🏗️ Architecture Overview

```
Dungeon-Blitz-preservation-Project/
├── Dockerfile                  # Multi-stage production container build
├── docker-compose.yml          # One-click hostable service with persistent volume
├── server/
│   ├── server.py               # Main game server & dual-transport dispatch
│   ├── websocket_server.py     # aiohttp async HTTP + WebSocket gateway (/ws)
│   ├── database.py             # SQLite WAL-mode persistence (auto-migrates legacy JSONs)
│   ├── BitBuffer.py/bitreader  # Bit-level binary serialization protocol
│   ├── PKTTYPES.py             # 150+ OpCodes (Combat, Forge, Pets, Quests, Socials)
│   └── web_dist/               # Compiled modern web client static bundle
└── web/                        # Modern Web Client (TypeScript + Vite)
    ├── src/
    │   ├── protocol/           # TypeScript BitBuffer, BitReader, NetworkClient
    │   ├── engine/             # 2D Canvas renderer, physics, input, entity manager
    │   ├── ui/                 # Auth modal, character creation, HUD, Flash modal
    │   └── main.ts             # Application bootstrapper
    └── vite.config.ts
```

---

## 📜 Legal Notice

This project is for **archival** and **educational purposes**.
The maintainers do not endorse monetization, paid access, or commercial exploitation of preserved content.
