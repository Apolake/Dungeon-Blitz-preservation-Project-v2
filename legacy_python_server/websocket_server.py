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
    ws = web.WebSocketResponse(heartbeat=30.0)
    await ws.prepare(request)

    peername = request.transport.get_extra_info('peername')
    addr = peername if peername else ('websocket', 0)

    from server import handle_incoming_data, handle_disconnect

    SessionClass = get_ws_session_class()
    session = SessionClass(ws, addr)
    session.loop = asyncio.get_running_loop()

    # Determine target host from HTTP Host header (e.g. "144.91.77.234" or "localhost")
    host_header = request.headers.get('Host', '')
    if host_header:
        session.target_host = host_header.split(':')[0]
    else:
        session.target_host = '127.0.0.1'

    # Register with global session pool
    GS.all_sessions.append(session)
    print(f"[WS] Client connected from {addr} (target_host={session.target_host}). Total sessions: {len(GS.all_sessions)}", flush=True)

    try:
        async for msg in ws:
            if msg.type == WSMsgType.BINARY:
                handle_incoming_data(session, bytes(msg.data))
            elif msg.type == WSMsgType.TEXT:
                handle_incoming_data(session, msg.data.encode('utf-8'))
            elif msg.type == WSMsgType.ERROR:
                print(f"[WS] WebSocket error: {ws.exception()}", flush=True)
                break
    finally:
        handle_disconnect(session)
        print(f"[WS] Client disconnected from {addr}. Remaining: {len(GS.all_sessions)}", flush=True)

    return ws


async def health_handler(request: web.Request):
    return web.json_response({
        "status": "online",
        "game": "Dungeon Blitz",
        "online_players": len(GS.all_sessions)
    }, headers={"Access-Control-Allow-Origin": "*"})


async def client_log_handler(request: web.Request):
    """Captures browser console errors and Ruffle Flash exceptions."""
    try:
        data = await request.json()
        level = data.get("level", "INFO").upper()
        msg = data.get("message", "")
        details = data.get("details", "")
        url = data.get("url", "")
        loc = f" ({url})" if url else ""
        print(f"[BROWSER-{level}] {msg} {details}{loc}", flush=True)
    except Exception as e:
        text = await request.text()
        print(f"[BROWSER-LOG] {text}", flush=True)
    return web.json_response({"status": "ok"}, headers={"Access-Control-Allow-Origin": "*"})


async def options_handler(request: web.Request):
    return web.Response(
        status=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )


MIME_TYPES = {
    ".swf": "application/x-shockwave-flash",
    ".swz": "application/x-shockwave-flash",
    ".xml": "application/xml; charset=utf-8",
    ".mp3": "audio/mpeg",
    ".json": "application/json; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
}


def build_asset_index(static_dir: str):
    """
    Builds a comprehensive lookup index for all static assets.
    Maps lowercase basenames and partial paths to absolute disk paths.
    """
    index = {}
    if not os.path.exists(static_dir):
        return index

    for root, _, files in os.walk(static_dir):
        for f in files:
            full = os.path.join(root, f)
            low_name = f.lower()
            if low_name not in index:
                index[low_name] = full

            rel_static = os.path.relpath(full, static_dir).replace('\\', '/').lower()
            index[rel_static] = full

            p_prefix = "p/"
            if rel_static.startswith(p_prefix):
                rel_p = rel_static[len(p_prefix):]
                index[rel_p] = full
    return index


def make_file_response(file_path: str) -> web.StreamResponse:
    ext = os.path.splitext(file_path)[1].lower()
    content_type = MIME_TYPES.get(ext, "application/octet-stream")
    resp = web.FileResponse(file_path)
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "*"
    resp.content_type = content_type
    return resp


