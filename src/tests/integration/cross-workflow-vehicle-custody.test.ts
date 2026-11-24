import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

describe.skipIf(process.env.RUN_DEAL_CONTINUITY_INTEGRATION !== "1")("cross-workflow vehicle custody", () => {
  async function fixture() {
    const url = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/^deal_staging_\d+$/.test(url.searchParams.get("schema") ?? "")) throw new Error("An isolated loopback deal_staging schema is required.");
    const [{ prisma }, { manageDealLifecycle }, { dealOrganization, dealDocumentOrganization }] = await Promise.all([
      import("@/server/db/client"), import("@/server/sales-documents/deal-lifecycle"), import("@/server/deal-continuity/identities")
    ]);
    const prefix = `custody-${randomUUID()}`;
    const organizationId = dealOrganization();
    const actor: AuthenticatedUser = { id: `${prefix}-staff`, name: "Custody test staff", email: `${prefix}@example.test`, isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
    await prisma.organization.upsert({ where: { id: organizationId }, create: { id: organizationId, code: prefix, name: "Isolated custody company" }, update: {} });
    await prisma.user.create({ data: { id: actor.id, name: actor.name, email: actor.email, passwordHash: "NON_LOGIN_TEST_FIXTURE" } });
    const customer = await prisma.customer.create({ data: { organizationId, customerNumber: prefix, displayName: "Custody test customer" } });
    const vehicle = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: prefix, vin: `1${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`, vinState: "VALID", vinValidationSource: "ISOLATED_FIXTURE" } });
    const draft = { organizationId: dealDocumentOrganization(), ownerUserId: actor.id, customerId: customer.id, customerName: customer.displayName, vehicleReference: vehicle.vehicleNumber, snapshot: { "desk:identity": { vehicleId: vehicle.id } } };
    const rental = await prisma.dealDeskDraft.create({ data: { ...draft, id: `${prefix}-rental`, pathway: "daily-rental" } });
    const sale = await prisma.dealDeskDraft.create({ data: { ...draft, id: `${prefix}-sale`, pathway: "retail-sale", snapshot: {} } });
    await prisma.dealWorkflowContext.create({ data: { id: rental.id, draftId: rental.id, organizationId, customerId: customer.id, vehicleId: vehicle.id, createdByUserId: actor.id } });
    const startsAt = new Date(), expectedReturnAt = new Date(startsAt.getTime() + 3_600_000);
    const reserve = () => prisma.vehicleUseBooking.create({ data: { id: `${prefix}-${randomUUID()}`, organizationId, contextId: rental.id, vehicleId: vehicle.id, startsAt, expectedReturnAt, reason: "Isolated booking fixture", createdByUserId: actor.id } });
    const sell = () => manageDealLifecycle(actor, { action: "MARK_SOLD", id: sale.id, revision: sale.revision });
    return { prisma, reserve, sell, sale, rental, vehicle, customer, actor };
  }

  it("blocks sale while reserved, allows it after cancellation, and preserves one sale audit on retry", async () => {
    const { prisma, reserve, sell, sale, actor } = await fixture();
    const booking = await reserve();
    await expect(sell()).rejects.toMatchObject({ status: 409, message: expect.stringContaining("temporary vehicle reservation") });
    expect(await prisma.dealDeskDraft.findUnique({ where: { id: sale.id } })).toMatchObject({ status: "IN_PROGRESS", revision: sale.revision, statusHistory: [] });
    await prisma.vehicleUseBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED", version: { increment: 1 } } });
    await expect(sell()).resolves.toMatchObject({ status: "SOLD" });
    await expect(sell()).resolves.toMatchObject({ status: "SOLD" });
    expect(await prisma.dealDeskDraft.findUnique({ where: { id: sale.id } })).toMatchObject({ status: "SOLD", revision: sale.revision + 1, snapshot: { "desk:soldVehicleId": expect.any(String) }, statusHistory: [expect.objectContaining({ action: "MARK_SOLD" })] });
    const { saveDealDeskDraft } = await import("@/server/sales-documents/deal-drafts");
    const { changeDealPathway } = await import("@/server/sales-documents/deal-pathway");
    await expect(saveDealDeskDraft(actor, { ...sale, revision: sale.revision + 1, status: "PENDING" })).rejects.toThrow("sales unwind workflow");
    await expect(changeDealPathway(actor, { id: sale.id, revision: sale.revision + 1, pathway: "daily-rental" })).rejects.toThrow("sales unwind workflow");
    await expect(reserve()).rejects.toThrow("sale or retail reservation");
  }, 30_000);

  it("rejects a new sale with an unresolvable vehicle reference", async () => {
    const { prisma, sale, sell } = await fixture();
    await prisma.dealDeskDraft.update({ where: { id: sale.id }, data: { vehicleReference: "Unlinked description" } });
    await expect(sell()).rejects.toMatchObject({ status: 409, message: "Link one canonical vehicle before marking this deal sold." });
    expect(await prisma.dealDeskDraft.findUniqueOrThrow({ where: { id: sale.id } })).toMatchObject({ status: "IN_PROGRESS" });
  }, 30_000);

  it("serializes competing reservations and CRM sales on the same vehicle", async () => {
    const { prisma, reserve, sell, sale, rental } = await fixture();
    const results = await Promise.allSettled([reserve(), sell()]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const [savedSale, bookings] = await Promise.all([
      prisma.dealDeskDraft.findUniqueOrThrow({ where: { id: sale.id } }),
      prisma.vehicleUseBooking.findMany({ where: { contextId: rental.id, status: "RESERVED" } })
    ]);
    expect(Number(savedSale.status === "SOLD") + bookings.length).toBe(1);
  }, 30_000);

  it("rejects an inventory reservation during temporary use and blocks the reverse after retail reserves", async () => {
    const { prisma, reserve, vehicle, actor } = await fixture();
    const booking = await reserve();
    const location = await prisma.location.create({ data: { organizationId: vehicle.organizationId, code: vehicle.vehicleNumber, name: "Isolated inventory lot", city: "Minneapolis", region: "MN", timezone: "America/Chicago" } });
    const unit = await prisma.inventoryUnit.create({ data: { organizationId: vehicle.organizationId, locationId: location.id, vehicleId: vehicle.id, inventoryNumber: vehicle.vehicleNumber, ownerUserId: actor.id, lifecycleStage: "FRONTLINE_READY", stageStartedAt: booking.startsAt, financialAcquiredAt: booking.startsAt, targetAt: booking.expectedReturnAt, nextAction: "Review custody" } });
    const retailReserve = () => prisma.inventoryUnit.update({ where: { id: unit.id }, data: { lifecycleStage: "RESERVED_DEAL_PENDING" } });
    await expect(retailReserve()).rejects.toThrow("temporary vehicle reservation");
    expect(await prisma.inventoryUnit.findUnique({ where: { id: unit.id } })).toMatchObject({ lifecycleStage: "FRONTLINE_READY" });
    await prisma.vehicleUseBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED", version: 2 } });
    await expect(retailReserve()).resolves.toMatchObject({ lifecycleStage: "RESERVED_DEAL_PENDING" });
    await expect(reserve()).rejects.toThrow("sale or retail reservation");
  }, 30_000);

  it("serializes pre-handoff cancellation against checkout paperwork finalization", async () => {
    const { prisma, reserve, rental, vehicle, customer, actor } = await fixture();
    const booking = await reserve();
    const packet = await prisma.documentLibraryPacket.create({ data: {
      organizationId: rental.organizationId, ownerType: "DEAL", ownerId: rental.id, ownerLabel: customer.displayName,
      packetType: "SALES_DOCUMENTS", workflow: rental.pathway, title: "Cancellation race fixture"
    } });
    const jacket = await prisma.salesDocumentJacket.create({ data: {
      organizationId: rental.organizationId, packetId: packet.id, customerId: customer.id, customerName: customer.displayName,
      dealReference: rental.id, dealNumber: String(rental.dealNumber), pathway: rental.pathway, vin: vehicle.vin,
      vehicleReference: vehicle.vehicleNumber, requirements: [], createdByUserId: actor.id
    } });
    const { executeVehicleUse } = await import("@/server/deal-continuity/service");
    const { updateSalesDocumentJacket } = await import("@/server/sales-documents/service");
    const results = await Promise.allSettled([
      executeVehicleUse(actor, rental.id, { action: "CANCEL", operationKey: randomUUID(), bookingId: booking.id, expectedVersion: 1, reason: "Isolated cancellation race" }),
      updateSalesDocumentJacket(actor, jacket.id, { action: "FINALIZE", revision: jacket.revision })
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const savedBooking = await prisma.vehicleUseBooking.findUniqueOrThrow({ where: { id: booking.id } });
    const savedJacket = await prisma.salesDocumentJacket.findUniqueOrThrow({ where: { id: jacket.id } });
    expect(Number(savedBooking.status === "CANCELLED") + Number(savedJacket.state === "CHECKED_OUT")).toBe(1);
  }, 30_000);

  it("holds an actual checkout and keeps a legacy return on hold after paperwork closes until explicit completion", async () => {
    const { prisma, reserve, sell, rental, vehicle, customer, actor } = await fixture();
    const booking = await reserve();
    const packet = await prisma.documentLibraryPacket.create({ data: { organizationId: booking.organizationId, ownerType: "DEAL", ownerId: rental.id, ownerLabel: customer.displayName, packetType: "SALES_DOCUMENTS", workflow: "daily-rental", title: "Rentals test packet" } });
    const jacket = await prisma.salesDocumentJacket.create({ data: { organizationId: booking.organizationId, packetId: packet.id, customerId: customer.id, customerName: customer.displayName, dealReference: rental.id, dealNumber: String(rental.dealNumber), pathway: rental.pathway, vin: vehicle.vin, vehicleReference: vehicle.vehicleNumber, state: "CHECKED_OUT", requirements: [], createdByUserId: actor.id } });
    const version = { jacketId: jacket.id, finalizedByUserId: actor.id, snapshot: {} };
    await prisma.salesDocumentPacketVersion.create({ data: { ...version, version: 1, phase: "CHECKOUT", disposition: "CHECKED_OUT" } });
    await prisma.vehicleUseBooking.update({ where: { id: booking.id }, data: { status: "CHECKED_OUT", version: 2, agreementJacketId: jacket.id, checkedOutAt: booking.startsAt, departureSnapshot: { observed: true } } });
    await expect(sell()).rejects.toMatchObject({ status: 409, message: expect.stringContaining("Record the actual vehicle return") });
    const legacyReturn = { status: "RETURNED", version: 3, returnedAt: new Date(), returnSnapshot: { observed: true } };
    await expect(prisma.vehicleUseBooking.update({ where: { id: booking.id }, data: legacyReturn })).rejects.toThrow("Invalid vehicle use transition or version");
    const returned = await prisma.$transaction(async transaction => {
      await transaction.$executeRaw`SET LOCAL session_replication_role = replica`;
      return transaction.vehicleUseBooking.update({ where: { id: booking.id }, data: legacyReturn });
    });
    await expect(sell()).rejects.toMatchObject({ status: 409, message: expect.stringContaining("Complete the vehicle return review") });
    await expect(reserve()).rejects.toThrow("prior vehicle return review");
    await prisma.salesDocumentPacketVersion.create({ data: { ...version, version: 2, phase: "RETURN", disposition: "CLOSED" } });
    await expect(sell()).rejects.toMatchObject({ status: 409, message: expect.stringContaining("Complete the vehicle return review") });
    const { executeVehicleUse } = await import("@/server/deal-continuity/service");
    await executeVehicleUse(actor, rental.id, { action: "COMPLETE", operationKey: randomUUID(), bookingId: booking.id, expectedVersion: 3, reason: "Reviewed archived return paperwork", inspected: true, settlementException: true });
    await expect(sell()).resolves.toMatchObject({ status: "SOLD" });
    expect(await prisma.vehicleUseBooking.findUnique({ where: { id: booking.id } })).toMatchObject({
      returnedAt: returned.returnedAt, checkedOutAt: returned.checkedOutAt, departureSnapshot: returned.departureSnapshot,
      returnSnapshot: { observed: true, completion: { settlementException: true, recordedByUserId: actor.id } }
    });
    expect(await prisma.salesDocumentPacketVersion.count({ where: { jacketId: jacket.id } })).toBe(2);
  }, 30_000);

  it("accepts the document organization used by the default dealership configuration", async () => {
    const original = process.env.DOCUMENT_LIBRARY_ORGANIZATION_ID;
    delete process.env.DOCUMENT_LIBRARY_ORGANIZATION_ID;
    try {
      const { prisma, reserve, rental, vehicle, customer, actor } = await fixture();
      const booking = await reserve();
      expect(booking.organizationId).toBe("org-time-motor-sales");
      expect(rental.organizationId).toBe("default-org");
      const packet = await prisma.documentLibraryPacket.create({ data: {
        organizationId: rental.organizationId, ownerType: "DEAL", ownerId: rental.id, ownerLabel: customer.displayName,
        packetType: "SALES_DOCUMENTS", workflow: rental.pathway, title: "Isolated default scope checkout"
      } });
      const jacket = await prisma.salesDocumentJacket.create({ data: {
        organizationId: rental.organizationId, packetId: packet.id, customerId: customer.id, customerName: customer.displayName,
        dealReference: rental.id, dealNumber: String(rental.dealNumber), pathway: rental.pathway, vin: vehicle.vin,
        vehicleReference: vehicle.vehicleNumber, state: "CHECKED_OUT", requirements: [], createdByUserId: actor.id,
        versions: { create: { version: 1, phase: "CHECKOUT", disposition: "CHECKED_OUT", snapshot: {}, finalizedByUserId: actor.id } }
      } });
      await expect(prisma.vehicleUseBooking.update({ where: { id: booking.id }, data: {
        status: "CHECKED_OUT", version: 2, agreementJacketId: jacket.id, checkedOutAt: booking.startsAt, departureSnapshot: { observed: true }
      } })).resolves.toMatchObject({ status: "CHECKED_OUT", agreementJacketId: jacket.id });
    } finally {
      if (original === undefined) delete process.env.DOCUMENT_LIBRARY_ORGANIZATION_ID;
      else process.env.DOCUMENT_LIBRARY_ORGANIZATION_ID = original;
    }
  }, 30_000);
});
