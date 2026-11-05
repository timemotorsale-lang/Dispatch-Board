import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { contextFor } from "./service";
import { dealOrganization, dealVehicle, dealDocumentOrganization } from "./identities";
import { requireSalesDocumentsUser, archiveGeneratedSalesPacket, readArchivedSalesPacket, getSalesDocumentJacket, updateSalesDocumentJacket } from "@/server/sales-documents/service";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { generateUnifiedCrmContractPacket } from "@/server/services/unified-crm-contract-packet-service";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { createManualTask } from "@/server/services/task-create-service";
import { createTaskCreateRepository } from "@/server/repositories/task-create-repository";
import { chicagoDate } from "@/lib/deal-dashboard";
import { DRIVE_PHOTOS, DRIVE_RETURN_PHOTOS, driveAgreementContent, driveReadiness, driveReturnFacts, TEST_DRIVE_TIMEZONE } from "@/lib/test-drive-workflow";
import { testDriveDeadline } from "@/lib/test-drive-form-packet";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const fail = (message: string): never => { throw new SalesDocumentsError(message, 409); };

function evidenceIds(raw: unknown, prefix: string) {
  const files = object(raw);
  return (prefix === "return" ? DRIVE_RETURN_PHOTOS : DRIVE_PHOTOS).map(view => String(files[`${prefix}-${view}`] ?? ""));
}

export async function readTestDrive(actor: AuthenticatedUser | null, id: string) {
  const context = await contextFor(actor, id);
  if (context.draft.pathway !== "test-drive" && object(context.draft.snapshot)["desk:assignmentPathway"] !== "test-drive") fail("Open the original test-drive pathway.");
  const vehicle = context.vehicleId ? await dealVehicle(actor, context.vehicleId) : null;
  const currentContent = vehicle ? driveAgreementContent(object(context.draft.snapshot)["test-drive:facts"], context.customerId, vehicle.vin) : "";
  const recorded = context.bookings.find(row => ["CHECKED_OUT", "RETURNED_REVIEW", "RETURNED"].includes(row.status));
  const event = await prisma.dealContinuityEvent.findFirst({ where: { contextId: id, organizationId: dealOrganization(), action: "TD_AGREEMENT", result: { path: [recorded?.agreementJacketId ? "jacketId" : "fingerprint"], equals: recorded?.agreementJacketId ?? hash(currentContent) } }, orderBy: { occurredAt: "desc" } }) ?? await prisma.dealContinuityEvent.findFirst({ where: { contextId: id, organizationId: dealOrganization(), action: "TD_AGREEMENT" }, orderBy: { occurredAt: "desc" } });
  const agreement = object(event?.result);
  const jacketId = typeof agreement.jacketId === "string" ? agreement.jacketId : recorded?.agreementJacketId;
  const jacket = jacketId ? await getSalesDocumentJacket(actor, jacketId) : null;
  const signedId = String(object(object(context.draft.snapshot)["test-drive:guidedEvidence"]).signed ?? "");
  const signedCurrent = Boolean(event && jacket && signedId && await prisma.documentLibraryDocument.findFirst({ where: { id: signedId, ownerId: jacket.id, organizationId: dealDocumentOrganization(), status: "ACCEPTED", source: "MANUAL_UPLOAD", archivedAt: null, createdAt: { gte: event.occurredAt }, classificationSnapshot: { path: ["signed"], equals: true } } }));
  return { bookings: context.bookings, currentContent, signedCurrent, suggestedOdometer: vehicle ? (await prisma.vehicleOdometerObservation.findFirst({ where: { organizationId: dealOrganization(), vehicleId: vehicle.id, status: "ACCEPTED" }, orderBy: { observedAt: "desc" }, select: { reading: true } }))?.reading ?? null : null, agreement: event ? { ...agreement, packet: await readArchivedSalesPacket(actor, String(agreement.packetId)) } : null, jacket,
    agreementCurrent: Boolean(event && vehicle && agreement.fingerprint === hash(driveAgreementContent(object(context.draft.snapshot)["test-drive:facts"], context.customerId, vehicle.vin))),
    events: await prisma.dealContinuityEvent.findMany({ where: { contextId: id, organizationId: dealOrganization(), action: { startsWith: "TD_" } }, orderBy: { occurredAt: "desc" }, take: 30 }) };
}

