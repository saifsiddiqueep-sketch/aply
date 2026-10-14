// Minimal headless-Chrome driver for UI tests. Usage: node tools/cdp.js tools/<test>.js
// A test file exports async ({ev, sleep, nav, shot, logs, send}) => {}. ev(expr) runs JS in the page and returns its value.
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const CHROME = path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe");

(async () => {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "uaply-cdp-"));
  const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--remote-debugging-port=" + port, "--user-data-dir=" + profile,
    "--window-size=" + (process.env.W || 1100) + "," + (process.env.H || 900), "about:blank"], { stdio: "ignore" });
  let tab;
  for (let i = 0; i < 50 && !tab; i++) {
    try { tab = (await (await fetch("http://127.0.0.1:" + port + "/json")).json()).find((t) => t.type === "page"); } catch (e) {}
    if (!tab) await new Promise((r) => setTimeout(r, 200));
  }
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = {};
  const logs = [];
  const listeners = {};
  const on = (method, fn) => { listeners[method] = fn; };          // a test can react to browser events, for example to fail a request on purpose
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.method && listeners[d.method]) { try { listeners[d.method](d.params); } catch (e) { logs.push("LISTENER " + e.message); } }
    if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; }
    else if (d.method === "Runtime.exceptionThrown") {
      const x = d.params.exceptionDetails;
      logs.push("EXC " + ((x.exception && x.exception.description) || x.text).split("\n")[0]);
    } else if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") {
      logs.push("ERR " + d.params.args.map((a) => a.value || a.description).join(" ").slice(0, 200));
    }
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable");
  await send("Page.enable");
  if (process.env.W && Number(process.env.W) < 700) {          // phone sizes: real device emulation (a headless window cannot go below ~500px)
    await send("Emulation.setDeviceMetricsOverride", { width: Number(process.env.W), height: Number(process.env.H || 844), deviceScaleFactor: 3, mobile: true });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ev = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) return "JSERR " + r.result.exceptionDetails.exception.description.split("\n")[0];
    return r.result.result.value;
  };
  const nav = async (u) => { await send("Page.navigate", { url: u }); await sleep(2500); };
  const shot = async (f) => { const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(f, Buffer.from(r.result.data, "base64")); };
  try { await require(path.resolve(process.argv[2]))({ ev, sleep, nav, shot, logs, send, on }); }
  catch (e) { console.log("TEST SCRIPT FAILED:", e.message); }
  console.log("CONSOLE ISSUES:", logs.length ? "\n" + logs.join("\n") : "none");
  ws.close(); proc.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})();
