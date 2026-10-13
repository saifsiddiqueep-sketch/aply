module.exports = async ({ ev, sleep, nav }) => {
  const F = "document.querySelector('iframe').contentDocument";
  await nav("http://127.0.0.1:8767/");
  await sleep(3500);
  console.log("banner exists:", await ev("!!" + F + ".getElementById('banner')"));
  console.log("banner text:", JSON.stringify(await ev("((" + F + ").getElementById('banner')||{}).innerText")));
  console.log("banner hidden attr:", await ev("(" + F + ".getElementById('banner')||{}).hidden"), "| display:", await ev("getComputedStyle(" + F + ".getElementById('banner')).display"));
  console.log("ring text on card:", await ev("((" + F + ").querySelector('.ring,.score,.pct')||{}).innerText"));
};