def create_app(flash_static_dir: str = None):
    app = web.Application()
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/api/health", health_handler)
    app.router.add_post("/api/client-log", client_log_handler)
    app.router.add_route("OPTIONS", "/{tail:.*}", options_handler)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    if not flash_static_dir:
        flash_static_dir = os.path.join(base_dir, "content", "localhost")

    asset_index = build_asset_index(flash_static_dir)
    print(f"[ASSET-ROUTER] Indexed {len(asset_index)} assets in {flash_static_dir}", flush=True)

    async def index_handler(request: web.Request):
        flash_idx = os.path.join(flash_static_dir, "index.html")
        if os.path.exists(flash_idx):
            return make_file_response(flash_idx)
        return web.Response(text="Dungeon Blitz Server Online", headers={"Access-Control-Allow-Origin": "*"})

    async def crossdomain_handler(request: web.Request):
        cd = os.path.join(flash_static_dir, "crossdomain.xml")
        if os.path.exists(cd):
            return make_file_response(cd)
        return web.Response(
            text='<?xml version="1.0"?><cross-domain-policy><allow-access-from domain="*" to-ports="*"/></cross-domain-policy>',
            content_type="application/xml",
            headers={"Access-Control-Allow-Origin": "*"}
        )

    app.router.add_get("/crossdomain.xml", crossdomain_handler)
    app.router.add_get("/p/crossdomain.xml", crossdomain_handler)
    app.router.add_get("/", index_handler)
    app.router.add_get("/index.html", index_handler)

    # Launcher metadata endpoint for Electron / Flash Launcher
    async def server_info_handler(request: web.Request):
        game_port = 7498 if 7498 in PORTS else PORTS[0]
        return web.json_response({
            "login": PORTS[0],
            "game": game_port,
        }, headers={"Access-Control-Allow-Origin": "*"})

    app.router.add_get("/client/server.json", server_info_handler)

    # Mock gameanalytics so game initialization does not hang
    async def analytics_mock(request: web.Request):
        return web.json_response({"status": "ok"}, headers={"Access-Control-Allow-Origin": "*"})

    app.router.add_post("/1/cc9c404568c085b07491b25d000f6094/design", analytics_mock)
    app.router.add_get("/1/cc9c404568c085b07491b25d000f6094/design", analytics_mock)

    # Universal intelligent asset resolver handler
    async def asset_handler(request: web.Request):
        tail = request.match_info.get("tail", "").lstrip("/")
        req_path = request.path.lstrip("/")

        # 1. Direct path check relative to flash_static_dir
        if tail:
            candidate = os.path.join(flash_static_dir, tail.replace('/', os.sep))
            if os.path.isfile(candidate):
                return make_file_response(candidate)

            # Direct path check relative to p/
            p_candidate = os.path.join(flash_static_dir, "p", tail.replace('/', os.sep))
            if os.path.isfile(p_candidate):
                return make_file_response(p_candidate)

        # 2. Check full requested path inside static dir
        full_candidate = os.path.join(flash_static_dir, req_path.replace('/', os.sep))
        if os.path.isfile(full_candidate):
            return make_file_response(full_candidate)

        # 3. Lookup by normalized lowercase relative path
        low_tail = tail.lower() if tail else req_path.lower()
        if low_tail in asset_index:
            resolved = asset_index[low_tail]
            rel = os.path.relpath(resolved, flash_static_dir).replace('\\', '/')
            print(f"[HTTP 200] Resolved '{request.path}' -> '{rel}'", flush=True)
            return make_file_response(resolved)

        # 4. Lookup by filename / basename
        basename = os.path.basename(req_path).lower()
        if basename in asset_index:
            resolved = asset_index[basename]
            rel = os.path.relpath(resolved, flash_static_dir).replace('\\', '/')
            print(f"[HTTP 200] Resolved '{request.path}' via basename -> '{rel}'", flush=True)
            return make_file_response(resolved)

        # 5. Check if path ends with any indexed relative key (e.g. "sounds/Sound.swf")
        for key, resolved in asset_index.items():
            if key.endswith(basename) or req_path.lower().endswith(key):
                rel = os.path.relpath(resolved, flash_static_dir).replace('\\', '/')
                print(f"[HTTP 200] Resolved '{request.path}' via partial match -> '{rel}'", flush=True)
                return make_file_response(resolved)

        print(f"[HTTP 404 NOT FOUND] '{request.path}'", flush=True)
        return web.Response(status=404, text=f"File not found: {request.path}", headers={"Access-Control-Allow-Origin": "*"})

    app.router.add_get("/client/{tail:.*}", asset_handler)
    app.router.add_get("/p/{tail:.*}", asset_handler)
    app.router.add_get("/flash/{tail:.*}", asset_handler)
    app.router.add_get("/js/{tail:.*}", asset_handler)
    app.router.add_get("/{tail:.*\\.(?:swf|swz|xml|mp3|json|js|png|jpg|gif)}", asset_handler)

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
        print(f"[HTTP/WS] Unified Server running on http://{host}:{port} (WebSocket at ws://{host}:{port}/ws)", flush=True)
        loop.run_forever()

    t = threading.Thread(target=_runner, name="AiohttpWSServer", daemon=True)
    t.start()
    return t
