// Checks that nothing is cut off at small phone widths: every visible control must sit inside the screen.
//   PORT=8767 node tools/ui-widths.js        (runs its own browser at each width)
const { spawnSync } = require("child_process");
const path = require("path");
const widths = [320, 360, 375, 390, 430];
let bad = 0;
for (const w of widths) {
  const r = spawnSync(process.execPath, [path.join(__dirname, "cdp.js"), path.join(__dirname, "ui-widths-one.js")],
    { env: Object.assign({}, process.env, { W: String(w), H: "700" }), encoding: "utf8", timeout: 120000 });
  const out = (r.stdout || "").trim().split("\n").filter((l) => l && !l.startsWith("CONSOLE ISSUES"));
  console.log("--- " + w + "px wide");
  out.forEach((l) => { console.log(l); if (l.startsWith("  CUT OFF")) bad++; });
}
console.log(bad ? "\n" + bad + " control(s) are cut off at a small width" : "\nNothing is cut off at any phone width");
process.exit(bad ? 1 : 0);
