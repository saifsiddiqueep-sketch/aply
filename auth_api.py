"""Accounts for the sandbox and dev instances: sign up, log in, log out, and "who am I".

Where it keeps things: a SQLite file at data/<instance>/aply.db (git-ignored, never committed).
  users      email (unique), salted password hash, created and last-login times
  sessions   hashed session tokens with an expiry
  user_mail  the receipts Aply sends to applicants (simulated in test mode)

How it keeps them safe:
  * Passwords are never stored. Only a per-user random salt and a PBKDF2-HMAC-SHA256 hash (600,000 rounds).
  * A session token is 32 random bytes. The browser holds the token in an HttpOnly cookie; the database holds only
    its SHA-256 hash, so a leaked database cannot be used to log in.
  * Login and sign-up are rate limited, unknown emails cost the same time as known ones, and the error for a bad
    login never says which part was wrong.
  * All SQL uses bound parameters.

Not built yet: email verification, password reset, and deleting an account. A hosted database (instead of this file)
is the production step: this module is the local stand-in that already behaves like one.
"""
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import threading
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$")
ITER = 600000
SESSION_SECONDS = 30 * 86400
MAX_FAILS = 5
FAIL_WINDOW = 15 * 60

_lock = threading.RLock()
_path = ""
_name = "default"
_fails = {}      # (ip, email) -> [timestamps of recent failed logins]
_signups = {}    # ip -> [timestamps of recent sign-ups]
_DUMMY_SALT = b"\x00" * 16


def cookie_name():
    return "aply_%s_session" % _name


def init(instance):
    """Each instance (sandbox, dev) keeps its own accounts in data/<instance>/aply.db."""
    global _path, _name
    _name = re.sub(r"[^A-Za-z0-9_-]", "", instance) or "default"
    folder = os.path.join(ROOT, "data", _name)
    os.makedirs(folder, exist_ok=True)
    _path = os.path.join(folder, "aply.db")
    with _lock, _db() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            salt BLOB NOT NULL,
            hash BLOB NOT NULL,
            created_at INTEGER NOT NULL,
            last_login INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS user_mail(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            to_addr TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            status TEXT NOT NULL,
            at INTEGER NOT NULL);
        """)


class _db:
    """A short-lived connection used as a context manager that commits on success."""
    def __enter__(self):
        self.c = sqlite3.connect(_path, timeout=10)
        self.c.row_factory = sqlite3.Row
        self.c.execute("PRAGMA foreign_keys=ON")
        return self.c

    def __exit__(self, et, ev, tb):
        try:
            if et is None:
                self.c.commit()
        finally:
            self.c.close()
        return False


def _hash(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt, ITER)


def _clean_email(v):
    e = v.strip().lower() if isinstance(v, str) else ""
    return e if EMAIL_RE.match(e) else ""


def _recent(bucket, key, window):
    now = time.time()
    lst = [t for t in bucket.get(key, []) if now - t < window]
    bucket[key] = lst
    return lst


def _new_session(c, user_id):
    token = secrets.token_urlsafe(32)
    now = int(time.time())
    c.execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
    c.execute("INSERT INTO sessions(token_hash, user_id, created_at, expires_at) VALUES(?,?,?,?)",
              (hashlib.sha256(token.encode()).hexdigest(), user_id, now, now + SESSION_SECONDS))
    return token


def public_user(row):
    return {"id": row["id"], "email": row["email"]}


def signup(email, password, ip):
    """Returns (status, body, session_token_or_None)."""
    email = _clean_email(email)
    if not email:
        return 400, {"error": "Enter a valid email address."}, None
    if not isinstance(password, str) or not (8 <= len(password) <= 128):
        return 400, {"error": "Use a password between 8 and 128 characters."}, None
    if password.lower() == email:
        return 400, {"error": "Your password cannot be your email."}, None
    with _lock:
        if len(_recent(_signups, ip, 3600)) >= 10:
            return 429, {"error": "Too many sign-ups from this connection. Try again later."}, None
        _signups[ip].append(time.time())
        salt = secrets.token_bytes(16)
        pw_hash = _hash(password, salt)
        now = int(time.time())
        try:
            with _db() as c:
                cur = c.execute("INSERT INTO users(email, salt, hash, created_at, last_login) VALUES(?,?,?,?,?)",
                                (email, salt, pw_hash, now, now))
                uid = cur.lastrowid
                token = _new_session(c, uid)
        except sqlite3.IntegrityError:
            return 409, {"error": "That email already has an account. Log in instead."}, None
    return 200, {"user": {"id": uid, "email": email}}, token


def login(email, password, ip):
    email = _clean_email(email)
    bad = (401, {"error": "Wrong email or password."}, None)
    if not email or not isinstance(password, str) or not (1 <= len(password) <= 128):
        return bad
    key = (ip, email)
    with _lock:
        if len(_recent(_fails, key, FAIL_WINDOW)) >= MAX_FAILS:
            return 429, {"error": "Too many tries. Wait a few minutes and try again."}, None
        with _db() as c:
            row = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        salt = bytes(row["salt"]) if row else _DUMMY_SALT          # same work whether or not the email exists
        ok = hmac.compare_digest(_hash(password, salt), bytes(row["hash"]) if row else b"\x01" * 32) and row is not None
        if not ok:
            _fails[key].append(time.time())
            return bad
        _fails.pop(key, None)
        with _db() as c:
            c.execute("UPDATE users SET last_login=? WHERE id=?", (int(time.time()), row["id"]))
            token = _new_session(c, row["id"])
    return 200, {"user": public_user(row)}, token


def user_for(token):
    if not isinstance(token, str) or not (20 <= len(token) <= 100):
        return None
    with _lock, _db() as c:
        row = c.execute("SELECT u.id, u.email FROM sessions s JOIN users u ON u.id=s.user_id "
                        "WHERE s.token_hash=? AND s.expires_at>?",
                        (hashlib.sha256(token.encode()).hexdigest(), int(time.time()))).fetchone()
    return public_user(row) if row else None


def logout(token):
    if isinstance(token, str) and token:
        with _lock, _db() as c:
            c.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(token.encode()).hexdigest(),))


def add_mail(user_id, to_addr, subject, body, status):
    with _lock, _db() as c:
        c.execute("INSERT INTO user_mail(user_id, to_addr, subject, body, status, at) VALUES(?,?,?,?,?,?)",
                  (user_id, to_addr, subject[:200], body[:8000], status, int(time.time())))


def mail_list(limit=50):
    with _lock, _db() as c:
        return [dict(r) for r in c.execute("SELECT to_addr, subject, body, status, at FROM user_mail ORDER BY id DESC LIMIT ?", (limit,))]


def counts():
    with _lock, _db() as c:
        return {"users": c.execute("SELECT COUNT(*) FROM users").fetchone()[0],
                "mail": c.execute("SELECT COUNT(*) FROM user_mail").fetchone()[0]}
