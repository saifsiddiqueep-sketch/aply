// Captures the sign-up screen (with Google's button) and the "Verify your email" card. OUT=<folder> W=390 H=844 PORT=<port> node tools/cdp.js tools/shot-signin.js
module.exports = async ({ ev, sleep, nav, shot }) => {
  const F = "document.querySelector('iframe').contentDocument";
  const P = (n) => require("path").join(process.env.OUT, n);
  const set = (id, v) => ev("(()=>{const e=" + F + ".getElementById('" + id + "');e.value=" + JSON.stringify(v) + ";e.dispatchEvent(new Event('input',{bubbles:true}))})()");
  await nav("http://127.0.0.1:" + process.env.PORT + "/");
  await sleep(3500);
  await ev(F + ".getElementById('nb-prof').click()"); await sleep(450);
  await ev("[...(" + F + ").querySelectorAll('.nitem')].find(b=>b.innerText.trim().startsWith('Account')).click()"); await sleep(3500);
  await ev("(()=>{const b=" + F + ".getElementById('gBtn');if(b)b.scrollIntoView({block:'center'})})()"); await sleep(500);
  await shot(P("signin-google-button.png"));
  await set("sEmail", "you@gmail.com"); await set("sPw", "correct horse 99"); await set("sPw2", "correct horse 99");
  await ev("(()=>{" + F + ".getElementById('sAgree').checked=true})()");
  await ev(F + ".querySelector('[data-auth=ssubmit]').click()"); await sleep(2500);
  await ev("(()=>{const c=" + F + ".getElementById('sCode');if(c)c.scrollIntoView({block:'center'})})()"); await sleep(500);
  await shot(P("signin-verify-email.png"));
};
