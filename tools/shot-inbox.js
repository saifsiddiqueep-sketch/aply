module.exports = async ({ nav, shot, sleep }) => {
  await nav("http://127.0.0.1:" + (process.env.PORT || "8767") + "/outbox");
  await sleep(500);
  await shot(require("path").join(process.env.OUT, "test-inbox.png"));
};
