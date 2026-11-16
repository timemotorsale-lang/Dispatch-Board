import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveIntegrationMode } from "@/features/collections/config/flags";
import { commitCollectionsImport, previewCollectionsImport } from "@/features/collections/server/import-service";
import { createFakeAdapters } from "@/features/collections/server/integrations/fakes";
import { getIntegration, getIntegrationsHealth, INTEGRATIONS, runIntegrationTestCall } from "@/features/collections/server/integrations/registry";
import { chicagoToday } from "@/features/collections/domain/money-dates";

import { createCollectionsTestOrg, fixtureBytes, RUN_COLLECTIONS_DB } from "./collections-helpers";

describe("integration switches and fakes (no database)", () => {
  it("defaults every integration to OFF, and holds LIVE at TEST in Release 1", () => {
    for (const i of INTEGRATIONS) expect(resolveIntegrationMode(i.envVar, { COLLECTIONS_MODULE: "LIVE" } as never)).toBe("OFF");
    expect(resolveIntegrationMode("COLLECTIONS_INTEGRATION_PAYMENTS", { COLLECTIONS_MODULE: "LIVE", COLLECTIONS_INTEGRATION_PAYMENTS: "LIVE" } as never)).toBe("TEST");
    expect(resolveIntegrationMode("COLLECTIONS_INTEGRATION_PAYMENTS", { COLLECTIONS_MODULE: "OFF", COLLECTIONS_INTEGRATION_PAYMENTS: "TEST" } as never)).toBe("OFF");
  });
  it("lists all 11 integrations from the spec, each with a manual fallback", () => {
    expect(INTEGRATIONS.map(i => i.key)).toEqual(["PAYMENTS", "BANKRUPTCY", "REASSIGNED_NUMBERS", "INSURANCE", "GPS", "MAIL", "REPO_NETWORK", "PHONE", "ESIGN", "SKIP_TRACE", "DMS"]);
    expect(INTEGRATIONS.every(i => i.fallback.length > 20)).toBe(true);
  });
  it("fakes are deterministic and offer the unhappy paths", async () => {
    const f = createFakeAdapters(), ctx = { organizationId: "o", initiatedByUserId: "u" };
    expect((await f.PAYMENTS.chargeCard(ctx, { amountCents: 10013, cardToken: "t", approvalId: "a" })).status).toBe("DECLINED");
    expect((await f.REASSIGNED_NUMBERS.check(ctx, { phoneE164: "+16125550000", consentDate: "2026-01-01" })).reassigned).toBe(true);
    expect((await f.INSURANCE.verify(ctx, { policyNumber: "P-LAPSED", carrier: "x" })).status).toBe("LAPSED");
    await f.BANKRUPTCY.submitPortfolio(ctx, { accounts: [{ accountId: "a1", name: "Sample BKTEST" }, { accountId: "a2", name: "Other" }] });
    expect((await f.BANKRUPTCY.dailyMatches(ctx)).map(m => m.accountId)).toEqual(["a1"]);
    expect((await f.MAIL.verifyAddress(ctx, { address: "UNDELIVERABLE lane" })).deliverable).toBe(false);
  });
});

