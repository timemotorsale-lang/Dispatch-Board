import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { createPrismaClaimsWorkspaceRepository } from "./prisma-repository";
import { canWorkInsuranceClaims, createInsuranceClaim } from "./service";

type IncidentVehicle = { id: string; vin: string | null; year: number | null; make: string | null; model: string | null; stockNumber: string | null };
type RentalClaimInput = {
  incidentId: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  vehicle: IncidentVehicle;
  kind: "DAMAGE" | "THEFT";
  claimId: string | null;
};

export function canWorkRentalIncidentClaims(actor: AuthenticatedUser, organizationId: string) {
  return organizationId === INITIAL_ORGANIZATION.id && canWorkInsuranceClaims(actor);
}

export async function connectRentalIncidentClaim(db: Prisma.TransactionClient, actor: AuthenticatedUser, input: RentalClaimInput) {
  const { organizationId, customerId, customerName, vehicle, claimId, incidentId, kind } = input;
  if (!canWorkRentalIncidentClaims(actor, organizationId)) throw new SalesDocumentsError("Ask authorized Claims Desk staff to handle this incident.", 403);
  const vehicleMatch = [
    { vehicleId: vehicle.id },
    ...(vehicle.vin ? [{ vehicleId: null, vehicleVin: { equals: vehicle.vin, mode: "insensitive" as const } }] : [])
  ];
  if (claimId) {
    const claim = await db.insuranceClaim.findFirst({
      where: { id: claimId, organizationId, OR: vehicleMatch, AND: [{ OR: [{ customerId }, { customerId: null, customerName: { equals: customerName, mode: "insensitive" } }] }] },
      select: { id: true, version: true }
    });
    if (!claim) throw new SalesDocumentsError("Choose a Claims Desk record for this rental's verified vehicle and customer.", 409);
    const now = new Date();
    const updated = await db.insuranceClaim.updateMany({
      where: { id: claim.id, organizationId, version: claim.version },
      data: { lastActivityAt: now, version: { increment: 1 } }
    });
    if (updated.count !== 1) throw new SalesDocumentsError("The claim changed. Review it in Claims Desk before retrying.", 409);
    await db.insuranceClaimActivity.create({ data: {
      id: randomUUID(), claimId: claim.id, organizationId, actorUserId: actor.id, at: now,
      action: "RENTAL_INCIDENT_LINKED", detail: `Linked rental incident ${incidentId}.`
    } });
    return claim.id;
  }

  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":rental-claim:" + vehicle.id}, 0))`;
  if (await db.insuranceClaim.findFirst({ where: { organizationId, status: "OPEN", OR: vehicleMatch }, select: { id: true } })) {
    throw new SalesDocumentsError("This vehicle already has an open claim. Review it in Claims Desk and link it if it covers this incident.", 409);
  }
  if (!(vehicle.vin || vehicle.make || vehicle.model)) throw new SalesDocumentsError("Complete the verified rental vehicle's identity before starting claim intake.", 409);
  const repository = createPrismaClaimsWorkspaceRepository({ organizationId, prisma: db as never });
  const created = await createInsuranceClaim(actor, {
    customerName, vehicleVin: vehicle.vin, vehicleMake: vehicle.make, vehicleModel: vehicle.model,
    vehicleYear: vehicle.year?.toString(), vehicleStockNumber: vehicle.stockNumber,
    description: kind === "DAMAGE" ? "Rental vehicle damage reported." : "Theft or missing property reported on a rental vehicle."
  }, { repository, rentalIncident: { id: incidentId, customerId, vehicleId: vehicle.id } });
  return created.readModel.claim.id;
}
