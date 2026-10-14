// Signs up in the browser against a server that CAN send real email, then saves screenshots of: the sign-up card, the email as it arrives, and the verified account.
//   OUT=<folder> MAIL=<mail.jsonl of tools/fake-smtp.py> W=390 H=844 PORT=18795 node tools/cdp.js tools/shot-verify-flow.js
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
  const text = () => ev("(" + F + ").body.innerText.split(/\\s+/).join(' ')");
  const EMAIL = "new.user@gmail.com";

  await nav("http://127.0.0.1:" + PORT + "/");
  await sleep(3000);
  await ev(F + ".getElementById('nb-prof').click()"); await sleep(400);
  await click("Account"); await sleep(1500);
  await set("sEmail", EMAIL); await set("sPw", "correct horse 99"); await set("sPw2", "correct horse 99");
  await ev("(()=>{" + F + ".getElementById('sAgree').checked=true})()");
  await ev(F + ".querySelector('[data-auth=ssubmit]').click()"); await sleep(3000);
  await ev("(()=>{const c=" + F + ".getElementById('sCode');if(c)c.scrollIntoView({block:'center'})})()"); await sleep(500);
  const t = await text();
  console.log("card says test inbox:", /test inbox/i.test(t), "| card says emailed:", /We emailed a 6-digit code to new\.user@gmail\.com/.test(t));
  await shot(path.join(OUT, "verify-1-card.png"));

  // the email as it arrives
  const info = execFileSync("python", ["tools/mail-extract.py", process.env.MAIL, OUT, EMAIL], { encoding: "utf-8" });
  console.log(info.trim().split("\n").join(" | "));
  const code = (info.match(/code=(\d{6})/) || [])[1];
  await nav("file:///" + path.join(OUT, "email.html").split(path.sep).join("/"));
  await sleep(800);
  await shot(path.join(OUT, "verify-2-email.png"));

  // enter the code
  await nav("http://127.0.0.1:" + PORT + "/");
  await sleep(3000);
  await ev(F + ".getElementById('nb-prof').click()"); await sleep(400);
  await click("Account"); await sleep(1500);
  await set("sCode", code || "000000");
  await ev(F + ".querySelector('[data-auth=sverify]').click()"); await sleep(1800);
  const t2 = await text();
  console.log("after entering the code, account says verified:", /email verified/i.test(t2) && !/not verified/i.test(t2));
  await shot(path.join(OUT, "verify-3-verified.png"));
};
