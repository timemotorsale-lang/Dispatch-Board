import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const nodeModulesPath = path.join(root, "node_modules");
const defaultNextDistDir = ".next-local";
const explicitNextDistDir = process.env.NEXT_DIST_DIR?.trim();
let nextDistDir = explicitNextDistDir || defaultNextDistDir;
const runtimeCacheBase = process.env.NEXT_DEV_CACHE_ROOT?.trim()
  || path.join(process.env.LOCALAPPDATA || os.tmpdir(), "DispatchBoard", "next");

function tempBackedDistRoot(distDirName) {
  // A fixed cache name lets overlapping dev servers rewrite each other's manifests on Windows.
  const cacheKey = process.env.NEXT_DEV_CACHE_KEY?.trim() || `session-${process.pid}`;
  return path.join(
    runtimeCacheBase,
    createHash("sha1").update(`${root}:${distDirName}:${cacheKey}`).digest("hex").slice(0, 12)
  );
}

async function ensureWorkspaceAlias(distDirName, tempDistRoot) {
  const distDirPath = path.join(root, distDirName);

  try {
    const existingEntry = await fs.lstat(distDirPath);

    if (existingEntry.isSymbolicLink()) {
      const currentTarget = await fs.realpath(distDirPath);
      const desiredTarget = await fs.realpath(tempDistRoot);

      if (currentTarget === desiredTarget) {
        return;
      }

      await fs.unlink(distDirPath);
    } else {
      const backupPath = `${distDirPath}.workspace-backup-${Date.now()}`;
      await fs.rename(distDirPath, backupPath);
      console.log(`Moved workspace cache '${distDirName}' to '${path.basename(backupPath)}'.`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.symlink(tempDistRoot, distDirPath, "junction");
}

async function ensureTempBackedDistDir(distDirName) {
  const tempDistRoot = tempBackedDistRoot(distDirName);
  const tempNodeModulesPath = path.join(tempDistRoot, "node_modules");
  const projectNodeModulesPath = path.join(root, "node_modules");

  await fs.mkdir(path.dirname(tempDistRoot), { recursive: true });
  await fs.mkdir(tempDistRoot, { recursive: true });
  await ensureModuleResolution(tempNodeModulesPath, projectNodeModulesPath);
  await ensureWorkspaceAlias(distDirName, tempDistRoot);
  console.log(`Using isolated Next cache at '${tempDistRoot}'.`);
  // Keep Next's distDir inside the project; the junction above redirects the actual writes.
  return distDirName;
}

async function ensureModuleResolution(tempNodeModulesPath, projectNodeModulesPath) {
  try {
    const existingEntry = await fs.lstat(tempNodeModulesPath);

    if (existingEntry.isSymbolicLink()) {
      const currentTarget = await fs.realpath(tempNodeModulesPath);
      const desiredTarget = await fs.realpath(projectNodeModulesPath);

      if (currentTarget === desiredTarget) {
        return;
      }

      await fs.unlink(tempNodeModulesPath);
    } else {
      throw new Error(`Expected '${tempNodeModulesPath}' to be a junction.`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.symlink(projectNodeModulesPath, tempNodeModulesPath, "junction");
}

async function prepareManagedWindowsDistDir() {
  if (process.platform !== "win32" || explicitNextDistDir || nextDistDir !== defaultNextDistDir) {
    return;
  }

  if (process.env.NEXT_USE_TEMP_BACKED_CACHE !== "1") {
    await fs.mkdir(path.join(root, defaultNextDistDir), { recursive: true });
    console.log(`Using workspace-local Next cache at '${path.join(root, defaultNextDistDir)}'.`);
    return;
  }

  try {
    nextDistDir = await ensureTempBackedDistDir(defaultNextDistDir);
  } catch (error) {
    if (error?.code !== "EPERM") {
      throw error;
    }

    nextDistDir = await ensureTempBackedDistDir(".next-runtime");
    console.log("Default .next-local cache is locked, so the dev server switched to '.next-runtime' for this session.");
  }
}

await prepareManagedWindowsDistDir();

const child = spawn(process.execPath, [nextCli, "dev", "--webpack"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_PATH: process.env.NODE_PATH
      ? `${nodeModulesPath}${path.delimiter}${process.env.NODE_PATH}`
      : nodeModulesPath,
    NEXT_DIST_DIR: nextDistDir
  }
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.once("error", (error) => {
  console.error(error);
  process.exit(1);
});
