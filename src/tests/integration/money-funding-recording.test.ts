import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { moneyCommand } from "@/server/money-resources/service";
import { readFundingException, UNIDENTIFIED_CARD_FLAG } from "@/lib/money-funding";
import { savedPurchasingFlags } from "@/lib/money-purchasing";
import type { AuthenticatedUser } from "@/server/auth/store";
describe.skipIf(process.env.RUN_MONEY_FUNDING_ROLLBACK_TEST !== "true")("actual spending without an assigned card", () => {
  it("records pending actual spending once, protects other staff cards and preserves reviewed corrections", async () => {
    const url = new URL(process.env.DATABASE_URL!);
    assert(["localhost", "127.0.0.1"].includes(url.hostname));
    const marker = randomUUID(), rollback = new Error("ROLLBACK_MONEY_FUNDING");
    const before = await prisma.moneyEntry.count();
    try {
      await prisma.$transaction(async tx => {
        const client = new Proxy(tx, { get(target, key) { return key === "$transaction" ? async (fn: (db: typeof tx) => Promise<unknown>) => fn(tx) : Reflect.get(target, key); } }) as unknown as PrismaClient;
        const org = await tx.organization.create({ data: { name: "Rollback verification", code: marker } });
        const location = await tx.location.create({ data: { organizationId: org.id, code: marker, name: "Rollback location", city: "Test", region: "MN", timezone: "America/Chicago" } });
        const users = await Promise.all([0, 1, 2].map(n => tx.user.create({ data: { name: "Verification " + n, email: marker + n + "@example.invalid", passwordHash: "not-a-login" } })));
        for (const user of users) await tx.userLocationAccess.create({ data: { userId: user.id, locationId: location.id, validFrom: new Date("2020-01-01"), canViewSchedule: false, canParticipate: false, canOwnAppointments: false, canManageAppointments: false, canViewLimitedData: false } });
        const actor = (index: number): AuthenticatedUser => ({ ...users[index], roles: index === 1 ? ["General Manager"] : [], duties: { direct: [], roleDefaults: [], all: [] } });
        const privateCard = await tx.moneyAccount.create({ data: { organizationId: org.id, assignedUserId: users[2].id, label: "Private verification card", kind: "CARD", lastFour: "1234" } });
        const body = { action: "RECORD", amount: "75.25", merchant: "Parts supplier", purpose: "Actual purchase already paid", paymentMethod: "CARD", idempotencyKey: randomUUID() };
        const first = await moneyCommand(actor(0), body, client) as { id: string };
        const retry = await moneyCommand(actor(0), body, client) as { id: string };
        assert.equal(first.id, retry.id);
        const saved = await tx.moneyEntry.findUniqueOrThrow({ where: { id: first.id } });
        assert.equal(saved.accountId, null); assert.equal(saved.employeeId, users[0].id); assert.equal(saved.approvalStatus, "PENDING"); assert.equal(saved.amountCents, 7525);
        assert(savedPurchasingFlags(saved.purchasingSnapshot).includes(UNIDENTIFIED_CARD_FLAG));
        await assert.rejects(() => moneyCommand(actor(0), { ...body, accountId: privateCard.id, idempotencyKey: randomUUID() }, client), /available funding source/);
        await assert.rejects(() => moneyCommand(actor(0), { ...body, employeeId: users[2].id, idempotencyKey: randomUUID() }, client), /responsible employee/);
        const preserved = await moneyCommand(actor(1), { action: "CORRECT", id: first.id, version: 1, amount: "75.25", note: "Correct purchase note; funding remains unidentified", idempotencyKey: randomUUID() }, client) as { id: string };
        const unresolved = await tx.moneyEntry.findUniqueOrThrow({ where: { id: preserved.id } });
        assert(readFundingException(unresolved.purchasingSnapshot));
        const corrected = await moneyCommand(actor(1), { action: "CORRECT", id: unresolved.id, version: unresolved.version, amount: "75.25", accountId: privateCard.id, note: "Manager verified the actual funding source from receipt", idempotencyKey: randomUUID() }, client) as { id: string };
        const verified = await tx.moneyEntry.findUniqueOrThrow({ where: { id: corrected.id } });
        assert.equal(verified.accountId, privateCard.id); assert.equal(verified.employeeId, users[0].id);
        assert.equal(readFundingException(verified.purchasingSnapshot), null);
        assert.equal(await tx.moneyAccount.count({ where: { organizationId: org.id, assignedUserId: users[0].id } }), 0);
        assert.equal(await tx.moneyPurchasingAuthorization.count({ where: { organizationId: org.id, employeeId: users[0].id } }), 0);
        throw rollback;
      }, { timeout: 30000, isolationLevel: "Serializable" });
    } catch (error) { if (error !== rollback) throw error; }
    assert.equal(await prisma.moneyEntry.count(), before);
    assert.equal(await prisma.organization.count({ where: { code: marker } }), 0);
  }, 40000);
});
