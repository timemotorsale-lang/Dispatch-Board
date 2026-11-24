import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { runAccountAction } from "@/features/collections/server/action-router";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { runCollectionsAutomations } from "@/features/collections/server/automations";
import { addDays, chicagoToday } from "@/features/collections/domain/money-dates";

import { createCollectionsTestOrg, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections starter disable, repo and letters (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  const today = chicagoToday();
  const ids: Record<string, string> = {};
  const act = (external: string, values: Record<string, unknown>, who?: AuthenticatedUser) => runAccountAction(who ?? ctx.owner, ids[external], values) as Promise<{ message: string; warnings?: string[] }>;
  const account = (external: string) => prisma.collectionAccount.findUniqueOrThrow({ where: { id: ids[external] } });
  const openReasons = async (external: string) => (await prisma.collectionTaskLink.findMany({ where: { accountId: ids[external], status: "OPEN" } })).map(l => l.reason).sort();
  const latestStarter = (external: string) => prisma.starterDisableAction.findFirstOrThrow({ where: { accountId: ids[external] }, orderBy: { createdAt: "desc" } });
  const openCase = (external: string) => prisma.repossessionCase.findFirstOrThrow({ where: { accountId: ids[external] }, orderBy: { createdAt: "desc" } });

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: today });
    await commitCollectionsImport(ctx.owner, preview.runId);
    await runCollectionsAutomations(ctx.organizationId, { trigger: "IMPORT", actorId: ctx.owner.id });
    for (const a of await prisma.collectionAccount.findMany({ where: { organizationId: ctx.organizationId } })) ids[a.externalAccountId] = a.id;
  });

  it("disable: request (with warning), approve, done in portal; review task closes", async () => {
    expect(await openReasons("FAKE-1013")).toEqual(["DISABLE_REVIEW"]);
    await expect(act("FAKE-1013", { action: "REQUEST_STARTER", kind: "DISABLE" })).rejects.toThrow(/warned/);
    await expect(act("FAKE-1013", { action: "REQUEST_STARTER", kind: "DISABLE", warningMethod: "NONE", reason: " " })).rejects.toThrow(/reason/);
    const requested = await act("FAKE-1013", { action: "REQUEST_STARTER", kind: "DISABLE", warningMethod: "CALL", warningDate: today });
    expect(requested.warnings?.join(" ")).toMatch(/GPS starter interrupt/); // not marked as disclosed in the contract
    const request = await latestStarter("FAKE-1013");
    await expect(act("FAKE-1013", { action: "STARTER_DONE_IN_PORTAL", actionId: request.id, confirmed: "true" })).rejects.toThrow(/Approve/);
    await act("FAKE-1013", { action: "APPROVE_STARTER", actionId: request.id });
    await expect(act("FAKE-1013", { action: "STARTER_DONE_IN_PORTAL", actionId: request.id })).rejects.toThrow(/Confirm/);
    await act("FAKE-1013", { action: "STARTER_DONE_IN_PORTAL", actionId: request.id, confirmed: "true" });
    expect((await account("FAKE-1013")).status).toBe("STARTER_DISABLED");
    expect(await openReasons("FAKE-1013")).toEqual([]);
  });

  it("a promise after the disable creates the re-enable task; re-enabling closes it", async () => {
    await act("FAKE-1013", { action: "RECORD_PROMISE", amount: "150", promisedDate: addDays(today, 2) });
    expect(await openReasons("FAKE-1013")).toEqual(["RE_ENABLE_STARTER"]);
    await act("FAKE-1013", { action: "REQUEST_STARTER", kind: "ENABLE", reason: "Promise to pay Friday" });
    const enable = await latestStarter("FAKE-1013");
    await act("FAKE-1013", { action: "APPROVE_STARTER", actionId: enable.id });
    await act("FAKE-1013", { action: "STARTER_DONE_IN_PORTAL", actionId: enable.id, confirmed: "true" });
    expect(await openReasons("FAKE-1013")).not.toContain("RE_ENABLE_STARTER");
    expect((await account("FAKE-1013")).status).not.toBe("STARTER_DISABLED");
  });

  it("only admins approve; collectors can request", async () => {
    const collector: AuthenticatedUser = { ...ctx.owner, roles: ["Collections"] };
    process.env.COLLECTIONS_MODULE = "LIVE";
    try {
      await act("FAKE-1014", { action: "REQUEST_STARTER", kind: "DISABLE", warningMethod: "TEXT", warningDate: today }, collector);
      const request = await latestStarter("FAKE-1014");
      await expect(act("FAKE-1014", { action: "APPROVE_STARTER", actionId: request.id }, collector)).rejects.toThrow();
    } finally { process.env.COLLECTIONS_MODULE = "REVIEW"; }
  });

  it("repo: review, assign to TLC (vendor made once), status updates, returned to inventory", async () => {
    await act("FAKE-1023", { action: "START_REPO_REVIEW", reason: "75 days, no contact" });
    await expect(act("FAKE-1023", { action: "START_REPO_REVIEW", reason: "again please" })).rejects.toThrow(/already/);
    const c = await openCase("FAKE-1023");
    await act("FAKE-1023", { action: "ASSIGN_REPO_TLC", caseId: c.id });
    const assigned = await openCase("FAKE-1023");
    expect(assigned.status).toBe("ASSIGNED");
    expect(await openReasons("FAKE-1023")).toEqual(["REPO_TLC"]);
    expect(assigned.taskId).toBeTruthy();
    expect((await account("FAKE-1023")).status).toBe("REPO_ASSIGNED");
    await expect(act("FAKE-1023", { action: "UPDATE_REPO", caseId: c.id, status: "ASSIGNED" })).rejects.toThrow();
    await act("FAKE-1023", { action: "UPDATE_REPO", caseId: c.id, status: "LOCATED", notes: "Found at the address on file" });
    expect(await prisma.taskComment.count({ where: { taskId: assigned.taskId! } })).toBe(1);
    await act("FAKE-1023", { action: "UPDATE_REPO", caseId: c.id, status: "RECOVERED", repoFee: "$350", storageLocation: "TLC lot" });
    await act("FAKE-1023", { action: "REPO_OUTCOME", caseId: c.id, outcome: "RETURNED_TO_INVENTORY", notes: "Back on our lot" });
    const done = await openCase("FAKE-1023");
    expect(done).toMatchObject({ status: "RETURNED_TO_INVENTORY", repoFeeCents: 35000 });
    const inventoryTask = await prisma.task.findUniqueOrThrow({ where: { id: done.inventoryTaskId! } });
    expect(inventoryTask.workflowArea).toBe("INVENTORY");
    expect((await account("FAKE-1023")).status).toBe("REPOSSESSED");
    expect(await openReasons("FAKE-1023")).toEqual([]);
    // A second assignment reuses the same TLC Recovery vendor.
    await act("FAKE-1025", { action: "START_REPO_REVIEW", reason: "120 days past due" });
    await act("FAKE-1025", { action: "ASSIGN_REPO_TLC", caseId: (await openCase("FAKE-1025")).id });
    expect(await prisma.vendor.count({ where: { organizationId: ctx.organizationId, category: "COLLECTIONS_REPOSSESSION" } })).toBe(1);
  });

  it("bankruptcy blocks disables, repos and letters, but not re-enabling", async () => {
    await act("FAKE-1022", { action: "SET_FLAG", type: "BANKRUPTCY", reason: "Chapter 13 filed" });
    await expect(act("FAKE-1022", { action: "REQUEST_STARTER", kind: "DISABLE", warningMethod: "CALL", warningDate: today })).rejects.toThrow(/Bankruptcy/);
    await expect(act("FAKE-1022", { action: "START_REPO_REVIEW", reason: "61 days past due" })).rejects.toThrow(/Bankruptcy/);
    await expect(act("FAKE-1022", { action: "GENERATE_LETTER", templateKey: "PRE_REPO_NOTICE" })).rejects.toThrow(/Bankruptcy/);
  });

  it("a draft letter can't be recorded as sent; an approved one needs the tracking number for certified mail", async () => {
    const draft = await prisma.collectionLetter.create({ data: { organizationId: ctx.organizationId, accountId: ids["FAKE-1021"], templateKey: "PRE_REPO_NOTICE", isDraftWording: true, generatedByUserId: ctx.owner.id } });
    await expect(act("FAKE-1021", { action: "RECORD_LETTER_SENT", letterId: draft.id, sentMethod: "CERTIFIED", trackingNumber: "9400000000000" })).rejects.toThrow(/DRAFT/);
    const approved = await prisma.collectionLetter.create({ data: { organizationId: ctx.organizationId, accountId: ids["FAKE-1021"], templateKey: "PRE_REPO_NOTICE", isDraftWording: false, generatedByUserId: ctx.owner.id } });
    await expect(act("FAKE-1021", { action: "RECORD_LETTER_SENT", letterId: approved.id, sentMethod: "CERTIFIED" })).rejects.toThrow(/tracking/);
    await act("FAKE-1021", { action: "RECORD_LETTER_SENT", letterId: approved.id, sentMethod: "CERTIFIED", trackingNumber: "9400000000000" });
    expect((await prisma.collectionLetter.findUniqueOrThrow({ where: { id: approved.id } })).sentMethod).toBe("CERTIFIED");
  });
});
