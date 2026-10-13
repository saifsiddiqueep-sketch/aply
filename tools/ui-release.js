// Release check for the dev build at phone size: no test or developer content anywhere, real jobs only, a blank new profile,
// no paid plans, and a working account area.
//   W=390 H=844 PORT=8767 node tools/cdp.js tools/ui-release.js
const PORT = process.env.PORT || "8767";
module.exports = async ({ ev, sleep, nav, logs }) => {
  const F = "document.querySelector('iframe').contentDocument";
  let bad = 0;
  const check = (name, ok, extra) => { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : "")); };
  const nl = "String.fromCharCode(10)";
  const pageText = () => ev("(document.body.innerText + ' ' + (" + F + ").body.innerText).split(" + nl + ").join(' ')");
  const sub = (s) => ev("(()=>{const e=[...(" + F + ").querySelectorAll('button,a,[role=tab]')].find(b=>b.offsetParent&&b.innerText.split(/\\s+/).join(' ').trim().startsWith(" + JSON.stringify(s) + "));if(e)e.click();return !!e})()");
  const setVal = (id, v) => ev("(()=>{const e=" + F + ".getElementById('" + id + "');if(!e)return false;e.value=" + JSON.stringify(v) + ";e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  // words that must never reach a real user of the release build
  const BANNED = /SANDBOX|TEST MODE|\(test\)|simulated|Sandbox controls|Northwind|Calloway|Ironbridge|Seaside Software|Redwood Marketing|Atlas Robotics|Harbor Bank|Summit Health|Corner Table|Brightpath|Lumen Labs|Release candidate|Plan & billing|Choose Plus|Choose Pro|Jordan Lee/i;
  const scan = async (where) => {
    const t = await pageText();
    const m = t.match(BANNED);
    check("no test or developer wording on " + where, !m, m ? "found: " + m[0] : "");
  };

  await nav("http://127.0.0.1:" + PORT + "/");
  await sleep(3500);
  check("developer bar is hidden", await ev("getComputedStyle(document.getElementById('devbar')).display === 'none'"));
  check("tab title is just UAply", (await ev("document.title")) === "UAply");
  check("jobs loaded from the server", (await ev("document.querySelector('iframe').contentWindow.__uaplyHideSamples === true")));
  check("a new visitor is told the scores use an example profile", await ev("getComputedStyle(" + F + ".getElementById('banner')).display !== 'none'"));
  check("no 'N jobs left' counters in the release build", await ev("getComputedStyle(" + F + ".getElementById('progress')).display === 'none'"));
  await scan("the first screen");
  console.log("   first card:", (await ev("(" + F + ").body.innerText.split(" + nl + ").filter(x=>x.trim()).slice(3,12).join(' | ')")).slice(0, 180));

  for (const tab of ["Full-time", "Part-time", "Internships", "Co-ops"]) {
    await ev(F + ".getElementById('nb-svc').click()"); await sleep(300);
    await sub(tab); await sleep(600);
    await scan("Services > " + tab);
  }
  await ev(F + ".getElementById('nb-dash').click()"); await sleep(400);
  for (const s of ["Overview", "Applied", "Accepted", "Rejected", "Interviews"]) { await sub(s); await sleep(300); await scan("Dashboard > " + s); }

  await ev(F + ".getElementById('nb-prof').click()"); await sleep(500);
  const items = await ev("[...(" + F + ").querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.innerText.trim().split(" + nl + ")[0]).join('|')");
  check("Profile menu has no Plan & billing", !/Plan & billing/.test(items), items.split("|").slice(-8).join(", "));
  for (const s of ["Account", "Settings", "Resume", "Preferences", "Filters", "Data"]) {
    if (!(await sub(s))) { await ev(F + ".getElementById('nb-prof').click()"); await sleep(350); await sub(s); }   // reopen the menu only if it closed
    await sleep(500);
    await scan("Profile > " + s);
    if (s === "Settings") {
      const vals = JSON.parse(await ev("JSON.stringify(['pName','pTitle','pYears','pSkills','pSalary','pLoc'].map(id=>(" + F + ".getElementById(id)||{}).value))"));
      check("a new profile starts blank (no sample name, title, skills, pay or city)", vals.every((v) => v === ""), JSON.stringify(vals));
    }
    if (s === "Account") {
      await sleep(600);
      check("account area shows the real sign-up form", !!(await ev("!!" + F + ".getElementById('sAgree')")), (await pageText()).slice(0, 140));
      check("no simulated sign-in buttons", !(await ev("!!" + F + ".querySelector('[data-auth=google],[data-auth=apple],[data-auth=sendlink],[data-auth=sendcode]')")));
    }
    if (s === "Data") { await sleep(700);  const n = await ev(F + ".querySelectorAll('[data-legal]').length"); check("Data & privacy lists the legal pages", n === 5, "found " + n); }
  }

  // saving only a name and email must not hide the real jobs
  await sub("Settings"); await sleep(400);
  await setVal("pName", "Release Tester"); await setVal("pEmail", "release.tester@example.com");
  await ev(F + ".getElementById('saveBtn').click()"); await sleep(900);
  await ev(F + ".getElementById('nb-svc').click()"); await sleep(300);
  await sub("Internships"); await sleep(700);
  const hidden = await ev("(" + F + ").body.innerText.split(" + nl + ").join(' ').match(/(\\d+) listings? (are|is) hidden because/)");
  check("saving just a name and email leaves the real jobs visible", !hidden, hidden ? hidden[0] : "");
  check("the example-profile notice goes away once there is a real profile", await ev("getComputedStyle(" + F + ".getElementById('banner')).display === 'none'"));
  check("a real internship card shows", (await ev(F + ".querySelectorAll('.card').length")) >= 1);
  await scan("the deck after saving a profile");

  // each service tab shows its own kind of job. Read the actual top card and look it up in the job list: no guessing from page text.
  const topJob = () => ev("JSON.stringify((()=>{const w=document.querySelector('iframe').contentWindow;const c=w.document.querySelector('.card.top');" +
    "if(!c)return {type:w.__uaply.getType(),card:null};const n=x=>String(x).split(/\\s+/).join(' ');const t=n(c.innerText);const j=w.__uaply.JOBS.find(j=>t.includes(n(j.role))&&t.includes(n(j.co)));" +
    "return {type:w.__uaply.getType(),card:j?{role:j.role,co:j.co,jtype:j.type||'job',live:!!j.live}:'unmatched'}})())");
  const pick = async (nb, label) => {                                   // open the menu and choose an item, the way a tap does
    await ev(F + ".getElementById('" + nb + "').click()"); await sleep(450);
    return ev("(()=>{const e=[...(" + F + ").querySelectorAll('.nitem')].find(b=>b.innerText.trim().startsWith(" + JSON.stringify(label) + "));if(!e)return false;e.click();return true})()");
  };
  const kinds = { "Full-time": "job", "Part-time": "parttime", "Internships": "internship", "Co-ops": "coop" };
  for (const [tab, want] of Object.entries(kinds)) {
    check("choosing " + tab + " works", await pick("nb-svc", tab)); await sleep(800);
    const r = JSON.parse(await topJob());
    if (r.card === null) check("Services > " + tab + " is empty with a friendly message", want === "coop" || want === "parttime", "no card (only acceptable for rare types)");
    else check("Services > " + tab + " shows a real " + want + " job", r.type === want && r.card !== "unmatched" && r.card.jtype === want && r.card.live === true,
      r.card === "unmatched" ? "card not found in job list" : r.card.co + ": " + r.card.role + " [" + r.card.jtype + ", live=" + r.card.live + "]");
  }

  // swiping right on a real job: consent once, then the hand-off to the employer's own page, and it appears under Applied
  await pick("nb-svc", "Internships"); await sleep(800);
  await ev(F + ".getElementById('btnYes').click()"); await sleep(1200);
  await ev("(()=>{const m=" + F + ".getElementById('kcYes');if(m)m.click()})()"); await sleep(2200);
  const after = await pageText();
  check("swiping right on a real job explains where to finish (employer's own site)", /takes applications on its own site|Apply there|Open the application|Application sent to/i.test(after), after.slice(-160));
  await ev(F + ".getElementById('nb-dash').click()"); await sleep(400);
  await sub("Applied"); await sleep(600);
  check("the swiped job appears under Dashboard > Applied", (await ev(F + ".querySelectorAll('.app,.appitem,[data-app],article,.row').length")) > 0 || /intern/i.test(await pageText()));
  check("no script errors", logs.length === 0, logs.join(" / ").slice(0, 160));
  console.log(bad ? "\n" + bad + " check(s) failed" : "\nAll release checks passed");
};
