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
["serve.py", "jobs_api.py", "uaply_api.py", "auth_api.py", "chat_api.py"].forEach((f) => {
  const r = spawnSync(py, ["-m", "py_compile", f], { encoding: "utf8" });
  r.status === 0 ? ok(f) : bad(f + "\n" + (r.stderr || r.error));
});

console.log("JSON files");
["uaply-config.example.json", ".claude/launch.json", "help/articles.json"].forEach((f) => {
  try { JSON.parse(fs.readFileSync(f, "utf8")); ok(f); } catch (e) { bad(f + ": " + e.message); }
});

console.log("Legal pages");
try {
  ["index", "terms", "privacy", "ai-and-employment", "copyright"].forEach((n) => {
    const s = fs.readFileSync("legal/" + n + ".html", "utf8");
    const open = (s.match(/<mark>/g) || []).length, close = (s.match(/<\/mark>/g) || []).length;
    open === close ? ok("legal/" + n + ".html (" + open + " blank" + (open === 1 ? "" : "s") + " to fill in before publishing)") : bad("legal/" + n + ".html has an unclosed <mark>");
  });
  if (!fs.existsSync("legal/style.css")) bad("legal/style.css is missing");
} catch (e) { bad("legal pages: " + e.message); }

console.log("Every experiment still applies to the production page");
try {
  global.window = {}; global.localStorage = { getItem() { return null; } };
  ["shared/uaply-nav.js", "shared/uaply-live.js", "shared/uaply-profile.js"].forEach((f) => new Function("window", "localStorage", fs.readFileSync(f, "utf8"))(window, localStorage));
  let src = fs.readFileSync("prod/index.html", "utf8");
  src = window.UAplyNav.patch(src); src = window.UAplyProfile.patch(src); src = window.UAplyLive.patch(src); src = window.UAplyLive.kit.patch(src);
  new Function(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/.exec(src)[1]);
  ok("patched app assembles and parses");
} catch (e) { bad("patching the production page failed: " + e.message); }

console.log("Release build (dev)");
{
  const dev = fs.readFileSync("dev/index.html", "utf8");
  /release:\s*true/.test(dev) ? ok("dev/index.html is flagged as the release build") : bad("dev/index.html lost release:true (the developer bar, simulated sign-in and paid plans would show to users)");
  /<div class="bar" id="devbar" hidden>/.test(dev) ? ok("the developer bar is hidden") : bad("the DEV bar is no longer hidden in dev/index.html");
  /<title>UAply<\/title>/.test(dev) ? ok("the tab title is UAply") : bad("dev/index.html title should be exactly UAply");
  const art = JSON.parse(fs.readFileSync("help/articles.json", "utf8")).articles;
  const plans = art.find((a) => a.id === "plans");
  plans && plans.release && plans.release.hide ? ok("the assistant's plans article is hidden in the release build") : bad("help/articles.json: the plans article must carry release.hide");
}

console.log("Python lint (pyflakes, when installed)");
{
  /* the same interpreter as above (the Windows "py" launcher when "python" is only a Store shortcut), on the project's own scripts */
  const mine = fs.readdirSync(".").filter((f) => f.endsWith(".py")).concat(fs.existsSync("tools") ? fs.readdirSync("tools").filter((f) => f.endsWith(".py")).map((f) => "tools/" + f) : []);
  const r = spawnSync(py, ["-m", "pyflakes"].concat(mine), { encoding: "utf8" });
  if (/No module named pyflakes/.test((r.stderr || "") + (r.stdout || ""))) console.log("  skip  pyflakes is not installed (pip install pyflakes)");
  else if (r.status === 0) ok("no unused imports, undefined names or other pyflakes findings");
  else bad("pyflakes found problems:\n" + (r.stdout || r.stderr).slice(0, 1500));
}

console.log("Hosted copies build");
const b = spawnSync(process.execPath, ["share/build-share.js", "--full"], { encoding: "utf8" });
b.status === 0 ? ok("share/build-share.js --full") : bad("build failed\n" + b.stderr);
for (const f of ["dev", "sandbox", "dev.full", "sandbox.full"]) {
  const html = fs.readFileSync("share/" + f + ".html", "utf8");
  const re = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g;
  let m, n = 0, broken = "";
  while ((m = re.exec(html))) { n++; try { new Function(m[1]); } catch (e) { broken += " script " + n + ": " + e.message; } }
  broken ? bad("hosted copy share/" + f + ".html has a script syntax error:" + broken) : ok("share/" + f + ".html: " + n + " inline scripts parse");
}

console.log(failed ? "\n" + failed + " problem(s) found." : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
