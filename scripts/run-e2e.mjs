import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options
  });
}

async function waitForServer(server) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`The E2E web server exited with code ${server.exitCode}.`);
    }

    try {
      const response = await fetch(`${baseURL}/login`);
      if (response.ok) {
        return;
      }
    } catch {
      // The server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Timed out waiting for the E2E web server.");
}

function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
}

const server = run(
  process.execPath,
  [nextCli, "dev", "--hostname", "127.0.0.1", "--port", "3000"],
  {
    detached: process.platform !== "win32"
  }
);

let exitCode = 1;

try {
  await waitForServer(server);

  const playwright = run(process.execPath, [playwrightCli, "test"], {
    env: {
      ...process.env,
      PLAYWRIGHT_SKIP_WEB_SERVER: "1"
    }
  });

  exitCode = await new Promise((resolve, reject) => {
    playwright.once("error", reject);
    playwright.once("exit", (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  stopProcessTree(server);
}

process.exit(exitCode);
