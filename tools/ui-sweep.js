// Walks every screen of the sandbox (or dev: PORT=8767) in a headless browser and reports what is missing or throws.
// node tools/cdp.js tools/ui-sweep.js
const PORT = process.env.PORT || "8766";
const REL = process.env.REL === "1";      // the release build (dev): no Plan screen, real jobs only (covered by tools/ui-release.js)
module.exports = async ({ ev, sleep, nav, logs }) => {
  const F = "document.querySelector('iframe').contentDocument";
  const W = "document.querySelector('iframe').contentWindow";
  let bad = 0;
  const check = (name, ok, extra) => { if (!ok || (typeof ok === "string" && ok.startsWith("JSERR"))) { ok = false; bad++; } console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : "")); };
  const clickText = (txt, scope = "button,a,[role=tab]") => ev("(()=>{const e=[...(" + F + ").querySelectorAll('" + scope + "')].find(b=>b.innerText.split(/\\s+/).join(' ').trim().startsWith(" + JSON.stringify(txt) + "));if(!e)return false;e.click();return true})()");
  const visibleText = () => ev("(" + F + ").body.innerText.split(/\\s+/).join(' ')");

  await nav("http://127.0.0.1:" + PORT + "/");
  await sleep(1500);
  check("page loads with job cards", (await ev(F + ".querySelectorAll('.card').length")) >= 1);

  // services
  await ev(F + ".getElementById('nb-svc').click()");
  await sleep(500);
  for (const tab of ["Full-time", "Part-time", "Internships", "Coop"]) {
    const ok = await clickText(tab);
    await sleep(400);
    check("Services: " + tab + " (cards or an empty message shows)", ok && ((await ev(F + ".querySelectorAll('.card').length")) > 0 || (await visibleText()).length > 200));
  }
  await clickText("Full-time");
  await sleep(400);
  for (const f of ["All", "Remote", "Hybrid", "On-site"]) {
    check("filter chip " + f, await clickText(f, "button"));
    await sleep(150);
  }
  await clickText("All", "button");
  await sleep(500);
  // swipe right on a job: the application must reach the simulated recruiter inbox
  const before = JSON.parse(await ev("fetch('/api/outbox').then(r=>r.json()).then(j=>JSON.stringify({n:j.applications.length}))")).n;
  // fill in the profile the way a person would (Profile, Settings), then save
  await ev(F + ".getElementById('nb-prof').click()");
  await sleep(400);
  await clickText("Settings");
  await sleep(400);
  const setVal = (id, v) => ev("(()=>{const e=" + F + ".getElementById('" + id + "');if(!e)return false;e.value=" + JSON.stringify(v) + ";e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  check("profile name field", await setVal("pName", "Test User"));
  check("profile email field", await setVal("pEmail", "sweep.tester@example.com"));
  await setVal("pSkills", "Python, SQL, Git");
  await ev("(()=>{const f=" + F + ".getElementById('saveBtn');f.click();return true})()");
  await sleep(800);
  await ev(F + ".getElementById('nb-svc').click()");
  await sleep(600);
  check("Apply button exists", !!(await ev("!!" + F + ".getElementById('btnYes')")));
  await ev(F + ".getElementById('btnYes').click()");
  await sleep(1500);
  console.log("  consent dialog:", await ev("(()=>{const m=" + F + ".getElementById('kcYes');if(!m)return 'none (already agreed)';m.click();return 'agreed'})()"));
  await sleep(2500);
  const after = JSON.parse(await ev("fetch('/api/outbox').then(r=>r.json()).then(j=>JSON.stringify({n:j.applications.length}))")).n;
  console.log("  applications in inbox before/after:", before, after);
  const newest = await ev("fetch('/api/outbox').then(r=>r.json()).then(j=>(j.applications[0]||{}).status||'')");
  check(REL ? "swipe right on a real job is recorded as a hand-off to the employer's own page" : "swipe right created an application in the test inbox",
        REL ? after > before && newest === "handoff" : after > before, "(newest status: " + newest + ")");
  // dashboard
  await ev(F + ".getElementById('nb-dash').click()");
  await sleep(500);
  for (const t of ["Overview", "Applied", "Accepted", "Rejected", "Interviews"]) {
    check("Dashboard: " + t, await clickText(t));
    await sleep(250);
  }
  // profile sections
  await ev(F + ".getElementById('nb-prof').click()");
  await sleep(500);
  for (const t of ["Account", "Settings", "Resume", "Preferences", "Filters", "Plan", "Data"].filter((x) => !(REL && x === "Plan"))) {
    const ok = await clickText(t);
    await sleep(350);
    const txt = await visibleText();
    check("Profile: " + t, ok && txt.length > 100, "(clicked=" + ok + ", text length=" + txt.length + ")");
  }
  // data & privacy has the legal block
  check("Data & privacy shows Legal links", (await ev(F + ".querySelectorAll('[data-legal]').length")) === 5);
  // settings controls
  await clickText("Settings");
  await sleep(400);
  check("Settings has a Save button", !!(await ev("!!" + F + ".getElementById('saveBtn')")));
  // help assistant
  check("Help button opens the assistant", await ev("(()=>{const b=" + F + ".getElementById('uaChatBtn');if(!b)return false;b.click();return true})()"));
  await sleep(500);
  check("assistant panel appears", await ev("!!" + F + ".querySelector('#uaChat, .uaChat, [id^=uaChat]:not(#uaChatBtn)')"));
  // legal bar
  check("legal bar links", (await ev(F + ".querySelectorAll('#legalbar a').length")) === 4);
  console.log(bad ? "\n" + bad + " check(s) failed" : "\nAll sweep checks passed");
};
