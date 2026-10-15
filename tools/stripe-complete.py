"""Plays Stripe's part after a test payment: makes the subscription in tools/mock-stripe.py and sends UAply the signed checkout.session.completed event.
  python tools/stripe-complete.py <mock port> <uaply port> <webhook secret>"""
import hashlib
import hmac
import json
import sys
import time
import urllib.parse
import urllib.request

mock, app, secret = sys.argv[1], sys.argv[2], sys.argv[3]
sess = json.loads(urllib.request.urlopen("http://127.0.0.1:%s/__sessions" % mock).read())[-1]
sub = {"id": "sub_demo", "customer": "cus_demo", "status": "active", "cancel_at_period_end": False, "current_period_end": int(time.time()) + 30 * 86400,
       "items": {"data": [{"price": {"id": sess["line_items[0][price]"]}}]}, "metadata": {}}
urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:%s/__subscription" % mock, data=urllib.parse.urlencode({"id": "sub_demo", "json": json.dumps(sub)}).encode()))
ev = {"id": "evt_demo_%d" % time.time(), "type": "checkout.session.completed",
      "data": {"object": {"mode": "subscription", "client_reference_id": sess["client_reference_id"], "customer": "cus_demo", "subscription": "sub_demo"}}}
raw, ts = json.dumps(ev).encode(), str(int(time.time()))
sig = "t=%s,v1=%s" % (ts, hmac.new(secret.encode(), ts.encode() + b"." + raw, hashlib.sha256).hexdigest())
r = urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:%s/api/billing/webhook" % app, data=raw, headers={"Stripe-Signature": sig, "Content-Type": "application/json"}))
print("webhook", r.status, r.read().decode())
