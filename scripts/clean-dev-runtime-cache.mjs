import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const projectCacheNames = [
  ".next-local",
  ".next-runtime",
  ".next-runtime-3000",
  ".next-runtime-cache",
  ".next-dev-cache"
];
const runtimeCacheBase = process.env.NEXT_DEV_CACHE_ROOT?.trim()
  || path.join(process.env.LOCALAPPDATA || os.tmpdir(), "DispatchBoard", "next");

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function removeKnownCache(targetPath, boundary) {
  const resolvedBoundary = path.resolve(boundary);
  const resolvedTarget = path.resolve(targetPath);

  if (!isInside(resolvedBoundary, resolvedTarget)) {
    throw new Error(`Refusing to clean outside allowed cache boundary: ${resolvedTarget}`);
  }

  await fs.rm(resolvedTarget, {
    force: true,
    maxRetries: 3,
    recursive: true,
    retryDelay: 250
  });
}

if (process.env.SKIP_NEXT_RUNTIME_CLEAN === "1") {
  console.log("Skipping Next runtime cache cleanup because SKIP_NEXT_RUNTIME_CLEAN=1.");
  process.exit(0);
}

for (const cacheName of projectCacheNames) {
  await removeKnownCache(path.join(root, cacheName), root);
}

const resolvedRuntimeCacheBase = path.resolve(runtimeCacheBase);
const expectedRuntimeParent = path.resolve(path.join(process.env.LOCALAPPDATA || os.tmpdir(), "DispatchBoard"));

if (isInside(expectedRuntimeParent, resolvedRuntimeCacheBase)) {
  await removeKnownCache(resolvedRuntimeCacheBase, expectedRuntimeParent);
}

console.log("Cleaned stale Next dev runtime caches for this Dispatch Board workspace.");
