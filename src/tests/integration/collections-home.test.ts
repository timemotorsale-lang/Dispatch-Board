import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { afterImportCommitted } from "@/features/collections/server/after-import";
import { runAccountAction } from "@/features/collections/server/action-router";
import { getApprovals, getHome } from "@/features/collections/server/home-service";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { chicagoToday } from "@/features/collections/domain/money-dates";

import { createCollectionsTestOrg, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe.skipIf(!RUN_COLLECTIONS_DB)("collections home page and approvals (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: chicagoToday() });
    await afterImportCommitted(ctx.owner, await commitCollectionsImport(ctx.owner, preview.runId));
  });

  it("shows today's checklist, call-first list, decisions and buckets", async () => {
    const home = await getHome(ctx.owner);
    expect(home.checklist.find(c => c.key === "import")).toMatchObject({ state: "done" });
    expect(home.toCall).toBeGreaterThan(10);
    expect(home.callFirst.length).toBeGreaterThan(0);
    expect(home.callFirst[0].reason.text.length).toBeGreaterThan(0);
    expect(home.firstAccountId).toBe(home.callFirst[0].id);
    expect(home.buckets.reduce((s, b) => s + b.count, 0)).toBe(30);
    expect(home.decisions.map(d => d.key)).toEqual(["starter", "repo", "extensions", "adjustments", "chargeoffs", "skips"]);
    expect(home.links.map(l => l.href)).toContain("/collections/settings");
  });

  it("lists pending decisions oldest first, linking to the right account section", async () => {
    const account = await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1013" } });
    await runAccountAction(ctx.owner, account.id, { action: "REQUEST_STARTER", kind: "DISABLE", warningMethod: "CALL", warningDate: chicagoToday() });
    const { items } = await getApprovals(ctx.owner);
    const starter = items.find(i => i.kind === "Starter disable")!;
    expect(starter).toMatchObject({ status: "Waiting for approval", href: `/collections/accounts/${account.id}?view=recovery` });
    expect((await getHome(ctx.owner)).decisions.find(d => d.key === "starter")!.count).toBe(1);
  });

  it("collectors see their own requests, not everyone's decisions", async () => {
    const collector: AuthenticatedUser = { ...ctx.owner, id: `${ctx.owner.id}-x`, roles: ["Collections"] };
    await prisma.user.create({ data: { id: collector.id, name: "Test Collector", email: `${collector.id}@example.test`, passwordHash: "isolated-test-only" } });
    await prisma.userLocationAccess.create({ data: { userId: collector.id, locationId: ctx.locationId, validFrom: new Date("2020-01-01") } });
    process.env.COLLECTIONS_MODULE = "LIVE";
    try {
      const home = await getHome(collector);
      expect(home.isAdmin).toBe(false);
      expect(home.decisions.find(d => d.key === "starter")!.count).toBe(0);
      expect(home.links.map(l => l.href)).not.toContain("/collections/settings");
      expect((await getApprovals(collector)).items.filter(i => i.kind === "Starter disable")).toHaveLength(0);
    } finally { process.env.COLLECTIONS_MODULE = "REVIEW"; }
  });
});
