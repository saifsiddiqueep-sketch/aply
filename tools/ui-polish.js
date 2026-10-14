// Checks the small visible details on the release build with live jobs, and saves screenshots of them.
//   OUT=<folder> W=390 H=844 PORT=18795 node tools/cdp.js tools/ui-polish.js
const path = require("path");
const fs = require("fs");
const PORT = process.env.PORT || "18795";
module.exports = async ({ ev, sleep, nav, shot }) => {
  const F = "document.querySelector('iframe').contentDocument";
  const W = "document.querySelector('iframe').contentWindow";
  const OUT = process.env.OUT;
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  let bad = 0;
  const check = (name, ok, extra) => { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : "")); };
  const click = (txt) => ev("(()=>{const e=[...(" + F + ").querySelectorAll('button,a,[role=tab]')].find(b=>b.offsetParent&&b.innerText.split(/\\s+/).join(' ').trim().startsWith(" + JSON.stringify(txt) + "));if(!e)return false;e.click();return true})()");

  await nav("http://127.0.0.1:" + PORT + "/");
  await sleep(4000);
  const jobs = JSON.parse(await ev("JSON.stringify(" + W + ".__uaply.JOBS.filter(j=>j.live).map(j=>({role:j.role,loc:j.loc,mode:j.mode,skills:j.skills})))"));
  check("real postings are loaded", jobs.length > 20, "(" + jobs.length + ")");

  // 1. a remote job's place never repeats the word Remote
  const dup = jobs.filter((j) => j.mode === "remote" && /^\W*remote\b/i.test(j.loc));
  check("no remote job repeats the word Remote in its place", dup.length === 0, dup.slice(0, 3).map((j) => j.loc).join(" | "));
  console.log("   sample places of remote jobs:", [...new Set(jobs.filter((j) => j.mode === "remote").map((j) => j.loc))].slice(0, 6).join(" | "));

  // 2. Hiring appears only on people roles
  const hiring = jobs.filter((j) => (j.skills || []).includes("Hiring") && !/recruit|talent|people|\bhr\b|human resources|staffing|sourcer|hiring/i.test(j.role));
  check("'Hiring' is never listed as a skill on a non-recruiting job", hiring.length === 0, hiring.slice(0, 3).map((j) => j.role).join(" | "));

  // 3. every match ring fits its number (measured: the text must be narrower than the ring's inner circle)
  await ev(F + ".getElementById('nb-svc').click()"); await sleep(400);
  await click("Full-time"); await sleep(900);
  const ring = JSON.parse(await ev("JSON.stringify((()=>{const c=" + F + ".querySelector('.card.top');if(!c)return null;const b=c.querySelector('.ring b');const r=c.querySelector('.ring svg').getBoundingClientRect();" +
    "const rg=document.querySelector('iframe').contentDocument.createRange();rg.selectNodeContents(b);const t=rg.getBoundingClientRect();" +
    "const cir=c.querySelector('.ring circle.fg');const sw=parseFloat(getComputedStyle(cir).strokeWidth)||7;const vb=(c.querySelector('.ring svg').viewBox.baseVal||{width:r.width}).width||r.width;" +
    "return {text:b.textContent,cls:b.className,textW:Math.round(t.width*10)/10,ringW:Math.round(r.width),stroke:Math.round(sw*r.width/vb*10)/10,cardRole:c.querySelector('h2').textContent}})())"));
  console.log("   top card:", JSON.stringify(ring));
  if (ring) {
    const scaled = ring.cls.indexOf("r3") >= 0 ? 1 : 1;       // getBoundingClientRect already includes the scale transform
    const inner = ring.ringW - 2 * ring.stroke;
    check("the score '" + ring.text + "' fits inside its ring with room to spare", ring.textW <= inner - 6, "(text " + ring.textW + "px, inner circle " + Math.round(inner) + "px)");
  }
  if (OUT) await shot(path.join(OUT, "fix-1-card-ring-and-place.png"));

  // 4. Settings: a new profile has an empty email
  await ev(F + ".getElementById('nb-prof').click()"); await sleep(400);
  await click("Settings"); await sleep(600);
  const email = await ev(F + ".getElementById('pEmail').value");
  check("a new profile's email field is empty (no sample address)", email === "", JSON.stringify(email));
  if (OUT) await shot(path.join(OUT, "fix-2-settings-blank-email.png"));

  // 5. the assistant opens and answers a real question
  await ev(F + ".getElementById('uaChatBtn').click()"); await sleep(900);
  await ev("(()=>{const d=" + F + ";const i=d.getElementById('uaChatIn');i.value='How do I verify my email?';i.dispatchEvent(new Event('input',{bubbles:true}));d.getElementById('uaChatF').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))})()");
  await sleep(2500);
  const log = await ev("(" + F + ").getElementById('uaChatLog').innerText.split(String.fromCharCode(10)).join(' / ')");
  console.log("   assistant said:", log.slice(0, 300));
  check("the assistant answered the question about verifying email", /verif|code|email/i.test(log) && log.length > 80);
  if (OUT) await shot(path.join(OUT, "fix-3-assistant.png"));
  console.log(bad ? bad + " problem(s)" : "All good");
};
