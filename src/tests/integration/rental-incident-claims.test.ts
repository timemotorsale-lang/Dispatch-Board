import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidVin } from "@/lib/vin";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";

describe.skipIf(process.env.RUN_RENTAL_INCIDENT_INTEGRATION !== "1")("rental incident and Claims Desk", () => {
  it("reopens a persisted note, incident, task and internal claim after duplicate requests", async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/^rental_incident_test_\d+$/.test(url.searchParams.get("schema") ?? "")) {
      throw new Error("An isolated loopback rental_incident_test schema is required.");
    }
    const organizationId = INITIAL_ORGANIZATION.id;
    if (process.env.DOCUMENT_LIBRARY_ORGANIZATION_ID !== organizationId) throw new Error("Use the Claims Desk organization in the isolated schema.");
    const { prisma } = await import("@/server/db/client");
    const { manageDealOperations, readDealOperations } = await import("@/server/sales-documents/dashboard-operations");
    const fixture = randomUUID();
    const staff: AuthenticatedUser = { id: `staff-${fixture}`, name: "Rental staff", email: `staff-${fixture}@example.test`,
      isActive: true, roles: ["Salesperson"], duties: { all: [], direct: [], roleDefaults: [] } };
    const manager: AuthenticatedUser = { ...staff, id: `manager-${fixture}`, name: "Claims manager", email: `manager-${fixture}@example.test`, roles: ["General Manager"] };
    await prisma.organization.upsert({ where: { id: organizationId }, create: { id: organizationId, code: "RENTAL_INSURANCE_FIXTURE", name: "Rental insurance tests" }, update: {} });
    await prisma.user.createMany({ data: [staff, manager].map(user => ({ id: user.id, name: user.name, email: user.email, passwordHash: "SYNTHETIC" })) });
    const customer = await prisma.customer.create({ data: { organizationId, customerNumber: fixture, displayName: "Rental fixture customer" } });
    const serial = String(parseInt(fixture.slice(0, 8), 16) % 1_000_000).padStart(6, "0");
    const vin = [..."0123456789X"].map(check => `1HGCM826${check}3A${serial}`).find(isValidVin)!;
    const vehicle = await prisma.vehicle.create({ data: { organizationId, vehicleNumber: fixture, make: "Honda", model: "Accord",
      vin, vinState: "VALID", vinValidationSource: "TEST_FIXTURE" } });
    const draft = await prisma.dealDeskDraft.create({ data: { id: fixture, organizationId, ownerUserId: staff.id, customerId: customer.id,
      customerName: customer.displayName, vehicleReference: vehicle.vehicleNumber, pathway: "daily-rental", snapshot: {} } });
    const context = await prisma.dealWorkflowContext.create({ data: { id: fixture, organizationId, draftId: draft.id,
      customerId: customer.id, vehicleId: vehicle.id, createdByUserId: staff.id } });
    const operation = (action: string) => ({ action, draftId: draft.id, draftRevision: draft.revision, operationKey: randomUUID() });
    await manageDealOperations(staff, { ...operation("RENTAL_PROGRESS_NOTE"), reason: " Called " });
    const bookingInput = { ...operation("RENTAL_INCIDENT"), bookingId: fixture, kind: "DAMAGE", reason: "Dent on return" };
    const now = new Date(), startsAt = new Date(now.getTime() - 3600000);
    await prisma.vehicleUseBooking.create({ data: { id: fixture, organizationId, contextId: context.id,
      vehicleId: vehicle.id, startsAt, expectedReturnAt: now, reason: "Synthetic test", createdByUserId: staff.id } });
    await expect(manageDealOperations(staff, bookingInput)).rejects.toMatchObject({ status: 409 });
    const packet = await prisma.documentLibraryPacket.create({ data: { organizationId, ownerType: "DEAL", ownerId: draft.id,
      ownerLabel: customer.displayName, packetType: "TEST_FIXTURE", workflow: draft.pathway, title: "Rental incident fixture" } });
    const agreement = await prisma.salesDocumentJacket.create({ data: { organizationId, packetId: packet.id,
      dealReference: draft.id, dealNumber: String(draft.dealNumber), pathway: draft.pathway, customerId: customer.id,
      customerName: customer.displayName, vehicleReference: vehicle.vehicleNumber, vin, state: "CHECKED_OUT", requirements: [],
      createdByUserId: staff.id, versions: { create: { version: 1, phase: "CHECKOUT", disposition: "CHECKED_OUT",
        snapshot: { fixture: true }, finalizedByUserId: staff.id } } } });
    await prisma.vehicleUseBooking.update({ where: { id: fixture }, data: { status: "CHECKED_OUT", version: 2, checkedOutAt: startsAt,
      agreementJacketId: agreement.id, departureSnapshot: { fixture: true } } });
    const booking = await prisma.vehicleUseBooking.update({ where: { id: fixture }, data: { status: "RETURNED_REVIEW", version: 3,
      returnedAt: now, returnSnapshot: { fixture: true } } });
    const recorded = await Promise.all([manageDealOperations(staff, bookingInput), manageDealOperations(staff, bookingInput)]);
    expect(recorded[0]).toEqual(recorded[1]);
    const activity = (await readDealOperations(staff, { draftId: draft.id })).rentalActivity!;
    expect(activity.notes).toMatchObject([{ text: "Called", author: staff.name }]);
    expect(activity.incidents).toMatchObject([{ kind: "DAMAGE", text: "Dent on return", followUp: { owner: staff.name, status: "NOT_STARTED", completedAt: null } }]);
    const incidentId = activity.incidents[0].id;
    const claimInput = { ...operation("RENTAL_INCIDENT_CLAIM"), incidentId, claimAction: "START" };
    await expect(manageDealOperations(staff, claimInput)).rejects.toMatchObject({ status: 403 });
    const claimResults = await Promise.all([manageDealOperations(manager, claimInput), manageDealOperations(manager, claimInput)]);
    expect(claimResults[0]).toEqual(claimResults[1]);
    const claim = await prisma.insuranceClaim.findFirstOrThrow({ where: { organizationId, vehicleId: vehicle.id } });
    expect(claim).toMatchObject({ customerId: customer.id, status: "OPEN", stage: "INTAKE", carrierName: null, claimNumber: null });
    expect(await prisma.insuranceClaim.count({ where: { organizationId, vehicleId: vehicle.id } })).toBe(1);
    const saved = await prisma.documentLibraryAuditEvent.findUniqueOrThrow({ where: { id: incidentId } });
    const taskId = (saved.metadata as { taskId: string }).taskId;
    await prisma.task.update({ where: { id: taskId }, data: { status: "COMPLETED", completedAt: now } });
    const reopened = await readDealOperations(manager, { draftId: draft.id });
    expect(reopened.rentalActivity?.incidents).toMatchObject([{ claimId: claim.id, followUp: { status: "COMPLETED", completedAt: now.toISOString() } }]);
    const theft = await manageDealOperations(staff, { ...operation("RENTAL_INCIDENT"), bookingId: booking.id, kind: "THEFT", reason: "Catalytic converter missing" }) as { incidentId: string };
    await expect(manageDealOperations(manager, { ...operation("RENTAL_INCIDENT_CLAIM"), incidentId: theft.incidentId, claimAction: "START" })).rejects.toThrow("already has an open claim");
    const link = { ...operation("RENTAL_INCIDENT_CLAIM"), incidentId: theft.incidentId, claimAction: "LINK", claimId: claim.id };
    await expect(manageDealOperations(manager, link)).resolves.toMatchObject({ claimId: claim.id });
    await expect(manageDealOperations(manager, { ...link, operationKey: randomUUID() })).rejects.toThrow("already has a linked claim");
    expect(await prisma.insuranceClaimActivity.count({ where: { claimId: claim.id, action: "RENTAL_INCIDENT_LINKED" } })).toBe(1);
    expect(await prisma.vehicleUseBooking.findUnique({ where: { id: booking.id } })).toEqual(booking);
    expect(await prisma.dealDeskDraft.findUnique({ where: { id: draft.id } })).toEqual(draft);
  }, 30_000);
});
