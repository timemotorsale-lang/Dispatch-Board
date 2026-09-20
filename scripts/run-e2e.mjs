import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";

const root = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(root);

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const baseUrlDetails = new URL(baseURL);
const serverPort = baseUrlDetails.port || (baseUrlDetails.protocol === "https:" ? "443" : "80");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
const e2eTempDir = path.join(root, "test-results", ".tmp");
mkdirSync(e2eTempDir, { recursive: true });
const playwrightArguments = process.argv.slice(2);
const runScopedDatabaseSchema = `dispatch_board_e2e_${process.pid}_${Date.now()}`;
const generatedTypeFiles = ["next-env.d.ts", "tsconfig.json"].map((fileName) => ({
  path: path.join(root, fileName),
  contents: readFileSync(path.join(root, fileName), "utf8")
}));

function buildE2EDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) {
    return process.env.E2E_DATABASE_URL;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or E2E_DATABASE_URL must be configured before running browser tests.");
  }

  const parsedDatabaseUrl = new URL(databaseUrl);

  if (parsedDatabaseUrl.protocol !== "postgresql:" && parsedDatabaseUrl.protocol !== "postgres:") {
    throw new Error(
      "Set E2E_DATABASE_URL when the primary database URL is not a direct PostgreSQL connection."
    );
  }

  parsedDatabaseUrl.searchParams.set(
    "schema",
    process.env.E2E_DATABASE_SCHEMA ?? runScopedDatabaseSchema
  );

  return parsedDatabaseUrl.toString();
}

const e2eEnvironment = {
  ...process.env,
  DATABASE_URL: buildE2EDatabaseUrl(),
  NEXT_DIST_DIR: process.env.E2E_NEXT_DIST_DIR ?? ".next-e2e",
  PLAYWRIGHT_BASE_URL: baseURL,
  PLAYWRIGHT_SKIP_WEB_SERVER: "1",
  TEMP: e2eTempDir,
  TMP: e2eTempDir,
  TMPDIR: e2eTempDir
};

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

function restoreGeneratedTypeFiles() {
  for (const file of generatedTypeFiles) {
    writeFileSync(file.path, file.contents, "utf8");
  }
}

const server = run(
  process.execPath,
  [nextCli, "dev", "--hostname", baseUrlDetails.hostname, "--port", serverPort],
  {
    detached: process.platform !== "win32",
    env: e2eEnvironment
  }
);

let exitCode = 1;

try {
  await waitForServer(server);

  const playwright = run(process.execPath, [playwrightCli, "test", ...playwrightArguments], {
    env: e2eEnvironment
  });

  exitCode = await new Promise((resolve, reject) => {
    playwright.once("error", reject);
    playwright.once("exit", (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  stopProcessTree(server);
  await new Promise((resolve) => setTimeout(resolve, 300));
  restoreGeneratedTypeFiles();
}

process.exit(exitCode);