describe.skipIf(!RUN_COLLECTIONS_DB)("integration registry (database)", () => {
  let ctx: Awaited<ReturnType<typeof createCollectionsTestOrg>>;
  const saved = { ...process.env };
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const call = (userId: string | null = null) => ({ organizationId: ctx.organizationId, initiatedByUserId: userId ?? ctx.owner.id });

  beforeAll(async () => {
    ctx = await createCollectionsTestOrg();
    const preview = await previewCollectionsImport(ctx.owner, { fileName: "first.csv", bytes: fixtureBytes("active-accounts.sample.csv"), asOfDate: chicagoToday() });
    await commitCollectionsImport(ctx.owner, preview.runId);
  });
  afterAll(() => {
    for (const i of INTEGRATIONS) { if (saved[i.envVar] === undefined) delete process.env[i.envVar]; else process.env[i.envVar] = saved[i.envVar]; }
    fetchSpy.mockRestore();
  });

  it("OFF refuses with the manual way to do it", async () => {
    delete process.env.COLLECTIONS_INTEGRATION_PHONE;
    await expect(getIntegration("PHONE").clickToCall(call(), { toE164: "+16125550123" })).rejects.toThrow(/turned off.*Tap Call/);
  });

  it("TEST runs the fake, logs the call without its inputs, and never touches the network", async () => {
    process.env.COLLECTIONS_INTEGRATION_REASSIGNED_NUMBERS = "LIVE"; // held at TEST
    const result = await getIntegration("REASSIGNED_NUMBERS").check(call(), { phoneE164: "+16125557777", consentDate: "2026-01-01" });
    expect(result.reassigned).toBe(false);
    const logged = await prisma.collectionAccountEvent.findFirstOrThrow({ where: { organizationId: ctx.organizationId, type: "INTEGRATION_CALL" }, orderBy: { occurredAt: "desc" } });
    expect(logged.after).toMatchObject({ integration: "REASSIGNED_NUMBERS", operation: "check", mode: "TEST", ok: true });
    expect(JSON.stringify(logged.after)).not.toContain("5557777");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("money needs a person and a recorded approval", async () => {
    process.env.COLLECTIONS_INTEGRATION_PAYMENTS = "TEST";
    const pay = getIntegration("PAYMENTS");
    await expect(pay.chargeCard({ organizationId: ctx.organizationId, initiatedByUserId: null }, { amountCents: 100, cardToken: "t", approvalId: "a" })).rejects.toThrow(/person's decision/);
    await expect(pay.chargeCard(call(), { amountCents: 100, cardToken: "t", approvalId: "" })).rejects.toThrow(/approval/);
    expect((await pay.chargeCard(call(), { amountCents: 100, cardToken: "t", approvalId: "approval-1" })).status).toBe("SUCCEEDED");
  });

  it("GPS disable needs an owner-approved starter action and respects a bankruptcy freeze", async () => {
    process.env.COLLECTIONS_INTEGRATION_GPS = "TEST";
    const gps = getIntegration("GPS");
    await expect(gps.disable(call(), { deviceSerial: "SN", approvedActionId: "nope" })).rejects.toThrow(/approved by the owner/);
    const account = await prisma.collectionAccount.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalAccountId: "FAKE-1013" } });
    const approved = await prisma.starterDisableAction.create({ data: { organizationId: ctx.organizationId, accountId: account.id, action: "DISABLE", status: "APPROVED", requestedByUserId: ctx.owner.id, approvedByUserId: ctx.owner.id, approvedAt: new Date(), reason: "test" } });
    expect((await gps.disable(call(), { deviceSerial: "SN", approvedActionId: approved.id })).done).toBe(true);
    await prisma.collectionFlag.create({ data: { organizationId: ctx.organizationId, accountId: account.id, type: "BANKRUPTCY", setReason: "test", setByUserId: ctx.owner.id } });
    await expect(gps.disable(call(), { deviceSerial: "SN", approvedActionId: approved.id })).rejects.toThrow(/Bankruptcy/);
  });

  it("skip-trace searches need a permissible purpose", async () => {
    process.env.COLLECTIONS_INTEGRATION_SKIP_TRACE = "TEST";
    await expect(getIntegration("SKIP_TRACE").search(call(), { name: "x", lastKnownAddress: null, permissiblePurpose: "" })).rejects.toThrow(/permissible purpose/);
  });

  it("the health page shows each switch, call counts and failures; test calls are admin-only", async () => {
    const rows = await getIntegrationsHealth(ctx.owner);
    expect(rows.find(r => r.key === "PAYMENTS")).toMatchObject({ mode: "TEST" });
    expect(rows.find(r => r.key === "GPS")!.failures30).toBeGreaterThanOrEqual(2);
    expect((await runIntegrationTestCall(ctx.owner, "PAYMENTS")).ok).toBe(true);
    await expect(runIntegrationTestCall(ctx.owner, "PHONE")).rejects.toThrow(/isn't in TEST mode/);
    const collector: AuthenticatedUser = { ...ctx.owner, roles: ["Collections"] };
    process.env.COLLECTIONS_MODULE = "LIVE";
    try { await expect(getIntegrationsHealth(collector)).rejects.toThrow(); } finally { process.env.COLLECTIONS_MODULE = "REVIEW"; }
  });
});
