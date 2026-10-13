// Captures the main screens of the release build for review. W=390 H=844 PORT=8767 node tools/cdp.js tools/shots-final.js <outdir>
module.exports = async ({ ev, sleep, nav, shot }) => {
  const F = "document.querySelector('iframe').contentDocument";
  const out = process.env.OUT;
  const P = (n) => require("path").join(out, n);
  const sub = (s) => ev("(()=>{const e=[...(" + F + ").querySelectorAll('button')].find(b=>b.offsetParent&&b.innerText.split(/\s+/).join(' ').trim().startsWith(" + JSON.stringify(s) + "));if(e)e.click();return !!e})()");
  const tab = async (nb, label) => {
    await ev(F + ".getElementById('" + nb + "').click()"); await sleep(450);
    await ev("(()=>{const e=[...(" + F + ").querySelectorAll('.nitem')].find(b=>b.innerText.trim().startsWith(" + JSON.stringify(label) + "));if(e)e.click()})()");
    await sleep(900);
  };
  await nav("http://127.0.0.1:" + (process.env.PORT || "8767") + "/");
  await sleep(3500);
  await ev("(()=>{const b=" + F + ".getElementById('tipsClose');if(b)b.click()})()");
  await sleep(300);
  await shot(P("1-swipe-jobs.png"));
  await tab("nb-svc", "Internships"); await shot(P("2-internships.png"));
  await tab("nb-dash", "Overview"); await shot(P("3-dashboard.png"));
  await tab("nb-prof", "Settings"); await shot(P("4-profile-settings.png"));
  await tab("nb-prof", "Account"); await shot(P("5-account-signup.png"));
  await tab("nb-prof", "Data"); await ev("(()=>{const h=[...(" + F + ").querySelectorAll('h3')].find(x=>x.innerText.trim().toLowerCase()==='legal');if(h)h.scrollIntoView({block:'start'})})()"); await sleep(400); await shot(P("6-data-and-legal.png"));
  await shot(P("6-data-and-legal.png"));
};
