/* Builds self-contained, hostable copies of the sandbox and dev pages into share/.
   Run from the project folder:  node share/build-share.js
   The hosted copies have no server, so Real jobs, Apply assistant and Send applications are left out.
   prod/index.html is only read, never written. */
const fs = require("fs");
const read = (p) => fs.readFileSync(p, "utf8");
const prod = read("prod/index.html");
const nav = read("shared/uaply-nav.js");
const profile = read("shared/uaply-profile.js");
let envs = read("shared/uaply-envs.js");

const NEEDS_SERVER = ["live", "kit", "submit", "chat"];   // the assistant needs chat_api.py, which a static host cannot run
envs = envs.replace(/fetch\("prod-index\.html",\{cache:"no-store"\}\)\.then\(function\(r\)\{return r\.text\(\)\}\)/, "Promise.resolve(window.__PROD_SRC)");
envs = envs.replace(/var ORDER=\[([^\]]*)\];/, (m, list) => {
  const kept = list.split(",").map((s) => s.trim()).filter((s) => !NEEDS_SERVER.includes(s.replace(/"/g, "")));
  return "var ORDER=[" + kept.join(",") + "];";
});
if (envs.includes('fetch("prod-index.html"')) throw new Error("envs patch failed");

const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const inline = "<script>window.__PROD_SRC=" + JSON.stringify(prod).replace(/</g, "\\u003c") + ";</script>\n" +
  "<script>" + safe(nav) + "</script>\n<script>" + safe(profile) + "</script>\n<script>" + safe(envs) + "</script>";

function darkBlocks(html) {
  // add the guarded dark block and the explicit data-theme block so the host theme toggle works
  return html.replace(/@media \(prefers-color-scheme: dark\)\{:root\{([^}]*)\}\}/, (m, vars) =>
    "@media (prefers-color-scheme: dark){:root:not([data-theme=\"light\"]){" + vars + ";color-scheme:dark}}\n:root[data-theme=\"dark\"]{" + vars + ";color-scheme:dark}");
}

function build(src, out, title, edits) {
  let h = read(src);
  h = h.replace(/(<script src="uaply-[a-z]+\.js"><\/script>\s*)+/, () => inline + "\n");
  if (!h.includes("__PROD_SRC")) throw new Error("script tags not found in " + src);
  h = h.replace(/<title>[^<]*<\/title>/, "<title>" + title + "</title>");
  edits.forEach(([a, b]) => { if (!h.includes(a)) throw new Error("edit target missing: " + a.slice(0, 40)); h = h.replace(a, () => b); });
  h = darkBlocks(h);
  // the host adds the document skeleton
  h = h.replace(/<!doctype html>\s*/i, "").replace(/<html[^>]*>\s*/i, "").replace(/<head>\s*/i, "").replace(/<\/head>\s*/i, "")
       .replace(/<meta charset="utf-8">\s*/i, "").replace(/<meta name="viewport"[^>]*>\s*/i, "").replace(/<body>\s*/i, "").replace(/<\/body>\s*/i, "").replace(/<\/html>\s*/i, "");
  fs.writeFileSync(out, h);
  console.log("wrote", out, Math.round(h.length / 1024) + "KB");
  if (process.argv.includes("--full")) {   // a complete page for ordinary web hosting (GitHub Pages)
    const full = out.replace(/\.html$/, ".full.html");
    fs.writeFileSync(full, '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>\n' + h + "\n</body></html>\n");
    console.log("wrote", full);
  }
}

build("sandbox/index.html", "share/sandbox.html", "UAply Sandbox", [
  ["on={glide:true,nav:true,profile:true,live:true,kit:true,submit:true,", "on={glide:true,nav:true,profile:true,"],
  ["Experiment freely. Reads a copy of index.html (prod); prod is never changed.", "Experiment freely. Hosted copy: example jobs only, and your swipes stay in your own browser."],
]);
build("dev/index.html", "share/dev.html", "UAply", [
  ['var PROMOTED=["glide","nav","live","kit","submit",', 'var PROMOTED=["glide","nav",'],
  // the hosted copy has no server, so it must say so instead of posing as the real app
  ['<div class="bar" id="devbar" hidden><span class="badge">DEV</span><span id="what">Release candidate</span></div>',
   '<div class="bar" id="devbar"><span class="badge">PREVIEW</span><span id="what">Static preview: example jobs only. Accounts and real jobs run on the UAply server.</span></div>'],
  ['document.getElementById("what").textContent="Release candidate: "+PROMOTED.map(function(k){return UAplyEnv.FEATURES[k].name}).join(", ");', ''],
]);
