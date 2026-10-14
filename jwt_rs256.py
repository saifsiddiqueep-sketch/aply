"""Checks a signed token (JWT, RS256) the way Google's documentation says a server must, using only the Python standard library.

What "Continue with Google" gives a website is an ID token: three base64 parts (header, claims, signature). Trusting it means:
  1. the signature is valid for one of the public keys Google publishes (they rotate, so keys are cached for as long as Google says);
  2. the token was issued for THIS app (the audience is our client ID), or a token Google made for some other app could log in here;
  3. the issuer is Google, the token has not expired, and was not issued in the future;
  4. only the algorithm we expect is accepted (never "none", never a shared-secret algorithm).
RS256 is RSA PKCS#1 v1.5 with SHA-256: the signature is raised to the public exponent and must equal a fixed padded layout of the digest.
The check compares the whole padded block, so a forged signature with extra data cannot pass.
"""
import base64
import hashlib
import hmac
import json
import threading
import time
import urllib.request

# DER prefix that says "this is a SHA-256 digest" inside an RSA PKCS#1 v1.5 signature block
_SHA256_PREFIX = bytes.fromhex("3031300d060960864801650304020105000420")
GOOGLE_CERTS = "https://www.googleapis.com/oauth2/v3/certs"
_lock = threading.Lock()
_keys = {"url": "", "until": 0.0, "by_kid": {}}


def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(text):
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def rsa_verify(n, e, signing_input, signature):
    """True only if `signature` is a valid RSA PKCS#1 v1.5 SHA-256 signature of `signing_input` under the public key (n, e)."""
    k = (n.bit_length() + 7) // 8
    if len(signature) != k or k < 64:
        return False
    sig_int = int.from_bytes(signature, "big")
    if sig_int >= n:
        return False
    block = pow(sig_int, e, n).to_bytes(k, "big")
    digest = hashlib.sha256(signing_input).digest()
    pad = k - len(_SHA256_PREFIX) - len(digest) - 3
    if pad < 8:
        return False
    expected = b"\x00\x01" + b"\xff" * pad + b"\x00" + _SHA256_PREFIX + digest
    return hmac.compare_digest(block, expected)


def _fetch_keys(url):
    req = urllib.request.Request(url, headers={"User-Agent": "UAply/1.0"})
    with urllib.request.urlopen(req, timeout=8) as r:
        body = json.loads(r.read(200000).decode("utf-8"))
        cc = r.headers.get("Cache-Control", "")
    ttl = 3600
    for part in cc.split(","):
        part = part.strip()
        if part.startswith("max-age="):
            try:
                ttl = max(60, min(86400, int(part[8:])))
            except ValueError:
                pass
    by_kid = {}
    for k in body.get("keys", []):
        if k.get("kty") == "RSA" and k.get("kid") and k.get("n") and k.get("e"):
            by_kid[k["kid"]] = (int.from_bytes(b64url_decode(k["n"]), "big"), int.from_bytes(b64url_decode(k["e"]), "big"))
    return by_kid, ttl


def public_key(kid, url=GOOGLE_CERTS):
    """The (n, e) public key with this id, from the published list. The list is cached for as long as the publisher says, and fetched
    again once if the id is unknown (keys rotate)."""
    now = time.time()
    with _lock:
        fresh = _keys["url"] == url and _keys["until"] > now
        if fresh and kid in _keys["by_kid"]:
            return _keys["by_kid"][kid]
    by_kid, ttl = _fetch_keys(url)
    with _lock:
        _keys.update(url=url, until=time.time() + ttl, by_kid=by_kid)
        return by_kid.get(kid)


class TokenError(ValueError):
    """The token is not acceptable. The message is safe to log, not to show to a visitor."""


def verify(token, audience, issuers, certs_url=GOOGLE_CERTS, now=None):
    """Return the claims of a valid RS256 token, or raise TokenError."""
    if not isinstance(token, str) or token.count(".") != 2 or len(token) > 6000:
        raise TokenError("not a token")
    head_b64, claims_b64, sig_b64 = token.split(".")
    try:
        header = json.loads(b64url_decode(head_b64))
        claims = json.loads(b64url_decode(claims_b64))
        signature = b64url_decode(sig_b64)
    except (ValueError, TypeError):
        raise TokenError("not readable")
    if not isinstance(header, dict) or not isinstance(claims, dict):
        raise TokenError("not readable")
    if header.get("alg") != "RS256" or not isinstance(header.get("kid"), str):
        raise TokenError("wrong algorithm")                      # blocks "none" and shared-secret tricks
    try:
        key = public_key(header["kid"], certs_url)
    except Exception:
        raise TokenError("could not get the public keys")
    if not key or not rsa_verify(key[0], key[1], (head_b64 + "." + claims_b64).encode("ascii"), signature):
        raise TokenError("bad signature")
    t = now if now is not None else time.time()
    aud = claims.get("aud")
    if aud != audience and not (isinstance(aud, list) and audience in aud):
        raise TokenError("issued for another app")
    if claims.get("iss") not in issuers:
        raise TokenError("wrong issuer")
    exp, iat = claims.get("exp"), claims.get("iat", t)
    if not isinstance(exp, (int, float)) or exp <= t:
        raise TokenError("expired")
    if not isinstance(iat, (int, float)) or iat > t + 300:
        raise TokenError("issued in the future")
    return claims
