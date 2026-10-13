module.exports = async ({ ev, sleep, nav }) => {
  const F = "document.querySelector('iframe').contentDocument";
  await nav("http://127.0.0.1:8767/");
  await sleep(3500);
  console.log(await ev("JSON.stringify([...(" + F + ").querySelectorAll('[class*=card]')].map(e=>({tag:e.tagName,cls:e.className,id:e.id,len:e.innerText.length,txt:e.innerText.split(String.fromCharCode(10)).filter(x=>x.trim()).slice(0,2).join(' | ').slice(0,60),vis:!!e.offsetParent})).slice(0,10))"));
};
