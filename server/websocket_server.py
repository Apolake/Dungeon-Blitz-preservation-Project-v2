import asyncio
import os
import struct
import threading
from aiohttp import web
from PKTTYPES import PACKET_HANDLERS
from globals import GS

class WebSocketConnectionAdapter:
    def __init__(self, ws: web.WebSocketResponse, loop: asyncio.AbstractEventLoop, addr: tuple):
        self.ws = ws
        self.loop = loop
        self.addr = addr
        self.closed = False

    def sendall(self, data: bytes):
        if self.closed or self.ws.closed:
            return
        try:
            asyncio.run_coroutine_threadsafe(self._safe_send(data), self.loop)
        except Exception:
            pass

    async def _safe_send(self, data: bytes):
        if not self.ws.closed:
            try:
                await self.ws.send_bytes(data)
            except Exception:
                pass

    def close(self):
        if not self.closed:
            self.closed = True
            try:
                asyncio.run_coroutine_threadsafe(self.ws.close(), self.loop)
            except Exception:
                pass


async def ws_handler(request: web.Request):
    ws = web.WebSocketResponse(max_msg_size=10 * 1024 * 1024)
    await ws.prepare(request)

    peername = request.transport.get_extra_info("peername")
    addr = peername if peername else ("127.0.0.1", 0)
    loop = asyncio.get_running_loop()

    from server import ClientSession
    adapter = WebSocketConnectionAdapter(ws, loop, addr)
    session = ClientSession(adapter, addr)
    GS.all_sessions.append(session)
    print(f"[WS] Client connected: {addr}")

    buffer = bytearray()
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.BINARY:
                buffer.extend(msg.data)
                while len(buffer) >= 4:
                    pkt = int.from_bytes(buffer[0:2], byteorder="big")
                    length = int.from_bytes(buffer[2:4], byteorder="big")
                    total = 4 + length
                    if len(buffer) < total:
                        break
                    data = bytes(buffer[:total])
                    del buffer[:total]

                    handler = PACKET_HANDLERS.get(pkt)
                    if handler:
                        # Run handler in thread pool to prevent blocking asyncio loop
                        await asyncio.to_thread(handler, session, data)
                    else:
                        print(f"[{addr}] [WS] Unhandled packet 0x{pkt:02X}")
            elif msg.type == web.WSMsgType.ERROR:
                print(f"[WS] WebSocket error: {ws.exception()}")
                break
            elif msg.type in (web.WSMsgType.CLOSE, web.WSMsgType.CLOSING, web.WSMsgType.CLOSED):
                break
    except Exception as e:
        print(f"[WS] Session exception: {e}")
    finally:
        print(f"[WS] Disconnected: {addr}")
        session.stop()

    return ws


async def health_handler(request: web.Request):
    return web.json_response({
        "status": "online",
        "game": "Dungeon Blitz",
        "online_players": len(GS.all_sessions)
    })


def create_app(web_static_dir: str = None, flash_static_dir: str = None):
    app = web.Application()
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/api/health", health_handler)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    if not web_static_dir:
        web_static_dir = os.path.join(base_dir, "web_dist")
    if not flash_static_dir:
        flash_static_dir = os.path.join(base_dir, "content", "localhost")

    async def index_handler(request: web.Request):
        idx = os.path.join(web_static_dir, "index.html")
        if os.path.exists(idx):
            return web.FileResponse(idx)
        flash_idx = os.path.join(flash_static_dir, "index.html")
        if os.path.exists(flash_idx):
            return web.FileResponse(flash_idx)
        return web.Response(text="Dungeon Blitz Server Online")

    app.router.add_get("/", index_handler)
    app.router.add_get("/index.html", index_handler)

    # Assets from Vite
    assets_dir = os.path.join(web_static_dir, "assets")
    if os.path.exists(assets_dir):
        app.router.add_static("/assets", assets_dir, name="vite_assets")

    # Serve Flash game assets
    if os.path.exists(flash_static_dir):
        p_dir = os.path.join(flash_static_dir, "p")
        if os.path.exists(p_dir):
            app.router.add_static("/p", p_dir, name="p_assets")
        app.router.add_static("/flash", flash_static_dir, show_index=False, name="flash_root")

    return app


def start_websocket_server(host: str = "0.0.0.0", port: int = 8080, web_static_dir: str = None, flash_static_dir: str = None):
    def _runner():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        app = create_app(web_static_dir, flash_static_dir)
        runner = web.AppRunner(app)
        loop.run_until_complete(runner.setup())
        site = web.TCPSite(runner, host, port)
        loop.run_until_complete(site.start())
        print(f"[HTTP/WS] Unified Server running on http://{host}:{port} (WebSocket at ws://{host}:{port}/ws)")
        loop.run_forever()

    t = threading.Thread(target=_runner, name="AiohttpWSServer", daemon=True)
    t.start()
    return t
