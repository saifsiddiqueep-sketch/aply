// Walks through "Talk to a person" in the help chat, the way a visitor does, and saves screenshots of what they see.
//   OUT=<folder> NAME=<file prefix> W=390 H=844 PORT=18795 node tools/cdp.js tools/shot-help-flow.js
const path = require("path");
const fs = require("fs");
const PORT = process.env.PORT || "18795";
module.exports = async ({ ev, sleep, nav, shot }) => {
  const F = "document.querySelector('iframe').contentDocument";
  const OUT = process.env.OUT;
  const NAME = process.env.NAME || "help";
  fs.mkdirSync(OUT, { recursive: true });
  const chip = (txt) => ev("(()=>{const e=[...(" + F + ").querySelectorAll('#uaChat button')].find(b=>b.offsetParent&&b.innerText.trim().startsWith(" + JSON.stringify(txt) + "));if(!e)return false;e.click();return true})()");
  const type = (txt) => ev("(()=>{const d=" + F + ";const i=d.getElementById('uaChatIn');i.value=" + JSON.stringify(txt) + ";d.getElementById('uaChatF').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))})()");
  const log = () => ev("(()=>{const l=" + F + ".getElementById('uaChatLog');return l?l.innerText.split(/\\s+/).join(' '):''})()");

  await nav("http://127.0.0.1:" + PORT + "/");
  await sleep(3500);
  await ev(F + ".getElementById('uaChatBtn').click()"); await sleep(900);
  console.log("starters:", await chip("Talk to a person")); await sleep(700);
  if (await chip("Leave a message here")) await sleep(600);
  await type("I signed up but the verification code never arrives. Can someone help?"); await sleep(700);
  if (!(await chip("Yes, I'll type my email"))) await chip("Use a different email");
  await sleep(500);
  await type("sam.rivera@gmail.com"); await sleep(3500);
  const t = await log();
  console.log("chat says:", t.slice(-330));
  await shot(path.join(OUT, NAME + "-chat.png"));
};
