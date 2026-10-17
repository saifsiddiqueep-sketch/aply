"""Sign in with Google for the sandbox and dev instances (OAuth 2.0 authorization code flow with PKCE).

  GET /api/auth/providers                 which sign-in methods are switched on: {"google": true|false}
  GET /api/auth/google/start?agree=1      send the browser to Google
  GET /api/auth/google/callback           Google sends the browser back here; we sign the person in

How it works:
  1. start() makes a random `state`, `nonce` and PKCE verifier, remembers them on the server for 10 minutes, ties the
     `state` to this browser with a short-lived HttpOnly cookie, and returns Google's sign-in URL.
  2. The person signs in on Google's own page. UAply never sees their Google password.
  3. Google returns to the callback with a one-time `code` and our `state`. We check the state against both the server's
     memory and the cookie (this stops forged and replayed sign-ins), then swap the code for tokens by calling Google's token
     endpoint directly over HTTPS, sending the client secret and the PKCE verifier.
  4. The ID token came straight from Google's token endpoint, which Google's documentation allows trusting without checking
     its signature; we still check issuer, audience (our client ID), expiry, nonce, and that Google marked the email verified.
  5. auth_api.oauth_login() finds or creates the account and the caller starts the normal session cookie.

Two ways in, both switched on by the same OAuth client (Google Auth Platform, Clients, "Web application"; step by step in
DEPLOY.md, "Google sign-in"):
  * Google's own button (verify_credential below) needs only the public client ID and each site address under Authorized
    JavaScript origins. Used on computers and Android phones.
  * This full-page redirect needs the client secret too, and each address + /api/auth/google/callback under Authorized redirect
    URIs. Used on iPhone and iPad, where Google says its button needs a full-page flow (Safari blocks the pop-up's cookies).
  "google": {"client_id": "...apps.googleusercontent.com", "client_secret": "..."}   (uaply-config.json, or UAPLY_CONFIG_JSON on a host)
Without a client ID the button is hidden.
For tests only, "auth_url", "token_url" and "issuers" can point at a stand-in provider (tools/mock-google.py).
"""
import base64
import hashlib
import json
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt_rs256
import uaply_api

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
ISSUERS = ("https://accounts.google.com", "accounts.google.com")
STATE_SECONDS = 600
MAX_PENDING = 2000

_lock = threading.Lock()
_pending = {}      # state -> {verifier, nonce, agree, exp}


def _settings():
    g = uaply_api.config().get("google")
    g = g if isinstance(g, dict) else {}
    cid = g.get("client_id") if isinstance(g.get("client_id"), str) else ""
    sec = g.get("client_secret") if isinstance(g.get("client_secret"), str) else ""
    ok = cid.strip().endswith(".apps.googleusercontent.com") or bool(g.get("auth_url"))      # ignore the example placeholder text
    return {"on": ok and bool(sec.strip()), "gis": ok, "id": cid.strip(), "secret": sec.strip(),
            "certs_url": g.get("certs_url") or jwt_rs256.GOOGLE_CERTS,
            "public_url": (g.get("public_url") or "").rstrip("/") if isinstance(g.get("public_url"), str) else "",
            "auth_url": g.get("auth_url") or AUTH_URL, "token_url": g.get("token_url") or TOKEN_URL,
            "issuers": tuple(g.get("issuers")) if isinstance(g.get("issuers"), list) else ISSUERS}


def enabled():
    """True when the redirect sign-in is fully set up (client ID and secret)."""
    return _settings()["on"]


def button_enabled():
    """True when Google's own button can be shown: it needs only the public client ID, no secret."""
    return _settings()["gis"]


def redirect_uri(host, proto="http"):
    """Where Google sends the browser back: the very address the person is on. The state cookie set by start() lives only on that
    address, so returning to another one (public_url https://uaply.net while the person is on www.uaply.net or the onrender.com address)
    would lose it and every sign-in there would fail as "expired". Each address used must be listed in Google Cloud Console under
    Authorized redirect URIs; Google refuses any address that is not (so a forged Host header cannot send anyone elsewhere).
    public_url is only the fallback when the request names no host."""
    s = _settings()
    base = ("%s://%s" % (proto, host)) if host else (s["public_url"] or "http://localhost")
    return base + "/api/auth/google/callback"


def public_config(host, proto="http"):
    s = _settings()
    return {"google": button_enabled(), "googleClientId": s["id"] if s["gis"] else "", "googleRedirect": enabled(),
            "googleRedirectUri": redirect_uri(host, proto) if enabled() else "", "canEmail": uaply_api.mail_ready()}


