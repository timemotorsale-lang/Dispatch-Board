import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { runAccountAction } from "@/features/collections/server/action-router";
import { getQueue } from "@/features/collections/server/account-service";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { addDays, chicagoToday } from "@/features/collections/domain/money-dates";

import { createCollectionsTestOrg, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections insurance (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  let accountId = "";
  const today = chicagoToday();
  const act = (values: Record<string, unknown>, who?: AuthenticatedUser) => runAccountAction(who ?? ctx.owner, accountId, values) as Promise<{ message: string }>;
  const insuranceTasks = () => prisma.collectionTaskLink.count({ where: { accountId, reason: "INSURANCE_NEEDED", status: "OPEN" } });
  const proof = async () => (await prisma.documentLibraryDocument.create({ data: {
    id: randomUUID(), organizationId: ctx.organizationId, ownerType: "COLLECTION_ACCOUNT", ownerId: accountId, ownerLabel: "test", documentType: "COLLECTIONS_INSURANCE_PROOF",
    fileName: "card.jpg", sensitivity: "RESTRICTED", source: "MANUAL_UPLOAD", retentionCategory: "FINANCIAL_RECORD", storageProvider: "INTERNAL", storageReference: "test/none",
    checksumSha256: "0", sizeBytes: 1, contentType: "image/jpeg", createdByUserId: ctx.owner.id, updatedByUserId: ctx.owner.id
  } })).id;

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: today });
    await commitCollectionsImport(ctx.owner, preview.runId);
    accountId = (await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1002" } })).id;
  });

  it("expired insurance creates a task and shows in the Insurance problems tab", async () => {
    await act({ action: "ADD_INSURANCE", carrier: "Progressive", expirationDate: addDays(today, -3) });
    expect(await insuranceTasks()).toBe(1);
    const queue = await getQueue(ctx.owner, { tab: "INSURANCE" });
    expect(queue.rows.some(r => r.id === accountId)).toBe(true);
  });

  it("new current insurance closes the task; it stays 'not verified' until an admin checks it", async () => {
    const documentId = await proof();
    await act({ action: "ADD_INSURANCE", carrier: "Progressive", policyNumber: "P-123", effectiveDate: today, expirationDate: addDays(today, 180), proofDocumentId: documentId });
    expect(await insuranceTasks()).toBe(0);
    const latest = await prisma.insuranceRecord.findFirstOrThrow({ where: { accountId }, orderBy: { createdAt: "desc" } });
    expect(latest.status).toBe("UNKNOWN");
  });

  it("verifying needs the lienholder check, and only an admin can do it", async () => {
    const latest = await prisma.insuranceRecord.findFirstOrThrow({ where: { accountId }, orderBy: { createdAt: "desc" } });
    await expect(act({ action: "VERIFY_INSURANCE", recordId: latest.id })).rejects.toThrow(/lienholder/);
    const collector: AuthenticatedUser = { ...ctx.owner, roles: ["Collections"] };
    process.env.COLLECTIONS_MODULE = "LIVE";
    try {
      await expect(act({ action: "VERIFY_INSURANCE", recordId: latest.id, lienholderConfirmed: "true" }, collector)).rejects.toThrow();
    } finally { process.env.COLLECTIONS_MODULE = "REVIEW"; }
    await act({ action: "VERIFY_INSURANCE", recordId: latest.id, lienholderConfirmed: "true" });
    const verified = await prisma.insuranceRecord.findFirstOrThrow({ where: { accountId }, orderBy: { createdAt: "desc" } });
    expect(verified).toMatchObject({ status: "VERIFIED", lienholderListed: true, verifiedByUserId: ctx.owner.id });
    expect(await prisma.insuranceRecord.count({ where: { accountId } })).toBe(3); // append-only: nothing overwritten
  });

  it("marking insurance missing creates the task again", async () => {
    await expect(act({ action: "MARK_INSURANCE_MISSING", notes: "" })).rejects.toThrow();
    await act({ action: "MARK_INSURANCE_MISSING", notes: "Customer says the policy lapsed" });
    expect(await insuranceTasks()).toBe(1);
  });

  it("rejects bad dates and someone else's document", async () => {
    await expect(act({ action: "ADD_INSURANCE", effectiveDate: today, expirationDate: addDays(today, -1) })).rejects.toThrow(/after the start/);
    await expect(act({ action: "ADD_INSURANCE", expirationDate: addDays(today, 30), proofDocumentId: randomUUID() })).rejects.toThrow(/Upload/);
  });

  it("won't download texted photos while texting isn't live", async () => {
    const inbound = await prisma.inboundMessage.create({ data: { organizationId: ctx.organizationId, accountId, from: "+16125550000", body: "here is my card", mediaDocumentIds: [{ url: "https://api.twilio.com/2010-04-01/Accounts/AC1/Messages/MM1/Media/ME1", contentType: "image/jpeg", savedDocumentId: null }] } });
    await expect(act({ action: "SAVE_TEXTED_PHOTO", inboundMessageId: inbound.id, mediaIndex: 0 })).rejects.toThrow(/turned on/);
  });
});
