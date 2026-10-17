"""Paid plans (Free, Plus, Pro) through Stripe Checkout and the Stripe billing portal. Card details are typed only on Stripe's own pages: UAply never
sees or stores a card number. The plan of each account is stored on the server and changes only when Stripe tells us so through its signed webhook.

  GET  /api/billing/status     the signed-in account's plan, its weekly limit and use, and whether payments are switched on
  POST /api/billing/checkout   {plan: "plus"|"pro"} -> {url} of a Stripe Checkout page for a subscription
  POST /api/billing/portal     -> {url} of the Stripe billing portal (change card, switch plan, cancel, invoices)
  POST /api/billing/webhook    Stripe's events, checked against the Stripe-Signature header

Settings (uaply-config.json "stripe" block, or STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_PLUS / STRIPE_PRICE_PRO in the environment):
secret_key (sk_test_... or sk_live_...), webhook_secret (whsec_...), price_plus and price_pro (price_... ids of monthly prices made in Stripe).
"""
import hashlib
import hmac
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

import auth_api
import uaply_api

PLANS = {"free": {"name": "Free", "price": 0, "cap": 50}, "plus": {"name": "Plus", "price": 9.99, "cap": 250}, "pro": {"name": "Pro", "price": 19.99, "cap": 0}}
ACTIVE = ("active", "trialing", "past_due")          # past_due keeps the plan while Stripe retries the card


def _base():
    v = os.environ.get("UAPLY_STRIPE_BASE", "")
    return v if re.match(r"^http://(127\.0\.0\.1|localhost)(:\d+)?$", v) else "https://api.stripe.com"


def settings():
    s = dict(uaply_api.config().get("stripe") or {}) if isinstance(uaply_api.config().get("stripe"), dict) else {}
    for k, env in (("secret_key", "STRIPE_SECRET_KEY"), ("webhook_secret", "STRIPE_WEBHOOK_SECRET"), ("price_plus", "STRIPE_PRICE_PLUS"), ("price_pro", "STRIPE_PRICE_PRO")):
        if os.environ.get(env):
            s[k] = os.environ[env]
    key = s.get("secret_key") if isinstance(s.get("secret_key"), str) else ""
    s["on"] = bool(re.match(r"^sk_(test|live)_[A-Za-z0-9]{8,}$", key) and str(s.get("price_plus", "")).startswith("price_") and str(s.get("price_pro", "")).startswith("price_"))
    s["test"] = key.startswith("sk_test_")
    return s


