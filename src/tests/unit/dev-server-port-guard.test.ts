import { execFile } from "node:child_process";
import { mkdtemp, readdir, rmdir } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("refuses an occupied dev port before creating or retargeting a cache", async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), "inventory-port-guard-"));
  const server = net.createServer();
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as net.AddressInfo).port;
  try {
    const script = fileURLToPath(new URL("../../../scripts/run-dev.mjs", import.meta.url));
    await expect(promisify(execFile)(process.execPath, [script], { cwd: folder, env: { ...process.env, PORT: String(port), NEXT_DIST_DIR: "" } })).rejects.toMatchObject({ stderr: expect.stringContaining("No cache changes were made.") });
    expect(await readdir(folder)).toEqual([]);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rmdir(folder);
  }
});
