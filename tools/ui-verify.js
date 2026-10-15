// The sign-up and email-code screens in a real browser, and Google's button area. Needs a server with the stand-in Google configured
// (see tools/run-all-tests.sh) so the Google area is switched on.   W=390 H=844 PORT=18768 node tools/cdp.js tools/ui-verify.js
const PORT = process.env.PORT || "18768";
module.exports = async ({ ev, sleep, nav, logs }) => {
  const F = "document.querySelector('iframe').contentDocument";
  const BASE = "http://127.0.0.1:" + PORT;
  let bad = 0;
  const check = (name, ok, extra) => { if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : "")); };
  const NL = "String.fromCharCode(10)";
  const text = () => ev("(" + F + ").body.innerText.split(" + NL + ").join(' ')");
  const msg = () => ev("((" + F + ").getElementById('aMsg')||{}).innerText||''");
  const setVal = (id, v) => ev("(()=>{const e=" + F + ".getElementById('" + id + "');if(!e)return false;e.value=" + JSON.stringify(v) + ";e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
  const click = (a) => ev("(()=>{const e=" + F + ".querySelector('[data-auth=\"" + a + "\"]');if(!e)return false;e.click();return true})()");
  const openAccount = async () => {
    await ev(F + ".getElementById('nb-prof').click()"); await sleep(450);
    await ev("(()=>{const e=[...(" + F + ").querySelectorAll('.nitem')].find(b=>b.innerText.trim().startsWith('Account'));if(e)e.click()})()"); await sleep(900);
  };
  const codeFromInbox = () => ev("fetch('/outbox').then(r=>r.text()).then(t=>{const m=t.match(/([0-9]{6}) is your UAply verification code/);return m?m[1]:''})");
  const email = "ui.verify." + Date.now() + "@example.com";

  await nav(BASE + "/");
  await sleep(3500);
  await openAccount();
  check("the sign-up form shows", !!(await ev("!!" + F + ".getElementById('sAgree')")));
  check("Google's button area is there (the page was told Google is switched on)", !!(await ev("!!" + F + ".getElementById('gBtn')")));
  check("the Google area has its own consent box (needed the first time)", !!(await ev("!!" + F + ".getElementById('gAgree')")));
  await sleep(2500);
  const gbox = await ev("((" + F + ").getElementById('gBtn')||{}).innerText||''");
  const gframe = await ev("!!" + F + ".querySelector('#gBtn iframe, #gBtn div[role=button]')");
  check("Google's button drew, or the page fell back to a clear message", gframe || /Continue with Google|could not load/.test(gbox), gframe ? "(drawn by Google)" : gbox.slice(0, 80));

  // sign up with a password
  await setVal("sEmail", email); await setVal("sPw", "correct horse 99"); await setVal("sPw2", "correct horse 99");
  await ev("(()=>{const c=" + F + ".getElementById('sAgree');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))})()");
  await click("ssubmit"); await sleep(3000);
  const t1 = await text();
  check("after sign-up, the page asks for the 6-digit code", /Verify your email/.test(t1) && !!(await ev("!!" + F + ".getElementById('sCode')")));
  check("it says the email is not verified yet", /email not verified yet/.test(t1));
  check("the message says where the code is", /6-digit code|code is in the test inbox/.test(await msg()), await msg());

  // wrong code, then the right one
  await setVal("sCode", "000000"); await click("sverify"); await sleep(1500);
  const wrong = await msg();
  check("a wrong code is refused and says how many tries are left", /not right/.test(wrong) && /4 tries left/.test(wrong), wrong);
  await setVal("sCode", "12"); await click("sverify"); await sleep(400);
  check("a code that is too short is caught before sending", /6-digit code/.test(await msg()));
  check("Send a new code works", await click("sresend"));
  await sleep(2000);
  check("it says a new code is on its way", /new code|on its way|code is in the test inbox/i.test(await msg()), await msg());
  const code = await codeFromInbox();
  check("the code can be found in the test inbox", /^[0-9]{6}$/.test(code), code);
  await setVal("sCode", code); await click("sverify"); await sleep(2000);
  const t2 = await text();
  check("the right code verifies the email", /email verified/.test(t2) && !(await ev("!!" + F + ".getElementById('sCode')")), await msg());
  check("the verify card is gone", !/Verify your email/.test(t2));
  check("it says confirmations are on", /confirmation goes to this email|confirmation emails are on/i.test(t2 + " " + await msg()));

  // it stays verified after a reload
  await nav(BASE + "/"); await sleep(3500); await openAccount();
  check("still verified after a reload", /email verified/.test(await text()));
  check("no script errors", logs.length === 0, logs.join(" / ").slice(0, 160));
  console.log(bad ? "\n" + bad + " check(s) failed" : "\nAll sign-up and verification screen checks passed");
};
