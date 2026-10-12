import asyncio
import os
import threading
from aiohttp import web, WSMsgType
from globals import GS, PORT_HTTP, PORTS


class WebSocketConnAdapter:
    """Wraps WebSocket session to provide the synchronous .sendall() socket interface."""
    def __init__(self, ws_session):
        self.ws_session = ws_session

    def sendall(self, data: bytes):
        self.ws_session.send(data)

    def close(self):
        self.ws_session.close()


def get_ws_session_class():
    from server import ClientSession

    class WebSocketClientSession(ClientSession):
        """Adapts an aiohttp WebSocket connection to the Dungeon Blitz ClientSession interface."""
        def __init__(self, ws: web.WebSocketResponse, addr: tuple):
            super().__init__(conn=None, addr=addr)
            self.conn = WebSocketConnAdapter(self)
            self.ws = ws
            self.loop = None
            self.is_websocket = True

        async def send_bytes_async(self, data: bytes):
            if not self.ws.closed:
                await self.ws.send_bytes(data)

        def send(self, data: bytes):
            """Synchronous send method called by server game logic."""
            if self.ws.closed:
                return
            if self.loop:
                asyncio.run_coroutine_threadsafe(
                    self.send_bytes_async(data),
                    self.loop
                )

        def close(self):
            if not self.ws.closed and self.loop:
                asyncio.run_coroutine_threadsafe(
                    self.ws.close(),
                    self.loop
                )

        def close_connection(self):
            super().close_connection()
            self.close()

    return WebSocketClientSession


async def ws_handler(request: web.Request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    peername = request.transport.get_extra_info('peername')
    addr = peername if peername else ('websocket', 0)

    from server import handle_incoming_data, handle_disconnect

    SessionClass = get_ws_session_class()
    session = SessionClass(ws, addr)
    session.loop = asyncio.get_running_loop()

    # Register with global session pool
    GS.all_sessions.append(session)
    print(f"[WS] Client connected from {addr}. Total sessions: {len(GS.all_sessions)}")

    try:
        async for msg in ws:
            if msg.type == WSMsgType.BINARY:
                handle_incoming_data(session, bytes(msg.data))
            elif msg.type == WSMsgType.TEXT:
                handle_incoming_data(session, msg.data.encode('utf-8'))
            elif msg.type == WSMsgType.ERROR:
                print(f"[WS] WebSocket error: {ws.exception()}")
                break
    finally:
        handle_disconnect(session)
        print(f"[WS] Client disconnected from {addr}. Remaining: {len(GS.all_sessions)}")

    return ws


async def health_handler(request: web.Request):
    return web.json_response({
        "status": "online",
        "game": "Dungeon Blitz",
        "online_players": len(GS.all_sessions)
    })


def create_app(flash_static_dir: str = None):
    app = web.Application()
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/api/health", health_handler)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    if not flash_static_dir:
        flash_static_dir = os.path.join(base_dir, "content", "localhost")

    async def index_handler(request: web.Request):
        flash_idx = os.path.join(flash_static_dir, "index.html")
        if os.path.exists(flash_idx):
            return web.FileResponse(flash_idx)
        return web.Response(text="Dungeon Blitz Server Online")

    async def crossdomain_handler(request: web.Request):
        cd = os.path.join(flash_static_dir, "crossdomain.xml")
        if os.path.exists(cd):
            return web.FileResponse(cd)
        return web.Response(text='<?xml version="1.0"?><cross-domain-policy><allow-access-from domain="*" to-ports="*"/></cross-domain-policy>', content_type="application/xml")

    app.router.add_get("/crossdomain.xml", crossdomain_handler)
    app.router.add_get("/", index_handler)
    app.router.add_get("/index.html", index_handler)

    # Mock gameanalytics so game initialization does not hang
    async def analytics_mock(request: web.Request):
        return web.json_response({"status": "ok"})

    app.router.add_post("/1/cc9c404568c085b07491b25d000f6094/design", analytics_mock)
    app.router.add_get("/1/cc9c404568c085b07491b25d000f6094/design", analytics_mock)

    # Serve Flash game assets
    if os.path.exists(flash_static_dir):
        p_dir = os.path.join(flash_static_dir, "p")
        if os.path.exists(p_dir):
            app.router.add_static("/p", p_dir, name="p_assets")
        js_dir = os.path.join(flash_static_dir, "js")
        if os.path.exists(js_dir):
            app.router.add_static("/js", js_dir, name="js_assets")
        app.router.add_static("/flash", flash_static_dir, show_index=False, name="flash_root")

    return app


def start_websocket_server(host: str = "0.0.0.0", port: int = 8090, flash_static_dir: str = None):
    def _runner():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        app = create_app(flash_static_dir)
        runner = web.AppRunner(app)
        loop.run_until_complete(runner.setup())
        site = web.TCPSite(runner, host, port)
        loop.run_until_complete(site.start())
        print(f"[HTTP/WS] Unified Server running on http://{host}:{port} (WebSocket at ws://{host}:{port}/ws)")
        loop.run_forever()

    t = threading.Thread(target=_runner, name="AiohttpWSServer", daemon=True)
    t.start()
    return t
