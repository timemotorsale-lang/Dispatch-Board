import { mkdtemp, readdir, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

const fakes = vi.hoisted(() => ({ create: vi.fn(), findUnique: vi.fn(), runtime: vi.fn(), readDeal: vi.fn(), grants: vi.fn(), transaction: vi.fn(), rowLock: vi.fn(), dealCustomer: vi.fn(), findItem: vi.fn(), findItems: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: fakes.transaction, captureArchiveItem: { findFirst: fakes.findItem, findMany: fakes.findItems }, captureArchiveBatch: { create: fakes.create, findUnique: fakes.findUnique } } }));
vi.mock("@/server/deal-continuity/identities", () => ({ dealOrganization: () => "sandbox-org", dealCustomer: fakes.dealCustomer }));
vi.mock("@/server/sales-documents/deal-drafts", () => ({ readDealDeskDraft: fakes.readDeal }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: fakes.grants }) }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: fakes.runtime }));

import { createLocalPrivateDocumentStorageAdapter } from "@/server/document-library/storage-adapter";
import { archiveCaptureBatch, canCaptureForVehicle, fileCapture, listCaptureArchive } from "@/server/document-library/capture-archive";

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
it.each(["VEHICLE_OPERATIONS_VIEW", "VEHICLE_EVIDENCE_VIEW"])("hides vehicle captures and blocks refiling under a %s denial", async (capability) => {
  const manager = { ...actor, isActive: true, roles: ["General Manager"] };
  fakes.grants.mockResolvedValue([{ capability, effect: "DENY", locationId: null, validFrom: new Date(0), validTo: null }]);
  const item = { id: "old-photo", ownerType: "VEHICLE", ownerId: "vehicle-fixture", ownerLabel: "Vehicle", kind: "PHOTO", createdByUserId: manager.id };
  fakes.findItem.mockResolvedValue(item);
  fakes.findItems.mockResolvedValue([item]);
  await expect(canCaptureForVehicle(manager, "vehicle-fixture")).resolves.toBe(false);
  await expect(listCaptureArchive(manager, new URLSearchParams({ ownerType: "VEHICLE", ownerId: "vehicle-fixture" })))
    .rejects.toMatchObject({ status: 403 });
  await expect(listCaptureArchive(manager, new URLSearchParams())).resolves.toMatchObject({ items: [] });
  await expect(fileCapture(manager, { id: item.id, revision: 0, destination: null })).rejects.toMatchObject({ status: 403 });
});

it("rechecks the deal link under a lock and removes bytes if the customer changed", async () => {
  const data = form();
  const manifest = JSON.parse(String(data.get("manifest")));
  Object.assign(manifest, { requiredDealId: "fixture-deal", requiredCustomerId: "original-customer", destination: { type: "CUSTOMER", id: "original-customer" } });
  data.set("manifest", JSON.stringify(manifest));
  fakes.findUnique.mockResolvedValue(null);
  fakes.dealCustomer.mockResolvedValue({ name: "Synthetic test", customerNumber: "TEST" });
  const tx = { $queryRaw: fakes.rowLock, captureArchiveBatch: { create: fakes.create } };
  fakes.transaction.mockImplementation(callback => callback(tx));
  fakes.readDeal.mockResolvedValueOnce({ customerId: "original-customer" }).mockResolvedValueOnce({ customerId: "changed-customer" });
  await expect(archiveCaptureBatch(actor, data)).rejects.toMatchObject({ status: 409 });
  expect(fakes.rowLock).toHaveBeenCalledTimes(1);
  expect(fakes.readDeal).toHaveBeenLastCalledWith(actor, "fixture-deal", false, tx);
  expect(fakes.create).not.toHaveBeenCalled();
  expect(await files()).toEqual([]);
});
