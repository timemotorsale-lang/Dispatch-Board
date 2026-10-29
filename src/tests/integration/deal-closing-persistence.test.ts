import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { closingChecks } from "@/lib/deal-closing";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { createSalesDocumentJacket, getSalesDocumentJacket, updateSalesDocumentJacket } from "@/server/sales-documents/service";

describe.skipIf(process.env.CLOSING_REVIEW_DATABASE_TEST !== "true")("local PostgreSQL closing-review proof", () => {
  it("persists an isolated synthetic review, detects stale changes and preserves its audit snapshot", async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("This proof is restricted to a local development database.");
    const reference = `closing-proof-${randomUUID()}`;
    const actor: AuthenticatedUser = { id: reference, name: "Synthetic closing reviewer", email: "closing-proof@example.test", isActive: true, roles: ["Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
    let jacketId = "", packetId = "";
    try {
      const created = await createSalesDocumentJacket(actor, { dealReference: reference, pathway: "retail-sale", customerName: reference, vehicleReference: "Synthetic test vehicle — no transaction" });
      jacketId = created.id; packetId = created.packetId;
      const command = { action: "CLOSING_REVIEW", revision: created.revision, pathway: "cash", classificationNote: "Synthetic preparation proof only; no signed agreement or real vehicle release.", checks: closingChecks("cash").map(check => ({ id: check.id, state: "PENDING", evidence: "" })) };
      await expect(updateSalesDocumentJacket(actor, jacketId, { ...command, checks: [] })).rejects.toMatchObject({ status: 400 });
      expect((await getSalesDocumentJacket(actor, jacketId)).revision).toBe(created.revision);
      const saved = await updateSalesDocumentJacket(actor, jacketId, command);
      expect(saved.closingReview).toMatchObject({ savedBy: reference, jacketRevision: saved.revision });
      const reloaded = await getSalesDocumentJacket(actor, jacketId);
      expect(reloaded.closingReview).toEqual(saved.closingReview);
      expect(reloaded.closingReadiness).toMatchObject({ stale: false, releaseAllowed: false, signingAllowed: false });
      await expect(updateSalesDocumentJacket(actor, jacketId, command)).rejects.toMatchObject({ status: 409 });
      await expect(updateSalesDocumentJacket({ ...actor, roles: ["Sales"] }, jacketId, { ...command, revision: saved.revision })).rejects.toMatchObject({ status: 403 });
      const changed = await updateSalesDocumentJacket(actor, jacketId, { action: "NOTE", revision: saved.revision, note: "Synthetic later change invalidates preparation evidence." });
      expect(changed.closingReadiness).toMatchObject({ stale: true, resolved: 0 });
      const events = await prisma.documentLibraryAuditEvent.findMany({ where: { packetId, action: "CLOSING_REVIEW_SAVED" } });
      expect(events).toHaveLength(1);
      expect(events[0].metadata).toMatchObject({ closingReview: saved.closingReview });
      expect(await prisma.salesDocumentPacketVersion.count({ where: { jacketId } })).toBe(0);
    } finally {
      if (jacketId && packetId) await prisma.$transaction(async database => {
        const owned = await database.salesDocumentJacket.findFirst({ where: { id: jacketId, dealReference: reference, customerName: reference } });
        if (!owned) throw new Error("Refusing to clean up a non-fixture jacket.");
        await database.documentLibraryAuditEvent.deleteMany({ where: { packetId, actorUserId: reference } });
        await database.salesDocumentJacket.delete({ where: { id: jacketId } });
        await database.documentLibraryPacket.delete({ where: { id: packetId } });
      });
    }
  }, 30000);
});
