module.exports = async ({ ev, sleep, nav }) => {
  const F = "document.querySelector('iframe').contentDocument";
  await nav("http://127.0.0.1:8767/");
  await sleep(3500);
  await ev(F + ".getElementById('nb-svc').click()"); await sleep(450);
  await ev("(()=>{const e=[...(" + F + ").querySelectorAll('.nitem')].find(b=>b.innerText.trim().startsWith('Part-time'));e.click()})()");
  await sleep(1000);
  console.log("top card text:", await ev("(" + F + ".querySelector('.card.top')||{innerText:'(none)'}).innerText.split(String.fromCharCode(10)).filter(x=>x.trim()).slice(0,6).join(' | ')"));
  console.log("part-time jobs in the list:", await ev("JSON.stringify(document.querySelector('iframe').contentWindow.__uaply.JOBS.filter(j=>j.type==='parttime').map(j=>[j.co,j.role,!!j.live]))"));
};