def _b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def start(host, proto, agree):
    """Returns (google_url, state). The caller sets the state cookie."""
    s = _settings()
    if not s["on"]:
        return None, None
    state, nonce, verifier = secrets.token_urlsafe(24), secrets.token_urlsafe(24), secrets.token_urlsafe(48)
    now = time.time()
    with _lock:
        for k in [k for k, v in _pending.items() if v["exp"] < now]:
            del _pending[k]
        if len(_pending) >= MAX_PENDING:
            return None, None
        _pending[state] = {"verifier": verifier, "nonce": nonce, "agree": bool(agree), "exp": now + STATE_SECONDS}
    q = {"client_id": s["id"], "redirect_uri": redirect_uri(host, proto), "response_type": "code", "scope": "openid email",
         "state": state, "nonce": nonce, "code_challenge": _b64(hashlib.sha256(verifier.encode()).digest()),
         "code_challenge_method": "S256", "prompt": "select_account"}
    return s["auth_url"] + ("&" if "?" in s["auth_url"] else "?") + urllib.parse.urlencode(q), state


def _claims(id_token):
    try:
        part = id_token.split(".")[1]
        return json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))
    except Exception:
        return None


def finish(query, cookie_state, host, proto):
    """Returns (error_code_or_None, identity_dict_or_None, agreed). error_code is a short word for the page to explain."""
    s = _settings()
    state = (query.get("state") or [""])[0]
    with _lock:
        rec = _pending.pop(state, None)
    if (query.get("error") or [""])[0]:
        return "cancelled", None, False
    if not s["on"] or not rec or rec["exp"] < time.time() or not cookie_state or not secrets.compare_digest(state, cookie_state):
        return "expired", None, False
    code = (query.get("code") or [""])[0]
    if not code or len(code) > 2000:
        return "failed", None, False
    body = urllib.parse.urlencode({"code": code, "client_id": s["id"], "client_secret": s["secret"], "redirect_uri": redirect_uri(host, proto),
                                   "grant_type": "authorization_code", "code_verifier": rec["verifier"]}).encode()
    try:
        req = urllib.request.Request(s["token_url"], data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
        with urllib.request.urlopen(req, timeout=10) as r:
            tok = json.loads(r.read(200000).decode("utf-8"))
    except (urllib.error.URLError, ValueError, OSError):
        return "failed", None, False
    c = _claims(tok.get("id_token") if isinstance(tok, dict) else None)
    if not isinstance(c, dict):
        return "failed", None, False
    aud = c.get("aud")
    if (c.get("iss") not in s["issuers"] or (aud != s["id"] and not (isinstance(aud, list) and s["id"] in aud))
            or not isinstance(c.get("exp"), (int, float)) or c["exp"] < time.time() or c.get("nonce") != rec["nonce"]
            or not c.get("sub") or not isinstance(c.get("email"), str)):
        return "failed", None, False
    if c.get("email_verified") not in (True, "true"):
        return "unverified", None, False
    return None, _identity(c), rec["agree"]


def _identity(c):
    """What a verified Google token tells us. Google is the authority on an email address only for Gmail addresses and Google Workspace
    accounts (the hd claim). For any other address "verified" can be out of date (the address may have changed hands), so such an email
    is not trusted: it can sign someone in by their Google account number, but it cannot prove ownership of the address or be merged
    into an existing UAply account with that address."""
    email = c["email"].strip().lower()
    hd = c.get("hd") if isinstance(c.get("hd"), str) else ""
    return {"provider": "google", "subject": str(c["sub"])[:100], "email": email,
            "trusted": email.endswith(("@gmail.com", "@googlemail.com")) or bool(hd)}


_tries = {}        # ip -> timestamps of recent token checks


def verify_credential(credential, ip):
    """The token Google's button hands the page. Returns (error_code_or_None, identity_dict_or_None).
    Checks the signature against Google's published keys, that the token was issued for our client ID, the issuer and the expiry, and
    that Google says the email is verified. The account is keyed by Google's permanent user id (sub), not the email."""
    s = _settings()
    if not s["gis"]:
        return "off", None
    now = time.time()
    with _lock:
        recent = [t for t in _tries.get(ip, []) if now - t < 60]
        if len(recent) >= 30:
            return "limited", None
        recent.append(now)
        _tries[ip] = recent
    try:
        c = jwt_rs256.verify(credential, s["id"], s["issuers"], s["certs_url"])
    except jwt_rs256.TokenError:
        return "failed", None
    if not isinstance(c.get("sub"), str) or not c["sub"] or not isinstance(c.get("email"), str):
        return "failed", None
    if c.get("email_verified") not in (True, "true"):
        return "unverified", None
    return None, _identity(c)
