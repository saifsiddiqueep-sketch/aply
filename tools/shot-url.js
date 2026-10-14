// Opens any address (a web page or a local file) and saves one screenshot.
//   URL=<address> OUT=<file.png> W=390 H=844 node tools/cdp.js tools/shot-url.js
module.exports = async ({ nav, sleep, shot }) => {
  await nav(process.env.URL);
  await sleep(900);
  await shot(process.env.OUT);
};
