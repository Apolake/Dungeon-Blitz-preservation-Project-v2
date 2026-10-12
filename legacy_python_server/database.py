import os
import json
import sqlite3
import threading
from typing import Optional

DB_DIR = os.getenv("DATA_DIR", os.path.join(os.path.dirname(__file__), "saves"))
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "dungeonblitz.db")

_local = threading.local()

def get_connection() -> sqlite3.Connection:
    if not hasattr(_local, "conn") or _local.conn is None:
        conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        _local.conn = conn
    return _local.conn

def init_db():
    conn = get_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                user_id INTEGER PRIMARY KEY,
                email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL COLLATE NOCASE,
                char_data TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES accounts(user_id)
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chars_user_id ON characters(user_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chars_name ON characters(name);")

    # Migrate legacy JSON if present
    migrate_from_json()

def migrate_from_json():
    accounts_json = os.path.join(os.path.dirname(__file__), "Accounts.json")
    conn = get_connection()
    if os.path.exists(accounts_json):
        try:
            with open(accounts_json, "r", encoding="utf-8") as f:
                entries = json.load(f)
            with conn:
                for entry in entries:
                    conn.execute("""
                        INSERT OR IGNORE INTO accounts (user_id, email)
                        VALUES (?, ?)
                    """, (int(entry["user_id"]), entry["email"].strip().lower()))
            print(f"[DB] Migrated accounts from {accounts_json}")
        except Exception as e:
            print(f"[DB] Error migrating accounts.json: {e}")

    # Check saves folder
    saves_dir = os.path.join(os.path.dirname(__file__), "saves")
    if os.path.exists(saves_dir):
        for fname in os.listdir(saves_dir):
            if fname.endswith(".json"):
                try:
                    uid = int(os.path.splitext(fname)[0])
                    path = os.path.join(saves_dir, fname)
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    chars = data.get("characters", [])
                    with conn:
                        for char in chars:
                            name = char.get("name", "").strip()
                            if not name:
                                continue
                            existing = conn.execute(
                                "SELECT id FROM characters WHERE user_id=? AND name=?",
                                (uid, name)
                            ).fetchone()
                            if not existing:
                                conn.execute("""
                                    INSERT INTO characters (user_id, name, char_data)
                                    VALUES (?, ?, ?)
                                """, (uid, name, json.dumps(char, ensure_ascii=False)))
                except (ValueError, Exception) as e:
                    continue

def db_load_accounts() -> dict[str, int]:
    conn = get_connection()
    rows = conn.execute("SELECT email, user_id FROM accounts").fetchall()
    return {row["email"].lower(): row["user_id"] for row in rows}

def db_get_or_create_user_id(email: str) -> int:
    email_clean = email.strip().lower()
    conn = get_connection()
    row = conn.execute("SELECT user_id FROM accounts WHERE email=?", (email_clean,)).fetchone()
    if row:
        return row["user_id"]

    with conn:
        cursor = conn.execute("SELECT MAX(user_id) AS max_id FROM accounts")
        max_row = cursor.fetchone()
        next_id = 1 if (not max_row or max_row["max_id"] is None) else (max_row["max_id"] + 1)
        conn.execute("INSERT INTO accounts (user_id, email) VALUES (?, ?)", (next_id, email_clean))
        return next_id

def db_is_character_name_taken(name: str) -> bool:
    clean_name = name.strip().lower()
    conn = get_connection()
    row = conn.execute("SELECT id FROM characters WHERE LOWER(name)=?", (clean_name,)).fetchone()
    return row is not None

def db_load_characters(user_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT char_data FROM characters WHERE user_id=? ORDER BY id ASC", (user_id,)).fetchall()
    chars = []
    for row in rows:
        try:
            chars.append(json.loads(row["char_data"]))
        except json.JSONDecodeError:
            pass
    return chars

def db_save_characters(user_id: int, char_list: list[dict]):
    conn = get_connection()
    with conn:
        conn.execute("DELETE FROM characters WHERE user_id=?", (user_id,))
        for char in char_list:
            name = char.get("name", "").strip()
            conn.execute(
                "INSERT INTO characters (user_id, name, char_data) VALUES (?, ?, ?)",
                (user_id, name, json.dumps(char, ensure_ascii=False))
            )

# Auto-initialize database on import
init_db()
