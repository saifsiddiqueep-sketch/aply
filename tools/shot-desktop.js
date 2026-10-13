module.exports = async ({ ev, sleep, nav, shot }) => {
  await nav("http://127.0.0.1:" + (process.env.PORT || "8767") + "/");
  await sleep(3500);
  await shot(require("path").join(process.env.OUT, "7-desktop-website.png"));
};
