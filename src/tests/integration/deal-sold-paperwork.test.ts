import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

describe.skipIf(process.env.RUN_DATABASE_INTEGRATION !== "1")("sold-first paperwork runtime proof", () => {
  it("records sold once and prepares one linked packet without requiring generated or signed forms", async () => {
    const [{ prisma }, { manageDealLifecycle }, { dealOrganization, dealDocumentOrganization }] = await Promise.all([import("@/server/db/client"), import("@/server/sales-documents/deal-lifecycle"), import("@/server/deal-continuity/identities")]);
    const id = `sold-first-${randomUUID()}`, rollback = new Error("ROLLBACK_SOLD_FIRST_TEST");
    const transaction = prisma.$transaction.bind(prisma);
    try {
      const proof = transaction(async tx => {
        const owner = await tx.user.findFirstOrThrow({ where: { isActive: true }, select: { id: true, name: true, email: true } });
        const actor: AuthenticatedUser = { ...owner, isActive: true, roles: ["Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
        await tx.organization.upsert({ where: { id: dealOrganization() }, create: { id: dealOrganization(), code: `${id}-company`, name: "Synthetic company" }, update: {} });
        const customer = await tx.customer.create({ data: { organizationId: dealOrganization(), customerNumber: id, displayName: "Synthetic sold-first buyer" } });
        const draft = await tx.dealDeskDraft.create({ data: { id, organizationId: dealDocumentOrganization(), ownerUserId: owner.id, customerId: customer.id, customerName: customer.displayName, pathway: "lease-to-own", vehicleReference: "Synthetic vehicle", snapshot: { "desk:form": { customerId: customer.id, vehicle: "Synthetic vehicle" } } } });
        prisma.$transaction = (async (run: unknown) => (run as (database: typeof tx) => Promise<unknown>)(tx)) as typeof prisma.$transaction;
        const sold = await manageDealLifecycle(actor, { action: "MARK_SOLD", id, revision: draft.revision });
        expect(sold.status).toBe("SOLD"); expect(sold.jacketId).toBeNull();
        await manageDealLifecycle(actor, { action: "MARK_SOLD", id, revision: draft.revision });
        const current = await tx.dealDeskDraft.findUniqueOrThrow({ where: { id } });
        const packet = await manageDealLifecycle(actor, { action: "PREPARE_PAPERWORK", id, revision: current.revision });
        expect(packet.status).toBe("SOLD"); expect(packet.state).toBe("WORKING");
        const repeated = await manageDealLifecycle(actor, { action: "PREPARE_PAPERWORK", id, revision: current.revision });
        expect(repeated.jacketId).toBe(packet.jacketId);
        expect(await tx.salesDocumentJacket.count({ where: { organizationId: dealDocumentOrganization(), dealReference: id, pathway: "lease-to-own" } })).toBe(1);
        expect(await tx.salesDocumentPacketVersion.count({ where: { jacketId: packet.jacketId! } })).toBe(0);
        const saved = await tx.dealDeskDraft.findUniqueOrThrow({ where: { id } });
        expect(saved.status).toBe("SOLD"); expect(saved.snapshot).toMatchObject({ jackets: { "lease-to-own": packet.jacketId } });
        expect((saved.statusHistory as Array<{ action: string }>).filter(event => event.action === "MARK_SOLD")).toHaveLength(1);
        throw rollback;
      }, { timeout: 30000 });
      await expect(proof).rejects.toBe(rollback);
    } finally { prisma.$transaction = transaction as typeof prisma.$transaction; }
    expect(await prisma.dealDeskDraft.findUnique({ where: { id } })).toBeNull();
  });
});
