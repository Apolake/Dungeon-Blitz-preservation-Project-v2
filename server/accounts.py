import os
import json
import struct

from threading import Lock
from BitBuffer import BitBuffer
from database import (
    db_load_accounts,
    db_get_or_create_user_id,
    db_is_character_name_taken,
    db_load_characters,
    db_save_characters,
    DB_DIR
)

CHAR_SAVE_DIR = DB_DIR
SAVE_PATH_TEMPLATE = os.path.join(CHAR_SAVE_DIR, "{user_id}.json")
_lock = Lock()

def load_accounts() -> dict[str, int]:
    return db_load_accounts()

def save_accounts_index(index: dict[str, int]) -> None:
    # Managed by database automatically
    pass

def get_or_create_user_id(email: str) -> int:
    return db_get_or_create_user_id(email)

def is_character_name_taken(name: str) -> bool:
    return db_is_character_name_taken(name)

def build_popup_packet(message: str, disconnect: bool = False) -> bytes:
    buf = BitBuffer(debug=True)
    buf.write_method_13(message)
    buf.write_method_6(1 if disconnect else 0, 1)
    payload = buf.to_bytes()
    return struct.pack(">HH", 0x1B, len(payload)) + payload

def load_characters(user_id: int) -> list[dict]:
    return db_load_characters(user_id)

def save_characters(user_id: int, char_list: list[dict]):
    db_save_characters(user_id, char_list)
    # Also write JSON backup for compatibility
    try:
        path = os.path.join(CHAR_SAVE_DIR, f"{user_id}.json")
        data = {
            "user_id": user_id,
            "characters": char_list
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
