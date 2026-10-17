import { spawn } from "node:child_process";
const apiTarget = `http://127.0.0.1:${process.env.API_PORT || 8787}`;
let apiRunning = false;
try {
  const response = await fetch(`${apiTarget}/api/health`, {
    signal: AbortSignal.timeout(1500),
  });
  apiRunning = (await response.json()).service === "wolf-workspace";
  if (!apiRunning)
    throw new Error("The API port is occupied by another service.");
} catch (error) {
  if (error.message.includes("occupied")) throw error;
}
const children = [];
if (apiRunning) console.log(`Using the running Wolf Shop API at ${apiTarget}`);
else
  children.push(
    spawn(process.execPath, ["--watch", "server/index.mjs"], {
      stdio: "inherit",
    }),
  );
let storeRunning = false;
try {
  const response = await fetch("http://127.0.0.1:5173/@vite/client", {
    signal: AbortSignal.timeout(1500),
  });
  storeRunning = response.ok && (await response.text()).includes("vite");
} catch {}
if (storeRunning)
  console.log(
    "Store and workspace are available at http://localhost:5173/login",
  );
else
  children.push(
    spawn(
      process.execPath,
      ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
      {
        stdio: "inherit",
        env: { ...process.env, API_PROXY_TARGET: apiTarget },
      },
    ),
  );
let closing = false;
const stop = (code) => {
  if (closing) return;
  closing = true;
  children.forEach((p) => p.kill());
  process.exitCode = code;
};
children.forEach((p) => p.on("exit", (code) => stop(code || 0)));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
