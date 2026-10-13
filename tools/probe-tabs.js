// Does choosing a Services tab really switch the deck? (No regex on the whole page: read the nav label and the card itself.)
module.exports = async ({ ev, sleep, nav }) => {
  const F = "document.querySelector('iframe').contentDocument";
  await nav("http://127.0.0.1:8767/");
  await sleep(3500);
  const state = () => ev("JSON.stringify({nav:(" + F + ".getElementById('nb-svc')||{}).innerText.split(String.fromCharCode(10)).join(' / '),menuOpen:[...(" + F + ").querySelectorAll('.nmenu')].some(m=>!m.hidden),card:((" + F + ").querySelector('.card')||{innerText:''}).innerText.split(String.fromCharCode(10)).filter(x=>x.trim()).slice(0,3).join(' | ')})");
  console.log("start:", await state());
  for (const label of ["Part-time", "Internships", "Co-ops", "Full-time"]) {
    await ev(F + ".getElementById('nb-svc').click()"); await sleep(500);
    console.log("  menu opened:", await ev("[...(" + F + ").querySelectorAll('.nmenu')].some(m=>!m.hidden)"));
    const clicked = await ev("(()=>{const e=[...(" + F + ").querySelectorAll('.nitem')].find(b=>b.innerText.trim().startsWith(" + JSON.stringify(label) + "));if(!e)return 'no such item';e.click();return 'clicked'})()");
    await sleep(900);
    console.log(label + ": " + clicked + " ->", await state());
  }
};
