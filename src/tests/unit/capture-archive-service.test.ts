import { mkdtemp, readdir, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

const fakes = vi.hoisted(() => ({ create: vi.fn(), findUnique: vi.fn(), runtime: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { captureArchiveBatch: { create: fakes.create, findUnique: fakes.findUnique } } }));
vi.mock("@/server/deal-continuity/identities", () => ({ dealOrganization: () => "sandbox-org" }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: fakes.runtime }));

import { createLocalPrivateDocumentStorageAdapter } from "@/server/document-library/storage-adapter";
import { archiveCaptureBatch } from "@/server/document-library/capture-archive";

const actor = { id: "fixture-user" } as AuthenticatedUser;
const png = readFileSync(resolve("src/tests/e2e/fixtures/synthetic-vin-code39.png"));
let root = "";

function form() {
  const result = new FormData();
  result.set("manifest", JSON.stringify({ key: randomUUID(), destination: null, items: [{ kind: "PHOTO" }, { kind: "PHOTO" }] }));
  result.append("file", new File([new Uint8Array(png)], "one.png", { type: "image/png" }));
  result.append("file", new File([new Uint8Array(png)], "two.png", { type: "image/png" }));
  return result;
}

async function files() {
  return (await readdir(root, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile()).map(entry => entry.name).sort();
}

beforeEach(async () => {
  vi.resetAllMocks();
  root = await mkdtemp(join(tmpdir(), "capture-archive-proof-"));
  fakes.runtime.mockReturnValue({ adapter: createLocalPrivateDocumentStorageAdapter({ rootDir: root }), localPrivateRoot: root });
});
afterEach(async () => {
  if (root && resolve(root).startsWith(resolve(tmpdir()) + sep + "capture-archive-proof-")) await rm(root, { recursive: true, force: true });
});

describe("capture archive failed batch cleanup", () => {
  it("removes attempted files if storage fails after a partial write", async () => {
    const local = createLocalPrivateDocumentStorageAdapter({ rootDir: root });
    let writes = 0;
    fakes.runtime.mockReturnValue({ localPrivateRoot: root, adapter: { ...local, writeObject: async (input: Parameters<typeof local.writeObject>[0]) => {
      const value = await local.writeObject(input);
      if (++writes === 2) throw new Error("Synthetic write failure");
      return value;
    } } });
    fakes.findUnique.mockResolvedValue(null);
    await expect(archiveCaptureBatch(actor, form())).rejects.toThrow("Synthetic write failure");
    expect(fakes.create).not.toHaveBeenCalled();
    expect(await files()).toEqual([]);
  });

  it("removes attempt-owned bytes when database creation fails without saving the record", async () => {
    fakes.findUnique.mockResolvedValue(null);
    fakes.create.mockRejectedValue(new Error("Synthetic database failure"));
    await expect(archiveCaptureBatch(actor, form())).rejects.toThrow("Synthetic database failure");
    expect(await files()).toEqual([]);
  });

  it("preserves originals when the database committed but its response was lost", async () => {
    fakes.findUnique.mockResolvedValueOnce(null);
    fakes.create.mockImplementation(async ({ data }) => {
      fakes.findUnique.mockResolvedValue({ requestHash: data.requestHash, items: data.items.create });
      throw new Error("Synthetic lost response after commit");
    });
    const result = await archiveCaptureBatch(actor, form());
    expect(result.items).toHaveLength(2);
    expect(await files()).toEqual(["one.png", "two.png"]);
  });
});
