import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import { cancelCollectionsImport, commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";

import { createCollectionsTestOrg, csvWith, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections import (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  let vehicleId = "";
  let customerId = "";

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const vehicle = await prisma.vehicle.create({ data: { organizationId: ctx.organizationId, vehicleNumber: `V-${ctx.suffix}`, stockNumber: "TST101", stockNumberNormalized: "TST101", vinState: "NON_VIN_EXCEPTION", nonVinReason: "Synthetic collections fixture", vinValidationSource: "SYNTHETIC" } });
    vehicleId = vehicle.id;
    const customer = await prisma.customer.create({ data: { organizationId: ctx.organizationId, customerNumber: `C-${ctx.suffix}`, displayName: "Alex Testerson" } });
    customerId = customer.id;
    await prisma.customerVehicle.create({ data: { customerId, vehicleId, relationshipType: "OWNER", effectiveFrom: new Date("2025-01-15") } });
  });

  it("previews, then commits the fixture in one go", async () => {
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "Active Accounts 11-15-2026.csv", bytes: fixtureBytes("active-accounts.sample.csv") });
    expect(preview.status).toBe("PREVIEW");
    expect(preview.asOfDate).toBe("2026-11-15");
    expect(preview.summary).toMatchObject({ totalRows: 30, created: 30, missing: 0 });
    expect(await prisma.collectionAccount.count({ where: { organizationId: ctx.organizationId } })).toBe(0);

    const result = await commitCollectionsImport(ctx.owner, preview.runId);
    expect(result).toMatchObject({ created: 30, updated: 0, missing: 0, dmsPromisesCreated: 1 });
    expect(await prisma.collectionAccountSnapshot.count({ where: { organizationId: ctx.organizationId } })).toBe(30);

    const first = await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1001" } });
    expect(first.accountType).toBe("LEASE_TO_OWN");
    expect(first.vehicleId).toBe(vehicleId);
    // Suggested from the vehicle's owner, but never linked automatically.
    expect(first.suggestedCustomerId).toBe(customerId);
    expect(first.customerId).toBeNull();
    const repo = await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1024" } });
    expect(repo.status).toBe("REPOSSESSED");
  });

  it("refuses to import the exact same file twice", async () => {
    await expect(previewCollectionsImport(ctx.owner, { fileName: "again.csv", bytes: fixtureBytes("active-accounts.sample.csv") })).rejects.toThrow(/already imported/);
  });

  it("keeps the account type, updates balances, and flags accounts missing from the file", async () => {
    await prisma.collectionAccount.updateMany({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1002" }, data: { accountType: "BHPH" } });
    const bytes = csvWith(rows => rows
      .filter(row => row[0] !== "FAKE-1030")
      .map(row => row[0] === "FAKE-1013" ? row.map((cell, i) => (i === 23 ? "0" : cell)) : row));
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "Active Accounts 11-16-2026.csv", bytes });
    expect(preview.summary).toMatchObject({ totalRows: 29, created: 0, missing: 1 });
    const result = await commitCollectionsImport(ctx.owner, preview.runId);
    expect(result.missing).toBe(1);
    expect(result.dmsPromisesCreated).toBe(0);

    const typed = await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1002" } });
    expect(typed.accountType).toBe("BHPH");
    const improved = await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1013" } });
    expect(improved.daysPastDue).toBe(0);
    expect(improved.status).toBe("CURRENT");
    const gone = await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1030" } });
    expect(gone.missingFromImportAt).not.toBeNull();
    expect(await prisma.collectionAccountEvent.count({ where: { accountId: gone.id, type: "NOT_IN_LATEST_IMPORT" } })).toBe(1);
  });

  it("can cancel a preview without changing anything", async () => {
    const before = await prisma.collectionAccountSnapshot.count({ where: { organizationId: ctx.organizationId } });
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "x 11-17-2026.csv", bytes: csvWith(rows => rows.slice(0, 5)) });
    await cancelCollectionsImport(ctx.owner, preview.runId);
    await expect(commitCollectionsImport(ctx.owner, preview.runId)).rejects.toThrow(/already cancelled/);
    expect(await prisma.collectionAccountSnapshot.count({ where: { organizationId: ctx.organizationId } })).toBe(before);
  });

  it("records a failed run when required columns are missing", async () => {
    const result = await previewCollectionsImport(ctx.owner, { fileName: "wrong.csv", bytes: new TextEncoder().encode(" AccountId, BuyerName\nX,Y\n") });
    expect(result.status).toBe("FAILED");
    expect(result.errors[0].message).toMatch(/missing required column/);
  });

  it("blocks people without import permission", async () => {
    const collector = { ...ctx.owner, id: `${ctx.owner.id}-c`, roles: ["Collections"] };
    await expect(previewCollectionsImport(collector, { fileName: "a.csv", bytes: fixtureBytes("active-accounts.sample.csv") })).rejects.toThrow(/permission|Collections module/);
  });
});
