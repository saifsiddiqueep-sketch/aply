// Signs up and verifies, opens Profile > Plan, chooses Plus, shows the (stand-in) Stripe checkout, completes the payment and shows Plus active.
//   OUT=<folder> MAIL=<mail.jsonl> STRIPE=<mock port> WH=<whsec> W=390 H=844 PORT=18795 node tools/cdp.js tools/shot-billing.js
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const PORT = process.env.PORT || "18795";
module.exports = async ({ ev, sleep, nav, shot }) => {
  const F = "document.querySelector('iframe').contentDocument";
  const OUT = process.env.OUT;
  fs.mkdirSync(OUT, { recursive: true });
  const set = (id, v) => ev("(()=>{const e=" + F + ".getElementById('" + id + "');if(!e)return false;e.value=" + JSON.stringify(v) + ";e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
  const click = (txt) => ev("(()=>{const e=[...(" + F + ").querySelectorAll('button,a,[role=tab]')].find(b=>b.offsetParent&&b.innerText.split(/\\s+/).join(' ').trim().startsWith(" + JSON.stringify(txt) + "));if(!e)return false;e.click();return true})()");
  const go = async (label) => { await ev(F + ".getElementById('nb-prof').click()"); await sleep(350); let ok = await click(label); if (!ok) { await ev(F + ".getElementById('nb-prof').click()"); await sleep(350); ok = await click(label); } await sleep(900); return ok; };
  const EMAIL = "payer@gmail.com";
  await nav("http://127.0.0.1:" + PORT + "/");
  await sleep(3500);
  await go("Account");
  await set("sEmail", EMAIL); await set("sPw", "correct horse 99"); await set("sPw2", "correct horse 99");
  await ev("(()=>{" + F + ".getElementById('sAgree').checked=true})()");
  await ev(F + ".querySelector('[data-auth=ssubmit]').click()"); await sleep(3000);
  const code = (execFileSync("python", ["tools/mail-extract.py", process.env.MAIL, OUT, EMAIL], { encoding: "utf-8" }).match(/code=(\d{6})/) || [])[1];
  await set("sCode", code); await ev(F + ".querySelector('[data-auth=sverify]').click()"); await sleep(1800);
  console.log("plan tab:", await go("Plan"));
  await shot(path.join(OUT, "bill-1-plans.png"));
  await ev("(()=>{const b=" + F + ".querySelector('[data-bill=plus]');if(b)b.click()})()"); await sleep(3000);
  console.log("now at:", await ev("location.href"));
  await shot(path.join(OUT, "bill-2-stripe-checkout.png"));
  console.log(execFileSync("python", ["tools/stripe-complete.py", process.env.STRIPE, PORT, process.env.WH], { encoding: "utf-8" }).trim());
  await nav("http://127.0.0.1:" + PORT + "/?billing=success");
  await sleep(6000);
  await ev("(()=>{const d=" + F + ";d.scrollingElement.scrollTop=0})()");
  await shot(path.join(OUT, "bill-3-plus-active.png"));
  console.log("status:", await ev("fetch('/api/billing/status').then(r=>r.json()).then(j=>j.plan+' cap '+j.cap)"));
};
