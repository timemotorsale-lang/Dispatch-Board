import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { getTaxWorksheet, searchTaxLinks, taxCommand } from "@/server/compliance/service";

describe.skipIf(process.env.RUN_COMPLIANCE_DB_TESTS !== "1")("isolated upfront-tax workflow", () => {
  const suffix = randomUUID(), organizationId = `compliance-${suffix}`, otherId = `other-${suffix}`;
  const person = (name: string, manager = true): AuthenticatedUser => ({ id: `${name}-${suffix}`, name, email: `${name}-${suffix}@example.test`, isActive: true, roles: manager ? ["General Manager"] : [], duties: { all: [], direct: [], roleDefaults: [] } });
  const manager = person("manager"), worker = person("worker", false), outsider = person("outsider");
  const input = (reference: string, date = "2026-09-15") => ({ kind: "LEASE", reference, date, customer: "Review customer", vehicle: "Review vehicle", vehicleValue: "10000", residual: "0", contractTax: "687.50", garageAddress: "Verified Minnesota address", localTaxes: [], localConfirmed: true, qualified: true });
  const save = (reference: string, extra = {}) => taxCommand(manager, { action: "SAVE", month: "2026-09", input: { ...input(reference), ...extra } });
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.startsWith("/compliance_review_")) throw new Error("Tests require a disposable loopback compliance_review database.");
    for (const id of [organizationId, otherId]) {
      await prisma.organization.create({ data: { id, code: id, name: id } });
      await prisma.location.create({ data: { id: `location-${id}`, organizationId: id, code: id, name: id, timezone: "America/Chicago", city: "Minneapolis", region: "MN" } });
    }
    for (const actor of [manager, worker, outsider]) {
      await prisma.user.create({ data: { id: actor.id, name: actor.name, email: actor.email, passwordHash: "isolated-no-login", isActive: true } });
      await prisma.userLocationAccess.create({ data: { userId: actor.id, locationId: `location-${actor === outsider ? otherId : organizationId}`, validFrom: new Date("2020-01-01") } });
    }
  });
  it("records once, corrects with version checks, excludes sales and scopes access", async () => {
    const first = await save("lease-once");
    await expect(save("LEASE-ONCE")).rejects.toThrow("already recorded");
    await expect(taxCommand(manager, { action: "SAVE", month: "2026-10", input: input("lease-once", "2026-10-01") })).rejects.toThrow("already recorded");
    await expect(taxCommand(manager, { action: "SAVE", month: "2026-09", id: first.id, version: 99, input: input("lease-once") })).rejects.toThrow("changed");
    await taxCommand(manager, { action: "SAVE", month: "2026-09", id: first.id, version: 1, input: { ...input("lease-once"), notes: "Reviewed contract" } });
    await save("sale-1", { kind: "SALE" });
    const sheet = await getTaxWorksheet(manager, "2026-09");
    expect(sheet.summary).toMatchObject({ leaseCount: 1, saleCount: 1, totalCents: 68750 });
    expect((await getTaxWorksheet(outsider, "2026-09")).records).toHaveLength(0);
    await expect(getTaxWorksheet(worker, "2026-09")).rejects.toThrow("authorized manager");
    await expect(getTaxWorksheet(null, "2026-09")).rejects.toThrow("Sign in");
    await expect(taxCommand(outsider, { action: "VOID", month: "2026-09", id: first.id, version: 2, reason: "Cross org" })).rejects.toThrow("changed");
    await expect(searchTaxLinks(worker, "Review")).rejects.toThrow();
  });
  it("requires reconciliation before filing, freezes exact records and confirms payment separately", async () => {
    const pending = await save("pending", { contractTax: "1240.17" });
    const file = { action: "FILE", month: "2026-09", version: 0, revision: (await getTaxWorksheet(manager, "2026-09")).revision, reviewed: true, date: "2026-10-01", reference: "External filing evidence" };
    await expect(taxCommand(manager, file)).rejects.toThrow("flagged");
    await taxCommand(manager, { action: "VOID", month: "2026-09", id: pending.id, version: 1, reason: "Incorrect historical draft" });
    await expect(taxCommand(manager, file)).rejects.toThrow("entries changed");
    file.revision = (await getTaxWorksheet(manager, "2026-09")).revision;
    await expect(taxCommand(manager, { ...file, reviewed: false })).rejects.toThrow("Review all");
    await taxCommand(manager, file);
    const filed = await getTaxWorksheet(manager, "2026-09");
    expect(filed.period?.status).toBe("FILED");
    expect((filed.period?.snapshot as { summary: { totalCents: number } }).summary.totalCents).toBe(68750);
    await expect(save("after-filing")).rejects.toThrow("locked");
    await expect(prisma.complianceTaxRecord.update({ where: { id: filed.records[0].id }, data: { snapshot: {} } })).rejects.toThrow("locked");
    const audit = await prisma.complianceTaxAudit.findFirstOrThrow({ where: { organizationId } });
    await expect(prisma.complianceTaxAudit.delete({ where: { id: audit.id } })).rejects.toThrow("append-only");
    await expect(prisma.complianceTaxPeriod.update({ where: { id: filed.period!.id }, data: { status: "DRAFT" } })).rejects.toThrow("cannot be rewritten");
    const pay = { action: "PAY", month: "2026-09", version: filed.period!.version, date: "2026-10-02", reference: "External payment", amount: "687.50" };
    await expect(taxCommand(manager, { ...pay, amount: "1" })).rejects.toThrow("must match");
    await taxCommand(manager, pay);
    expect((await getTaxWorksheet(manager, "2026-09")).period?.status).toBe("PAID");
    await expect(taxCommand(manager, pay)).rejects.toThrow("changed");
  });
  it("serializes duplicate submissions and rejects mismatched periods", async () => {
    const request = { action: "SAVE", month: "2026-08", input: input("concurrent", "2026-08-01") };
    const results = await Promise.allSettled([taxCommand(manager, request), taxCommand(manager, request)]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect((await getTaxWorksheet(manager, "2026-08")).summary.totalCents).toBe(68750);
    await expect(taxCommand(manager, { ...request, month: "2026-07" })).rejects.toThrow("selected reporting month");
    await expect(save("future", { date: "2099-01-01" })).rejects.toThrow();
    await expect(save("cross-links", { customerId: "unknown-customer" })).rejects.toThrow();
  });
});
