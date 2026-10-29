import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export const reviewUrl = "http://127.0.0.1:3100/";

export async function isReviewReady() {
  try {
    const response = await fetch(`${reviewUrl}api/preview-status`, { signal: AbortSignal.timeout(2500), redirect: "error" });
    if (!response.ok) return false;
    const status = await response.json();
    return status.application === "tms-dealership-review" && status.syntheticData === true;
  } catch {
    return false;
  }
}

async function portOccupied() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: 3100 });
    socket.setTimeout(1500);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => { socket.destroy(); resolve(false); });
    socket.once("timeout", () => { socket.destroy(); resolve(true); });
  });
}

function openBrowser() {
  const program = process.platform === "win32" ? "explorer.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const browser = spawn(program, [reviewUrl], { windowsHide: true, detached: true, stdio: "ignore" });
  browser.once("error", () => console.log(`Open this address in your browser: ${reviewUrl}`));
  browser.unref();
}

export async function openReview() {
  if (process.env.NODE_ENV === "production") throw new Error("This launcher is for local review, not production.");
  if (await isReviewReady()) {
    console.log(`Existing website preview is ready: ${reviewUrl}`);
    openBrowser();
    return;
  }
  if (await portOccupied()) throw new Error("Port 3100 is in use, but a Time Motor Sales sample-data preview could not be verified. No process was stopped. Ask for help checking the preview.");
  const appRoot = fileURLToPath(new URL("../", import.meta.url));
  const nextCli = fileURLToPath(new URL("../../../node_modules/next/dist/bin/next", import.meta.url));
  const child = spawn(process.execPath, [nextCli, "dev", ".", "--webpack", "--hostname", "127.0.0.1", "--port", "3100"], {
    cwd: appRoot,
    windowsHide: true,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development", DEALERSHIP_ENVIRONMENT: "development", DEALERSHIP_PREVIEW_DATA: "1" }
  });
  let exited = false;
  child.once("error", () => { exited = true; });
  child.once("exit", () => { exited = true; });
  const stop = () => { if (!exited) child.kill(); };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  process.once("exit", stop);
  try {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      if (exited) throw new Error("The preview stopped during startup. Review the message above; no security warnings are suppressed. Run the launcher again after resolving the startup issue.");
      if (await isReviewReady()) {
        console.log(`Website preview ready: ${reviewUrl}\nKeep this window open while reviewing. Use fictitious information only.`);
        openBrowser();
        return;
      }
      await delay(1000);
    }
    throw new Error("The website preview did not become ready. No unrelated service was changed.");
  } catch (error) {
    stop();
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  openReview().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
