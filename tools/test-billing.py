"""Tests paid plans end to end against a stand-in Stripe: checkout, the signed webhook, activation, cancel and lapse, weekly limits, and forged or replayed events.
  python tools/test-billing.py"""
import hashlib
import hmac
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
TMP = tempfile.mkdtemp(prefix="uaply-billing-")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8798          # a free port can be given: python tools/test-billing.py PORT
os.environ.update(UAPLY_DATA_DIR=TMP, UAPLY_CONFIG_JSON="{}", UAPLY_STRIPE_BASE="http://127.0.0.1:%d" % PORT)
import auth_api  # noqa: E402
import billing_api  # noqa: E402
import uaply_api  # noqa: E402

R = []
WH = "whsec_testsecret"


def t(name, got, want):
    ok = got == want
    R.append(ok)
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else "  -> got %r, wanted %r" % (got, want)))


proc = subprocess.Popen([sys.executable, os.path.join(HERE, "mock-stripe.py"), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
cfg = {"delivery": "test", "smtp": {}, "stripe": {"secret_key": "sk_test_mockkey123456", "webhook_secret": WH, "price_plus": "price_plus1", "price_pro": "price_pro1"}}
uaply_api.config = lambda: cfg
uaply_api.init("billing")
auth_api.init("billing")


def signed(event, ts=None, secret=WH):
    raw = json.dumps(event).encode()
    ts = str(int(ts or time.time()))
    return raw, "t=%s,v1=%s" % (ts, hmac.new(secret.encode(), ts.encode() + b"." + raw, hashlib.sha256).hexdigest())


def add_sub(sid, cust, price, status="active", cancel=False, end=None):
    sub = {"id": sid, "customer": cust, "status": status, "cancel_at_period_end": cancel, "current_period_end": end or int(time.time()) + 30 * 86400,
           "items": {"data": [{"price": {"id": price}}]}, "metadata": {}}
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:%d/__subscription" % PORT, data=urllib.parse.urlencode({"id": sid, "json": json.dumps(sub)}).encode()))
    return sub


try:
    s, out, tok = auth_api.signup("payer@example.com", "correct horse 99", "10.0.0.1", True)
    uid = auth_api.user_for(tok)["id"]
    user = auth_api.user_for(tok)
    t("payments are on with a test key and both prices", (billing_api.settings()["on"], billing_api.settings()["test"]), (True, True))
    t("a new account is on Free with 50 a week", (billing_api.status(user)["plan"], billing_api.status(user)["cap"]), ("free", 50))
    t("checkout needs a verified email", billing_api.checkout(user, "plus", "http://x")[0], 403)
    auth_api.verify_code(tok, auth_api.issue_code_for_token(tok)[2], "10.0.0.1")
    user = auth_api.user_for(tok)
    t("a made-up plan is refused", billing_api.checkout(user, "gold", "http://x")[0], 400)
    t("checkout without an account is refused", billing_api.checkout(None, "plus", "http://x")[0], 401)
    code, out = billing_api.checkout(user, "plus", "http://localhost:8767")
    sess = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/__sessions" % PORT).read())[-1]
    t("checkout opens a Stripe page for the Plus price as a subscription", (code, out["url"].startswith("http://127.0.0.1"), sess["mode"], sess["line_items[0][price]"]), (200, True, "subscription", "price_plus1"))
    t("...tied to this account, with the account email, and coming back to the site", (sess["client_reference_id"], sess["customer_email"], sess["success_url"]), (str(uid), "payer@example.com", "http://localhost:8767/?billing=success"))
    t("before Stripe confirms, the plan is still Free (a redirect alone never upgrades anyone)", billing_api.plan_of(user), "free")

    add_sub("sub_1", "cus_1", "price_plus1")
    ev = {"id": "evt_1", "type": "checkout.session.completed", "data": {"object": {"mode": "subscription", "client_reference_id": str(uid), "customer": "cus_1", "subscription": "sub_1"}}}
    raw, sig = signed(ev)
    t("a forged event (wrong secret) is refused and changes nothing", (billing_api.webhook(*signed(ev, secret="whsec_wrong"))[0], billing_api.plan_of(user)), (400, "free"))
    t("an old event (replayed) is refused", billing_api.webhook(*signed(ev, ts=time.time() - 3600))[0], 400)
    t("a signed event from Stripe is accepted", billing_api.webhook(raw, sig)[0], 200)
    st = billing_api.status(user)
    t("the account is now on Plus with 250 a week and a renewal date", (st["plan"], st["cap"], st["renews"] > time.time()), ("plus", 250, True))
    t("the same event twice is handled once", billing_api.webhook(raw, sig)[1].get("duplicate"), True)
    t("a second checkout while subscribed is refused (use Manage billing)", billing_api.checkout(user, "pro", "http://x")[0], 409)
    code, out = billing_api.portal(user, "http://localhost:8767")
    t("Manage billing opens the Stripe portal for this customer", (code, out["url"].endswith("/portal/cus_1")), (200, True))

    sub = add_sub("sub_1", "cus_1", "price_pro1")
    billing_api.webhook(*signed({"id": "evt_2", "type": "customer.subscription.updated", "data": {"object": sub}}))
    t("switching to Pro in the portal makes the account Pro (no weekly limit)", (billing_api.plan_of(user), billing_api.status(user)["cap"]), ("pro", 0))
    sub = add_sub("sub_1", "cus_1", "price_pro1", cancel=True)
    billing_api.webhook(*signed({"id": "evt_3", "type": "customer.subscription.updated", "data": {"object": sub}}))
    t("canceling keeps Pro until the end of the paid month and says so", (billing_api.plan_of(user), billing_api.status(user)["canceling"]), ("pro", True))
    sub = add_sub("sub_1", "cus_1", "price_pro1", status="canceled", end=int(time.time()) - 10)
    billing_api.webhook(*signed({"id": "evt_4", "type": "customer.subscription.deleted", "data": {"object": sub}}))
    t("when the subscription ends the account is back on Free", billing_api.plan_of(user), "free")
    # the server fails while handling an event (the database is busy, say): Stripe sends it again, and that retry must count
    sub = add_sub("sub_1", "cus_1", "price_plus1")
    raw6, sig6 = signed({"id": "evt_6", "type": "customer.subscription.updated", "data": {"object": sub}})
    real_set = auth_api.set_billing

    def busy(*a, **k):
        raise RuntimeError("database is locked")
    auth_api.set_billing = busy
    try:
        billing_api.webhook(raw6, sig6)
        first = "handled"
    except RuntimeError:
        first = "error"                                   # serve.py answers 500 here, so Stripe tries again later
    auth_api.set_billing = real_set
    t("an event whose handling failed is not remembered as done, so Stripe's retry switches the plan on",
      (first, billing_api.webhook(raw6, sig6)[1].get("duplicate"), billing_api.plan_of(user)), ("error", None, "plus"))
    sub = add_sub("sub_1", "cus_1", "price_pro1", status="canceled", end=int(time.time()) - 10)
    billing_api.webhook(*signed({"id": "evt_7", "type": "customer.subscription.deleted", "data": {"object": sub}}))
    t("a signed event that is not an object is refused, not a crash", billing_api.webhook(*signed(["not", "an", "object"]))[0], 400)

    # weekly limits, enforced by the server
    for i in range(50):
        uaply_api.APPS.append({"user": uid, "at": time.time(), "status": "delivered_test", "job": {"id": i}, "candidate": {"email": "payer@example.com"}, "mode": "test"})
    t("on Free the 51st application in a week is stopped with a plain reason", "50 applications this week" in (billing_api.limit_reached(user) or ""), True)
    sub = add_sub("sub_2", "cus_1", "price_plus1")
    billing_api.webhook(*signed({"id": "evt_5", "type": "customer.subscription.updated", "data": {"object": sub}}))
    t("on Plus the same account can keep applying", billing_api.limit_reached(user), None)
    cfg["stripe"] = {}
    t("with payments switched off nobody is limited and everyone is on Free", (billing_api.limit_reached(user), billing_api.plan_of(user), billing_api.status(user)["enabled"]), (None, "free", False))
    t("checkout is refused while payments are off", billing_api.checkout(user, "plus", "http://x")[0], 503)
finally:
    proc.terminate()

print(sum(R), "/", len(R))
sys.exit(0 if all(R) else 1)
