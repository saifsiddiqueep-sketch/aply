// Makes the server misbehave on purpose and checks the app copes: no script errors, no "undefined"/"NaN"/"[object Object]" on screen,
// never a blank screen, and a human message where something could not load.
//   W=390 H=844 PORT=18795 node tools/cdp.js tools/ui-errors.js
const PORT = process.env.PORT || "18795";
module.exports = async ({ ev, sleep, nav, logs, send, on, shot }) => {
  const F = "document.querySelector('iframe').contentDocument";
  let bad = 0;
  const check = (name, ok, extra) => { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : "")); };
  const text = () => ev("(" + F + ").body.innerText.split(/\\s+/).join(' ')");
  const click = (txt) => ev("(()=>{const e=[...(" + F + ").querySelectorAll('button,a,[role=tab]')].find(b=>b.offsetParent&&b.innerText.split(/\\s+/).join(' ').trim().startsWith(" + JSON.stringify(txt) + "));if(!e)return false;e.click();return true})()");
  const BADTOK = /undefined|\[object Object\]|\bNaN\b|\bnull\b|Traceback|Internal Server Error|<html|<!doctype/i;

  let mode = "ok";
  const b64 = (s) => Buffer.from(s).toString("base64");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  on("Fetch.requestPaused", (p) => {
    const id = p.requestId;
    if (mode === "ok") return send("Fetch.continueRequest", { requestId: id });
    if (mode === "offline") return send("Fetch.failRequest", { requestId: id, errorReason: "InternetDisconnected" });
    if (mode === "500") return send("Fetch.fulfillRequest", { requestId: id, responseCode: 500, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: b64('{"error":"boom"}') });
    if (mode === "502html") return send("Fetch.fulfillRequest", { requestId: id, responseCode: 502, responseHeaders: [{ name: "Content-Type", value: "text/html" }], body: b64("<html><body>Bad gateway</body></html>") });
    if (mode === "garbage") return send("Fetch.fulfillRequest", { requestId: id, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: b64("this is not json {{{") });
    if (mode === "empty") return send("Fetch.fulfillRequest", { requestId: id, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: b64("{}") });
    if (mode === "nulls") return send("Fetch.fulfillRequest", { requestId: id, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: b64('{"jobs":[{"id":1}],"user":null,"google":null}') });
    return send("Fetch.continueRequest", { requestId: id });
  });

  for (const m of ["offline", "500", "502html", "garbage", "empty", "nulls"]) {
    mode = m;
    const errsBefore = logs.length;
    await nav("http://127.0.0.1:" + PORT + "/");
    await sleep(4500);
    const t1 = await text();
    check("[" + m + "] the first screen is not blank", t1.length > 40, "(" + t1.length + " chars)");
    check("[" + m + "] no 'undefined', 'NaN' or raw error text on the first screen", !BADTOK.test(t1), BADTOK.test(t1) ? t1.match(BADTOK)[0] : "");
    console.log("   first screen says:", t1.slice(0, 170));
    // every menu screen must still render something sensible
    for (const [nb, label] of [["nb-svc", "Coop"], ["nb-dash", "Applied"], ["nb-prof", "Account"], ["nb-prof", "Profile setup"], ["nb-prof", "Data"]]) {
      await ev(F + ".getElementById('" + nb + "').click()"); await sleep(350);
      let ok = await click(label);
      if (!ok) { await ev(F + ".getElementById('" + nb + "').click()"); await sleep(350); ok = await click(label); }
      await sleep(700);
      const t = await text();
      check("[" + m + "] " + label + " opens and shows no broken text", ok && t.length > 40 && !BADTOK.test(t), BADTOK.test(t) ? "found: " + t.match(BADTOK)[0] : "");
      if (label === "Account") console.log("   account screen says:", t.slice(0, 200));
    }
    // the assistant should answer or apologise, never hang silently
    await ev("(()=>{const b=" + F + ".getElementById('uaChatBtn');if(b)b.click()})()"); await sleep(700);
    await ev("(()=>{const d=" + F + ";const i=d.getElementById('uaChatIn');if(!i)return;i.value='How do I apply?';d.getElementById('uaChatF').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))})()");
    await sleep(2500);
    const chat = await ev("(()=>{const l=" + F + ".getElementById('uaChatLog');return l?l.innerText.split(/\\s+/).join(' '):''})()");
    check("[" + m + "] the assistant answered or apologised", chat.length > 60 && !BADTOK.test(chat), "(" + chat.slice(-110) + ")");
    const newErrs = logs.slice(errsBefore).filter((l) => !/Failed to load resource|net::ERR|status of (500|502)|JSON|Unexpected token|is not valid JSON/i.test(l));
    check("[" + m + "] no uncaught script errors", newErrs.length === 0, newErrs.slice(0, 3).join(" | "));
    if (process.env.OUT && (m === "500" || m === "offline")) await shot(require("path").join(process.env.OUT, "errors-" + m + ".png"));      // a picture only when asked for one
  }
  mode = "ok";
  console.log(bad ? bad + " problem(s)" : "All good");
};