def _stripe(method, path, params=None):
    s = settings()
    data = urllib.parse.urlencode(params or {}).encode() if method == "POST" else None
    req = urllib.request.Request(_base() + path + ("" if method == "POST" or not params else "?" + urllib.parse.urlencode(params)), data=data, method=method,
                                 headers={"Authorization": "Bearer " + s["secret_key"], "Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read(500000))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read(20000))
        except Exception:
            return e.code, {}
    except Exception:
        return 0, {}


def _week_used(user_id):
    since = time.time() - 7 * 86400
    with uaply_api._lock:
        return sum(1 for a in uaply_api.APPS if a.get("user") == user_id and a["at"] >= since and a["status"] not in ("failed", "duplicate", "handoff"))   # a hand-off sent nothing, so it is not an application


def plan_of(user):
    """The plan that is in force for an account right now ("free" when payments are off, the subscription lapsed, or there is no account)."""
    if not user or not settings()["on"]:
        return "free"
    r = auth_api.billing_row(user["id"]) or {}
    if r.get("plan") in ("plus", "pro") and (r.get("plan_status") in ACTIVE or (r.get("plan_renews") or 0) > time.time()):
        return r["plan"]
    return "free"


def limit_reached(user):
    """None, or a plain sentence when this account has used its weekly applications (only enforced when payments are switched on)."""
    if not user or not settings()["on"]:
        return None
    p = PLANS[plan_of(user)]
    if p["cap"] and _week_used(user["id"]) >= p["cap"]:
        return "You've used your %d applications this week on %s. Choose a bigger plan in Profile, Plan to keep applying." % (p["cap"], p["name"])
    return None


def status(user):
    s = settings()
    out = {"enabled": s["on"], "test": s["test"], "plans": {k: {"name": v["name"], "price": v["price"], "cap": v["cap"]} for k, v in PLANS.items()}}
    if user:
        r = auth_api.billing_row(user["id"]) or {}
        plan = plan_of(user)
        out.update(signedIn=True, plan=plan, used=_week_used(user["id"]), cap=PLANS[plan]["cap"], renews=r.get("plan_renews") or 0,
                   canceling=bool(r.get("plan_cancel")), status=r.get("plan_status") or "", hasCustomer=bool(r.get("stripe_customer")))
    else:
        out.update(signedIn=False, plan="free")
    return out


def checkout(user, plan, site):
    s = settings()
    if not s["on"]:
        return 503, {"error": "Payments are not switched on yet."}
    if not user:
        return 401, {"error": "Sign in first so the plan is saved to your account."}
    if not user.get("emailVerified"):
        return 403, {"error": "Verify your email first (Profile, Account).", "code": "verify"}
    if plan not in ("plus", "pro"):
        return 400, {"error": "Choose Plus or Pro."}
    r = auth_api.billing_row(user["id"]) or {}
    if r.get("stripe_sub") and plan_of(user) != "free":
        return 409, {"error": "You already have a plan. Use Manage billing to switch or cancel.", "code": "has_plan"}
    params = {"mode": "subscription", "line_items[0][price]": s["price_" + plan], "line_items[0][quantity]": "1",
              "success_url": site + "/?billing=success", "cancel_url": site + "/?billing=cancel",
              "client_reference_id": str(user["id"]), "metadata[uaply_user]": str(user["id"]), "metadata[plan]": plan,
              "subscription_data[metadata][uaply_user]": str(user["id"]), "subscription_data[metadata][plan]": plan, "allow_promotion_codes": "true"}
    if r.get("stripe_customer"):
        params["customer"] = r["stripe_customer"]
    else:
        params["customer_email"] = user["email"]
    code, body = _stripe("POST", "/v1/checkout/sessions", params)
    if code == 200 and str(body.get("url", "")).startswith(("https://", "http://127.0.0.1")):
        return 200, {"url": body["url"]}
    return 502, {"error": "The payment page could not be opened. Try again in a moment."}


def portal(user, site):
    s = settings()
    if not s["on"]:
        return 503, {"error": "Payments are not switched on yet."}
    if not user:
        return 401, {"error": "Sign in first."}
    r = auth_api.billing_row(user["id"]) or {}
    if not r.get("stripe_customer"):
        return 400, {"error": "There is no subscription to manage yet."}
    code, body = _stripe("POST", "/v1/billing_portal/sessions", {"customer": r["stripe_customer"], "return_url": site + "/?billing=portal"})
    if code == 200 and str(body.get("url", "")).startswith(("https://", "http://127.0.0.1")):
        return 200, {"url": body["url"]}
    return 502, {"error": "The billing page could not be opened. Try again in a moment."}


def verify_signature(raw, header, secret, tolerance=300, now=None):
    """Stripe's scheme: header 't=TIMESTAMP,v1=HEX[,v1=...]'; HEX = HMAC-SHA256(secret, 'TIMESTAMP.' + raw body). Rejects old events (replays)."""
    if not secret or not header:
        return False
    parts = [p.split("=", 1) for p in header.split(",") if "=" in p]
    ts = next((v for k, v in parts if k == "t"), "")
    sigs = [v for k, v in parts if k == "v1"]
    if not ts.isdigit() or not sigs:
        return False
    if abs((now or time.time()) - int(ts)) > tolerance:
        return False
    want = hmac.new(secret.encode(), ts.encode() + b"." + raw, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(want, s) for s in sigs)


def _plan_for_price(price_id):
    s = settings()
    return "plus" if price_id == s.get("price_plus") else "pro" if price_id == s.get("price_pro") else ""


def _apply_subscription(sub, user_id=None):
    meta = sub.get("metadata") or {}
    uid = user_id or (int(meta["uaply_user"]) if str(meta.get("uaply_user", "")).isdigit() else None) or auth_api.find_billing(sub.get("customer") or "", sub.get("id") or "")
    if not uid:
        return False
    items = ((sub.get("items") or {}).get("data") or [])
    price = ((items[0].get("price") or {}).get("id") if items else "") or ""
    plan = _plan_for_price(price) or (meta.get("plan") if meta.get("plan") in ("plus", "pro") else "")
    st = sub.get("status") or ""
    renews = int(sub.get("current_period_end") or (items[0].get("current_period_end") if items else 0) or 0)
    auth_api.set_billing(uid, plan=plan if (plan and st in ACTIVE) else "free", plan_status=st, plan_renews=renews,
                         plan_cancel=1 if sub.get("cancel_at_period_end") else 0, stripe_customer=sub.get("customer") or "", stripe_sub=sub.get("id") or "")
    return True


_seen = []


def webhook(raw, header):
    """Returns (status, body). Only events with a valid signature change anything. Each event id is handled once."""
    s = settings()
    if not verify_signature(raw, header, s.get("webhook_secret") or ""):
        return 400, {"error": "bad signature"}
    try:
        ev = json.loads(raw.decode("utf-8"))
    except ValueError:
        return 400, {"error": "bad body"}
    if not isinstance(ev, dict):
        return 400, {"error": "bad body"}
    if ev.get("id") in _seen:
        return 200, {"ok": True, "duplicate": True}
    kind, obj = ev.get("type", ""), ((ev.get("data") or {}).get("object") or {})
    if kind == "checkout.session.completed" and obj.get("mode") == "subscription":
        ref = obj.get("client_reference_id") or ""
        uid = int(ref) if str(ref).isdigit() else None
        if uid and obj.get("customer"):
            auth_api.set_billing(uid, stripe_customer=obj["customer"], stripe_sub=obj.get("subscription") or "")
        if obj.get("subscription"):
            code, sub = _stripe("GET", "/v1/subscriptions/" + urllib.parse.quote(obj["subscription"]))
            if code == 200:
                _apply_subscription(sub, uid)
    elif kind in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
        _apply_subscription(obj)
    # remembered only once it was handled: if handling failed (an error reaches serve.py, which answers 500), Stripe sends the event
    # again and that retry must not be thrown away as a duplicate, or the person who paid would never get the plan
    _seen.append(ev.get("id"))
    del _seen[:-500]
    return 200, {"ok": True}
