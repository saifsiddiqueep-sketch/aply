/* One command to check the whole project for mistakes:  node check.js
   Runs the same checks on your computer and on every pull request (see .github/workflows/check.yml).
   Exits with an error if anything is wrong. Needs Node and Python 3. */
const fs = require("fs");
const { spawnSync } = require("child_process");
let failed = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { failed++; console.log("  FAIL  " + m); };

function listJs() { return fs.readdirSync("shared").filter((f) => f.endsWith(".js")).map((f) => "shared/" + f).concat(["share/build-share.js", "check.js"]); }

console.log("JavaScript files");
listJs().forEach((f) => {
  const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  r.status === 0 ? ok(f) : bad(f + "\n" + r.stderr);
});

console.log("Scripts inside the pages");
["prod/index.html", "sandbox/index.html", "dev/index.html"].forEach((f) => {
  const s = fs.readFileSync(f, "utf8");
  const re = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g;
  let m, n = 0, err = null;
  while ((m = re.exec(s))) { n++; try { new Function(m[1]); } catch (e) { err = e.message; } }
  err ? bad(f + ": " + err) : ok(f + " (" + n + " inline script" + (n === 1 ? "" : "s") + ")");
});

console.log("Python files");
/* On Windows "python" is often only a Microsoft Store shortcut; fall back to the "py" launcher when it does not run. */
const py = process.platform !== "win32" ? "python3"
  : (spawnSync("python", ["--version"], { encoding: "utf8" }).status === 0 ? "python" : "py");
["serve.py", "jobs_api.py", "apply_api.py", "auth_api.py"].forEach((f) => {
  const r = spawnSync(py, ["-m", "py_compile", f], { encoding: "utf8" });
  r.status === 0 ? ok(f) : bad(f + "\n" + (r.stderr || r.error));
});

console.log("JSON files");
["aply-config.example.json", ".claude/launch.json"].forEach((f) => {
  try { JSON.parse(fs.readFileSync(f, "utf8")); ok(f); } catch (e) { bad(f + ": " + e.message); }
});

console.log("Every experiment still applies to the production page");
try {
  global.window = {}; global.localStorage = { getItem() { return null; } };
  ["shared/aply-nav.js", "shared/aply-live.js"].forEach((f) => new Function("window", "localStorage", fs.readFileSync(f, "utf8"))(window, localStorage));
  let src = fs.readFileSync("prod/index.html", "utf8");
  src = window.AplyNav.patch(src); src = window.AplyLive.patch(src); src = window.AplyLive.kit.patch(src);
  new Function(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/.exec(src)[1]);
  ok("patched app assembles and parses");
} catch (e) { bad("patching the production page failed: " + e.message); }

console.log("Hosted copies build");
const b = spawnSync(process.execPath, ["share/build-share.js", "--full"], { encoding: "utf8" });
b.status === 0 ? ok("share/build-share.js --full") : bad("build failed\n" + b.stderr);

console.log(failed ? "\n" + failed + " problem(s) found." : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
