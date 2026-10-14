// Each "Add ... (+N)" item in the profile checklist must take the person to the field it is about.
//   PORT=18796 W=390 H=844 node tools/cdp.js tools/ui-checklist.js
const PORT = process.env.PORT || "8766";
module.exports = async ({ ev, sleep, nav }) => {
  const F = "document.querySelector('iframe').contentDocument";
  let bad = 0;
  const openTab = async (tab) => {
    await ev(F + ".getElementById('nb-prof').click()"); await sleep(400);
    await ev("[...(" + F + ").querySelectorAll('button,a,[role=tab]')].find(b=>b.offsetParent&&b.innerText.trim().startsWith('" + tab + "')).click()"); await sleep(500);
  };
  await nav("http://127.0.0.1:" + PORT + "/");
  await sleep(2500);
  for (const tab of ["Settings", "Preferences"]) {
    await openTab(tab);
    const items = JSON.parse(await ev("JSON.stringify([...(" + F + ").querySelectorAll('button')].filter(b=>b.offsetParent&&/^Add .*\\(\\+\\d+\\)/.test(b.innerText.trim())).map(b=>b.innerText.trim()))"));
    console.log(tab + ": checklist items: " + items.length);
    for (const t of items) {
      await openTab(tab);
      await ev("(()=>{const d=" + F + ";if(d.activeElement)d.activeElement.blur();const b=[...d.querySelectorAll('button')].find(x=>x.offsetParent&&x.innerText.trim()==" + JSON.stringify(t) + ");if(b)b.click()})()");
      await sleep(500);
      const where = JSON.parse(await ev("JSON.stringify((()=>{const d=" + F + ";const a=d.activeElement;return {tag:a?a.tagName:'',id:a?a.id:''}})())"));
      const ok = where.tag === "INPUT" || where.tag === "SELECT" || where.tag === "TEXTAREA";
      if (!ok) bad++;
      console.log((ok ? "PASS " : "FAIL ") + t + "  -> focus lands on " + where.tag + "#" + where.id);
    }
  }
  console.log(bad ? bad + " problem(s)" : "All good");
};
