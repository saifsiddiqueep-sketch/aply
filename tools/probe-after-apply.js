module.exports = async ({ ev, sleep, nav, shot }) => {
  const F = "document.querySelector('iframe').contentDocument";
  const setVal = (id, v) => ev("(()=>{const e=" + F + ".getElementById('" + id + "');if(!e)return false;e.value=" + JSON.stringify(v) + ";e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await nav("http://127.0.0.1:8766/");
  await sleep(1200);
  await ev(F + ".getElementById('nb-prof').click()"); await sleep(400);
  await ev("(" + F + ").querySelectorAll('button')[0]&&[...(" + F + ").querySelectorAll('button')].find(b=>b.innerText.trim().startsWith('Profile setup')).click()"); await sleep(400);
  await setVal("pName", "Test User"); await setVal("pEmail", "sweep.tester@example.com");
  await ev(F + ".getElementById('wzNext').click()"); await sleep(800);
  await ev(F + ".getElementById('nb-svc').click()"); await sleep(500);
  await ev(F + ".getElementById('btnYes').click()"); await sleep(1500);
  await ev("(()=>{const m=" + F + ".getElementById('kcYes');if(m)m.click()})()"); await sleep(2500);
  console.log("overlay now:", await ev("[...(" + F + ").querySelectorAll('[role=dialog],.modal,.sheet,.overlay')].filter(e=>e.offsetParent||getComputedStyle(e).display!=='none').map(e=>e.id+'.'+e.className+': '+e.innerText.replace(/[ \\n\\t]+/g,' ').slice(0,200)).join('\\n')"));
  await ev(F + ".getElementById('nb-dash').click()"); await sleep(500);
  for (const t of ["Overview", "Applied", "Accepted", "Rejected", "Interviews"]) {
    await ev("(()=>{const e=[...(" + F + ").querySelectorAll('button,a,[role=tab]')].find(b=>b.innerText.replace(/[ \n\t]+/g,' ').trim().startsWith('" + t + "'));if(e)e.click()})()"); await sleep(300);
  }
  console.log("after dashboard clicks, overlay/focus:", await ev("document.querySelector('iframe').contentDocument.activeElement.outerHTML.slice(0,160)"));
  await ev(F + ".getElementById('nb-prof').click()"); await sleep(600);
  console.log("visible buttons:", await ev("[...(" + F + ").querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.innerText.trim().split('\\n')[0]).join(' | ')"));
  await shot(require("path").join(require("os").tmpdir(), "probe-after-apply.png"));
};
