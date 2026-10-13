module.exports = async ({ nav, shot, sleep }) => {
  const path = require("path");
  const dir = path.resolve(__dirname, "..", "marketing", "email-previews").split(path.sep).join("/");
  for (const n of ["1-handoff-test", "2-applied-test", "3-applied-live"]) {
    await nav("file:///" + dir + "/" + n + ".html");
    await sleep(500);
    await shot(path.join(dir, n + ".png"));
  }
};
