// A visitor arriving while the server is still warming its job cache (a cold start on a real host).
module.exports = async ({ ev, sleep, nav, shot }) => {
  const F = "document.querySelector('iframe').contentDocument";
  const T = require("path"), O = require("os").tmpdir();
  await nav("http://127.0.0.1:8771/");
  for (const ms of [1500, 6000, 15000]) {
    await sleep(ms === 1500 ? 0 : (ms === 6000 ? 4500 : 9000));
    const t = await ev("(" + F + ").body.innerText.split(String.fromCharCode(10)).filter(x=>x.trim()).slice(0,16).join(' | ')");
    console.log("~" + ms + "ms:", t.slice(0, 330));
    await shot(T.join(O, "cold-" + ms + ".png"));
  }
};
