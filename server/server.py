import socket
import threading
import time

from PKTTYPES import PACKET_HANDLERS
from PolicyServer import start_policy_server
from globals import HOST, PORTS, PORT_HTTP, handle_entity_destroy_server, GS
from scheduler import set_active_session_resolver
from static_server import start_static_server

# for debugging only
from BitBuffer import BitBuffer
from accounts import save_characters
from level_config import LEVEL_CONFIG


def _level_remove(level, session):
    s = GS.level_registry.get(level)
    if not s:
        return
    s.discard(session)
    if not s:
        del GS.level_registry[level]


def _level_sessions(level):
    return list(GS.level_registry.get(level, ()))


def _level_broadcast(level, pkt, exclude=None):
    for s in _level_sessions(level):
        if s is not exclude:
            try:
                s.conn.sendall(pkt)
            except:
                pass


def new_transfer_token():
    while True:
        token = 1000 + len(GS.used_tokens) + 1
        if token not in GS.used_tokens:
            GS.used_tokens[token] = True
            return token


def find_active_session(user_id, char_name):
    for s in GS.all_sessions:
        if s.user_id == user_id and s.current_character == char_name:
            return s
    return None


set_active_session_resolver(find_active_session)


class ClientSession:
    def __init__(self, conn, addr):
        self.conn = conn
        self.addr = addr
        self.running = True
        self.buffer = bytearray()

        # Authentication / account
        self.user_id = None
        self.authenticated = False
        self.char_list = []           # list of characters belonging to this user
        self.current_character = None # name of active character
        self.current_char_dict = None # dict of active character's data

        # world and level
        self.current_level = None
        self.entry_level = None
        self.player_spawned = False
        self.clientEntID = None       # entity ID assigned to the player

        # entity tracking
        self.entities = {}  # authoritative movement cache

    def stop(self):
        self.running = False
        self.close_connection()

    def get_entity(self, entity_id):
        return self.entities.get(entity_id)

    def ensure_token(self, char, target_level=None, previous_level=None):
        key = (self.user_id, char.get("name"))

        # Look up or assign a token
        if key in GS.char_tokens:
            tk = GS.char_tokens[key]
        else:
            tk = new_transfer_token()
            GS.char_tokens[key] = tk
            GS.token_char[tk] = key

        # Store session mapping
        self.clientEntID = tk
        GS.session_by_token[tk] = self

        return tk

    def save_player_position(self):
        if not (self.user_id and self.char_list and self.current_character):
            return

        char = next((c for c in self.char_list if c.get("name") == self.current_character), None)
        if not char:
            return

        current_level = self.current_level
        ent = self.entities.get(self.clientEntID)

        if not (current_level and ent):
            return

        # Determine whether saving is allowed
        is_dungeon = LEVEL_CONFIG.get(current_level, ("", 0, 0, False))[3]
        allow_save = (current_level == "CraftTown") or not is_dungeon

        if not allow_save:
            return

        # ONLY update coords, never the level name here
        char["CurrentLevel"]["x"] = ent.get("pos_x", 0)
        char["CurrentLevel"]["y"] = ent.get("pos_y", 0)

        save_characters(self.user_id, self.char_list)

    def close_connection(self):
        self.save_player_position()

        if self.player_spawned and self.clientEntID is not None:
            handle_entity_destroy_server(self, self.clientEntID, all_sessions=GS.all_sessions)

        if self.conn:
            try:
                self.conn.close()
            except:
                pass

        s = GS.session_by_token.get(self.clientEntID)
        if s is self:
            s.running = False

        if self.player_spawned and self.current_level:
            _level_remove(self.current_level, self)

        if self in GS.all_sessions:
            GS.all_sessions.remove(self)


def handle_incoming_data(session, chunk: bytes):
    if not hasattr(session, "buffer"):
        session.buffer = bytearray()
    session.buffer.extend(chunk)
    while len(session.buffer) >= 4:
        pkt    = int.from_bytes(session.buffer[0:2], byteorder='big')
        length = int.from_bytes(session.buffer[2:4], byteorder='big')
        total  = 4 + length
        if len(session.buffer) < total:
            break
        data    = bytes(session.buffer[:total])
        payload = data[4:]
        del session.buffer[:total]

        # Sanity check
        if len(payload) != length:
            print(f"[{session.addr}] Length mismatch: header says {length} but payload is {len(payload)}")

        handler = PACKET_HANDLERS.get(pkt)

        if handler:
            handler(session, data)
        else:
            print(f"[{session.addr}] Unhandled packet type: 0x{pkt:02X}, raw payload = {data.hex()}")


def handle_disconnect(session):
    print("Disconnect:", session.addr)
    session.stop()


def handle_client(session: ClientSession):
    conn = session.conn
    addr = session.addr
    print("Connected:", addr)
    conn.settimeout(300)
    try:
        while True:
            chunk = conn.recv(4096)
            if not chunk:
                print(f"[{addr}] Connection closed by client")
                break
            handle_incoming_data(session, chunk)
    except Exception as e:
        print("Session error:", e)
    finally:
        handle_disconnect(session)


def start_server(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind((HOST, port))
    except PermissionError:
        print(f"Error: Cannot bind to port {port}. Ports below 1024 require root privileges.")
        return None
    except OSError as e:
        print(f"Error: Cannot bind to port {port}. {e}")
        return None
    s.listen(5)
    print(f"Server listening on {HOST}:{port}")
    return s


def accept_connections(s, port):
    while True:
        conn, addr = s.accept()
        session = ClientSession(conn, addr)
        GS.all_sessions.append(session)
        threading.Thread(target=handle_client, args=(session,), daemon=True).start()


def start_servers():
    servers = []
    for port in PORTS:
        server = start_server(port)
        if server:
            servers.append((server, port))
            threading.Thread(target=accept_connections, args=(server, port), daemon=True).start()
    return servers


if __name__ == "__main__":
    from websocket_server import start_websocket_server

    # Start Unified HTTP / WebSocket Web Server
    start_websocket_server(host=HOST, port=PORT_HTTP)

    # Start Flash policy server (best-effort)
    ENABLE_POLICY_SERVER = True
    if ENABLE_POLICY_SERVER:
        try:
            start_policy_server()
        except PermissionError:
            print("Policy server skipped (port 843 requires root privileges).")

    # Start TCP Game Server
    servers = start_servers()
    print("=================================================================")
    print(" [OK] Dungeon Blitz Unified Server Running!")
    print(f" [OK] Modern Web Client: http://localhost:{PORT_HTTP}/")
    print(f" [OK] WebSocket Endpoint: ws://localhost:{PORT_HTTP}/ws")
    print(f" [OK] Flash Projector URL: http://localhost:{PORT_HTTP}/p/cbv/DungeonBlitz.swf?fv=cbq&gv=cbv")
    print("=================================================================")

    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Server shutting down...")
