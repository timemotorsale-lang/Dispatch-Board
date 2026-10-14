import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const prismaClientDir = path.join(root, "node_modules", ".prisma", "client");
const prismaEngineName = "query_engine-windows.dll.node";
const prismaCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      ...options
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      const text = String(chunk);
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr?.on("data", (chunk) => {
      const text = String(chunk);
      stderr += text;
      process.stderr.write(text);
    });
    child.on("exit", (code, signal) => resolve({ code: code ?? 1, signal, stdout, stderr }));
    child.on("error", (error) => resolve({ code: 1, signal: null, stdout, stderr: `${stderr}\n${String(error)}` }));
  });
}

function isWindowsPrismaRenameLock(output) {
  return process.platform === "win32"
    && output.includes("EPERM: operation not permitted, rename")
    && output.includes(prismaEngineName);
}

async function hasUsableGeneratedClient() {
  try {
    const [engine, indexJs, schema] = await Promise.all([
      fs.stat(path.join(prismaClientDir, prismaEngineName)),
      fs.stat(path.join(prismaClientDir, "index.js")),
      fs.stat(path.join(prismaClientDir, "schema.prisma"))
    ]);
    return engine.isFile() && indexJs.isFile() && schema.isFile();
  } catch {
    return false;
  }
}

async function removeStaleEngineTemps() {
  try {
    const entries = await fs.readdir(prismaClientDir);
    await Promise.all(
      entries
        .filter((entry) => entry.startsWith(`${prismaEngineName}.tmp`))
        .map((entry) => fs.rm(path.join(prismaClientDir, entry), { force: true }))
    );
  } catch {
    // best effort only
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const attempts = 2;
if (process.platform === "win32" && process.env.FORCE_PRISMA_GENERATE !== "1" && await hasUsableGeneratedClient()) {
  console.warn("Using the existing generated Prisma client for this Windows dev session. Set FORCE_PRISMA_GENERATE=1 to regenerate it explicitly.");
  process.exit(0);
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const result = await run(prismaCommand, ["prisma", "generate"]);
  if (result.code === 0) {
    process.exit(0);
  }

  const combinedOutput = `${result.stdout}\n${result.stderr}`;
  if (!isWindowsPrismaRenameLock(combinedOutput)) {
    process.exit(result.code);
  }

  await removeStaleEngineTemps();
  if (attempt < attempts) {
    console.warn(`Prisma engine file was temporarily locked. Retrying generate (${attempt + 1}/${attempts})...`);
    await wait(750);
    continue;
  }

  if (await hasUsableGeneratedClient()) {
    console.warn("Prisma generate hit a Windows file lock, but an existing generated client is already usable. Continuing with the current client for this dev session.");
    process.exit(0);
  }

  process.exit(result.code);
}