export async function executeTestDrive(actor: AuthenticatedUser | null, id: string, raw: Record<string, unknown>) {
  const user = requireSalesDocumentsUser(actor), organizationId = dealOrganization();
  const action = String(raw.action);
  if (!["GENERATE", "RELEASE", "RETURN", "RESOLVE_EXCEPTION"].includes(action)) throw new SalesDocumentsError("Choose a supported test-drive action.");
  const key = String(raw.operationKey ?? "");
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(key)) throw new SalesDocumentsError("A stable request reference is required.");
  const requestHash = hash(JSON.stringify({ actor: user.id, id, ...raw }));
  return prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":operation:" + key}, 0))`;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":deal-context:" + id}, 0))`;
    const context = await contextFor(actor, id, db);
    const snapshot = object(context.draft.snapshot);
    if (context.draft.pathway !== "test-drive" && (!(["RETURN", "RESOLVE_EXCEPTION"].includes(action)) || snapshot["desk:assignmentPathway"] !== "test-drive")) fail("Open the original test-drive pathway.");
    const prior = await db.dealContinuityEvent.findUnique({ where: { organizationId_operationKey: { organizationId, operationKey: key } } });
    if (prior) {
      if (prior.contextId !== id || prior.requestHash !== requestHash) fail("This request reference belongs to different work. Refresh before retrying.");
      return { duplicate: true, result: prior.result };
    }
    if (!context.vehicleId) fail("Choose the shared customer and vehicle first.");
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":" + context.vehicleId}, 0))`;
    const vehicle = await dealVehicle(actor, context.vehicleId!, db);
    const facts = object(snapshot["test-drive:facts"]);
    const fingerprint = hash(driveAgreementContent(facts, context.customerId, vehicle.vin));
    // Generation reads and validates the saved facts under the context lock.
    // Only physical release needs an exact match to the staff member's reviewed screen.
    if (action === "RELEASE" && raw.expectedFingerprint !== fingerprint) fail("The saved details changed in another window. Refresh status and review the agreement before continuing.");
    const readiness = driveReadiness(facts, Boolean(context.customerId), vehicle.vin);
    if (action !== "GENERATE") {
      const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
      assertVehicleCapability({ actor: user, capability: "COMMERCIAL_HANDOFF_MANAGE", grants, locationId: vehicle.locationId, now: new Date() });
    }
    let result: Record<string, unknown>;
    let booking = context.bookings.find(row => ["CHECKED_OUT", "RESERVED", "RETURNED_REVIEW"].includes(row.status)) ?? context.bookings[0];
    if (action === "GENERATE") {
      if (context.bookings.some(row => ["CHECKED_OUT", "RETURNED", "RETURNED_REVIEW"].includes(row.status))) fail("This drive has departure history. Use the saved agreement; start a new test drive for another release.");
      if (!readiness.verified) fail(readiness.issue?.message ?? "Complete Driver & Vehicle and Verify first.");
      const previous = await db.dealContinuityEvent.findFirst({ where: { organizationId, contextId: id, action: "TD_AGREEMENT", result: { path: ["fingerprint"], equals: fingerprint } } });
      if (previous) return { duplicate: true, result: previous.result };
      // Stable jacket reference also recovers a completed archive after an interrupted response.
      const baseReference = `td-${hash(id + context.customerId + vehicle.vin)}`;
      const preserved = await db.salesDocumentJacket.findFirst({ where: { organizationId: dealDocumentOrganization(), dealReference: baseReference }, select: { state: true } });
      const reference = preserved && ["CHECKED_OUT", "CLOSED", "DELIVERED_FUNDING_PENDING", "UNWIND_PENDING"].includes(preserved.state) ? `td-${hash(baseReference + fingerprint)}` : baseReference;
      const recovered = await db.salesDocumentGeneratedPacket.findFirst({ where: { jacket: { organizationId: dealDocumentOrganization(), dealReference: reference }, payload: { path: ["testDriveFingerprint"], equals: fingerprint } }, orderBy: { createdAt: "desc" } });
      const input = { pathway: "test-drive", packetType: "TEST_DRIVE" as const, jacketReference: reference, customerId: context.customerId, customerName: context.draft.customerName, dealNumber: String(context.draft.dealNumber), vehicleReference: context.draft.vehicleReference, testDrive: readiness.facts,
        vehicle: { vin: vehicle.vin, stockNumber: vehicle.stockNumber, year: vehicle.year, make: vehicle.make, model: vehicle.model, mileage: String(readiness.facts.departureMileage) } };
      const generatedPacket = recovered ? null : await generateUnifiedCrmContractPacket(user, input);
      const packet = recovered ? object(recovered.payload) : await archiveGeneratedSalesPacket(user, input, { ...generatedPacket!, testDriveFingerprint: fingerprint } as typeof generatedPacket & { testDriveFingerprint: string });
      result = { fingerprint, packetId: packet.packetId, jacketId: packet.jacketId };
    } else if (action === "RELEASE") {
      if (["ARCHIVED", "LOST", "CANCELLED"].includes(context.draft.status)) fail("Reopen the inactive deal before release.");
      if (context.bookings.some(row => ["CHECKED_OUT", "RETURNED", "RETURNED_REVIEW"].includes(row.status))) fail("Departure is already recorded. Refresh the drive status.");
      const legacyNote = String(raw.legacyNote ?? "").trim();
      if (snapshot["test-drive:testDriveStarted"] === true && !context.bookings.length && (raw.legacyNotReleased !== true || legacyNote.length < 10 || legacyNote.length > 1000)) fail("This legacy draft says started without a custody record. Confirm no actual departure occurred and record the reconciliation reason before a new release.");
      if (!readiness.verified) fail(readiness.issue?.message ?? "Complete driver and vehicle checks.");
      if (!vehicle.eligibleForUse) fail("This vehicle is not available for release. Review its readiness.");
      if (raw.physicalHandover !== true || raw.keysVerified !== true) fail("Confirm physical vehicle and key handover.");
      const departureAt = new Date(readiness.facts.departureAt), due = new Date(testDriveDeadline(readiness.facts));
      if (departureAt.getTime() > Date.now() + 60000 || due.getTime() <= Date.now()) fail("Confirm an actual departure time with an expected return still ahead. Regenerate and sign if the agreed window changes.");
      const others = await db.vehicleUseBooking.findMany({ where: { organizationId, vehicleId: context.vehicleId!, contextId: { not: id }, status: { in: ["CHECKED_OUT", "RESERVED", "RETURNED_REVIEW"] } } });
      if (others.some(row => row.status !== "RESERVED" || row.startsAt < due && row.expectedReturnAt > departureAt)) fail("This vehicle is already out, held for review or reserved for this time.");
      const generated = await db.dealContinuityEvent.findFirst({ where: { organizationId, contextId: id, action: "TD_AGREEMENT", result: { path: ["fingerprint"], equals: fingerprint } }, orderBy: { occurredAt: "desc" } });
      if (!generated) fail("The agreement no longer matches these facts. Generate and sign the updated agreement.");
      const jacketId = String(object(generated!.result).jacketId);
      const jacket = await db.salesDocumentJacket.findFirst({ where: { id: jacketId, organizationId: dealDocumentOrganization(), customerId: context.customerId, vin: vehicle.vin, pathway: "test-drive" } });
      if (!jacket) fail("The agreement must match the saved customer and vehicle.");
      const docs = await db.documentLibraryDocument.findMany({ where: { organizationId: jacket!.organizationId, packetLinks: { some: { packetId: jacket!.packetId } }, archivedAt: null } });
      const proof = object(snapshot["test-drive:guidedEvidence"]);
      const ids = [...evidenceIds(proof, "td"), String(proof.license ?? ""), String(proof.insurance ?? ""), String(proof.signed ?? "")];
      const types = [...DRIVE_PHOTOS.map(() => "release-condition"), "driver-license", "insurance-proof", "signed-agreement"];
      if (new Set(ids).size !== ids.length || ids.some((documentId, index) => !documentId || !docs.some(doc => doc.id === documentId && doc.documentType === types[index] && doc.status === "ACCEPTED" && doc.source !== "GENERATED"))) fail("Upload and review the signed agreement, license, coverage and all five release photos.");
      const signed = docs.find(doc => doc.id === proof.signed);
      if (!signed || object(signed.classificationSnapshot).signed !== true || signed.createdAt < generated!.occurredAt) fail("Upload and verify a signed copy of the current agreement.");
      // Existing document finalization preserves evidence bytes and staff audit history.
      if (jacket!.state !== "CHECKED_OUT") await updateSalesDocumentJacket(user, jacketId, { action: "FINALIZE", revision: jacket!.revision }, db);
      else {
        const finalized = await db.salesDocumentPacketVersion.findFirst({ where: { jacketId, phase: "CHECKOUT" }, orderBy: { version: "desc" }, select: { snapshot: true } });
        const included = object(finalized?.snapshot).documents;
        if (!Array.isArray(included) || !included.some(doc => object(doc).id === proof.signed && object(doc).signed === true)) fail("The current signed agreement is not in the preserved checkout packet. Generate and sign a corrected agreement before release.");
      }
      const latest = await db.vehicleOdometerObservation.findFirst({ where: { organizationId, vehicleId: context.vehicleId!, status: "ACCEPTED" }, orderBy: { observedAt: "desc" } });
      if (latest && (readiness.facts.departureMileage < latest.reading || departureAt < latest.observedAt)) fail("Recheck departure mileage and time against the vehicle's latest observation.");
      const departureSnapshot = json({ guided: true, legacyReconciliation: snapshot["test-drive:testDriveStarted"] === true ? { noPriorDepartureConfirmed: true, note: legacyNote, actorUserId: user.id } : null, odometer: readiness.facts.departureMileage, fuel: readiness.facts.fuelOut, condition: readiness.facts.departureCondition, recipient: context.draft.customerName, keysVerified: true, physicalHandover: true, driverVerified: true, insuranceVerified: true, facts: readiness.facts, evidence: ids, timezone: TEST_DRIVE_TIMEZONE });
      booking = booking?.status === "RESERVED" ? await db.vehicleUseBooking.update({ where: { id: booking.id }, data: { status: "CHECKED_OUT", checkedOutAt: departureAt, startsAt: departureAt, expectedReturnAt: due, agreementJacketId: jacketId, departureSnapshot, version: { increment: 1 } } }) : await db.vehicleUseBooking.create({ data: { id: randomUUID(), organizationId, contextId: id, vehicleId: context.vehicleId!, status: "CHECKED_OUT", startsAt: departureAt, checkedOutAt: departureAt, expectedReturnAt: due, agreementJacketId: jacketId, departureSnapshot, reason: "Test-drive vehicle and keys released", createdByUserId: user.id } });
      const task = await createManualTask(user, { assignedUserId: user.id, title: `Test-drive return · ${context.draft.dealNumber}`, description: "Confirm actual return, mileage, fuel, condition and keys.", dueAt: due.toISOString(), boardDate: chicagoDate(due)!, customerReference: context.draft.customerName, vehicleReference: context.draft.vehicleReference, status: "NOT_STARTED", priority: "MEDIUM", requiresManagerApproval: false, workflowArea: "SALES" }, createTaskCreateRepository(db));
      const created = await db.task.findUniqueOrThrow({ where: { id: task.id }, select: { templateSnapshot: true } });
      await db.task.update({ where: { id: task.id }, data: { customerId: context.customerId, vehicleId: context.vehicleId, templateSnapshot: json({ ...object(created.templateSnapshot), testDriveBookingId: booking.id, dealDashboard: { version: 1, organizationId: dealDocumentOrganization(), draftId: context.draftId, jacketId } }) } });
      await recordCustody(db, user.id, organizationId, context.customerId, vehicle.locationId, booking, "CHECK_OUT", departureAt, readiness.facts.departureMileage);
      result = { bookingId: booking.id, status: booking.status, version: booking.version };
    } else {
      if (!booking || booking.id !== raw.bookingId || booking.version !== raw.expectedVersion) fail("This assignment changed. Refresh its status before continuing; your entries remain saved.");
      if (action === "RESOLVE_EXCEPTION") {
        if (booking!.status !== "RETURNED_REVIEW") fail("This drive has no unresolved return hold.");
        const note = String(raw.note ?? "").trim();
        if (note.length < 10 || note.length > 1000 || raw.keysVerified !== true) fail("Confirm all keys accounted for and describe the completed resolution in 10–1000 characters.");
        booking = await db.vehicleUseBooking.update({ where: { id: booking!.id }, data: { status: "RETURNED", version: { increment: 1 }, returnSnapshot: json({ ...object(booking!.returnSnapshot), resolution: { note, actorUserId: user.id, at: new Date().toISOString(), keysVerified: true } }) } });
      } else {
        if (booking!.status !== "CHECKED_OUT" || !booking!.checkedOutAt) fail("Record return only for an active drive.");
        const data = driveReturnFacts(object(raw.facts), Number(object(booking!.departureSnapshot).odometer), booking!.checkedOutAt!);
        const ids = evidenceIds(raw.evidence, "return");
        const docs = await db.documentLibraryDocument.findMany({ where: { organizationId: dealDocumentOrganization(), id: { in: ids }, ownerId: booking!.agreementJacketId!, status: "ACCEPTED", source: "MANUAL_UPLOAD", archivedAt: null } });
        if (new Set(ids).size !== ids.length || ids.some(documentId => !documentId || !docs.some(doc => doc.id === documentId && doc.documentType === "return-condition" && doc.createdAt >= booking!.checkedOutAt!))) fail("Upload and review all five return photos before completing receiving.");
        const latest = await db.vehicleOdometerObservation.findFirst({ where: { organizationId, vehicleId: context.vehicleId!, status: "ACCEPTED" }, orderBy: { observedAt: "desc" } });
        if (latest && (data.mileage < latest.reading || data.returnedAt < latest.observedAt)) fail("Recheck return mileage and time against the latest vehicle observation.");
        booking = await db.vehicleUseBooking.update({ where: { id: booking!.id }, data: { status: data.exception ? "RETURNED_REVIEW" : "RETURNED", returnedAt: data.returnedAt, version: { increment: 1 }, returnSnapshot: json({ odometer: data.mileage, fuel: data.fuel, condition: data.condition, recipient: data.recipient, keysVerified: data.keysReturned, exception: data.exception, note: data.note, evidence: ids }) } });
        await recordCustody(db, user.id, organizationId, context.customerId, vehicle.locationId, booking, "CHECK_IN", data.returnedAt, data.mileage);
      }
      await db.task.updateMany({ where: { templateSnapshot: { path: ["testDriveBookingId"], equals: booking!.id }, status: { not: "COMPLETED" } }, data: booking!.status === "RETURNED_REVIEW" ? { priority: "HIGH", nextAction: "Resolve test-drive return exception" } : { status: "COMPLETED", completedAt: new Date() } });
      result = { bookingId: booking!.id, status: booking!.status, version: booking!.version };
    }
    await db.dealContinuityEvent.create({ data: { id: randomUUID(), organizationId, contextId: id, bookingId: action === "GENERATE" ? null : booking!.id, operationKey: key, requestHash, action: action === "GENERATE" ? "TD_AGREEMENT" : `TD_${action}`, actorUserId: user.id, result: json(result) } });
    return { duplicate: false, result };
  }, { timeout: action === "GENERATE" ? 120000 : 30000 });
}

async function recordCustody(db: Prisma.TransactionClient, actorId: string, organizationId: string, customerId: string, locationId: string | null, booking: { id: string; vehicleId: string }, eventType: "CHECK_OUT" | "CHECK_IN", at: Date, mileage: number) {
  await db.vehicleCustodyEvent.create({ data: { organizationId, vehicleId: booking.vehicleId, locationId, eventType, custodianType: eventType === "CHECK_OUT" ? "CUSTOMER" : "DEALERSHIP", custodianId: eventType === "CHECK_OUT" ? customerId : null, occurredAt: at, sourceCode: "TEST_DRIVE", sourceReference: booking.id, reason: "Guided test-drive checkout / return", recordedByUserId: actorId } });
  await db.vehicleOdometerObservation.create({ data: { organizationId, vehicleId: booking.vehicleId, reading: mileage, unit: "MILES", observedAt: at, sourceCode: "TEST_DRIVE", sourceReference: booking.id, status: "ACCEPTED", recordedByUserId: actorId } });
}
