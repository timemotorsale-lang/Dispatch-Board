import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { connectRentalIncidentClaim } from "@/server/claims-workspace/rental-incident";
import { createInMemoryClaimsWorkspaceRepository } from "@/server/claims-workspace/service";

const mocks = vi.hoisted(() => ({ createRepository: vi.fn() }));
vi.mock("@/server/claims-workspace/prisma-repository", () => ({ createPrismaClaimsWorkspaceRepository: mocks.createRepository }));

const staff: AuthenticatedUser = { id: "employee", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Salesperson"], duties: { all: [], direct: [], roleDefaults: [] } };
const manager = { ...staff, roles: ["General Manager"] };
const incident = { incidentId: "incident-one", organizationId: INITIAL_ORGANIZATION.id, customerId: "customer-one", customerName: "Rental Customer",
  vehicle: { id: "vehicle-one", vin: "1HGCM82633A004352", make: "Honda", model: "Accord", year: 2003, stockNumber: "stock-one" },
  kind: "THEFT" as const, claimId: null };
const db = {
  $executeRaw: vi.fn(),
  insuranceClaim: { findFirst: vi.fn(), updateMany: vi.fn() },
  insuranceClaimActivity: { create: vi.fn() }
};
const transaction = db as unknown as Prisma.TransactionClient;

describe("rental incident claim intake", () => {
  beforeEach(() => vi.resetAllMocks());

  it("creates an internal intake record with verified identities and no carrier submission fields", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    mocks.createRepository.mockReturnValue(repository);
    db.insuranceClaim.findFirst.mockResolvedValue(null);
    const claimId = await connectRentalIncidentClaim(transaction, manager, incident);
    const persisted = await repository.findClaimById(claimId);
    expect(persisted?.claim).toMatchObject({ stage: "INTAKE", status: "OPEN", customerId: incident.customerId,
      vehicleId: incident.vehicle.id, vehicleVin: incident.vehicle.vin, carrierName: "", claimNumber: "",
      description: "Theft or missing property reported on a rental vehicle." });
    expect(persisted?.activities).toEqual(expect.arrayContaining([expect.objectContaining({ action: "CLAIM_CREATED", detail: expect.stringContaining(incident.incidentId) })]));
    expect(mocks.createRepository).toHaveBeenCalledWith({ organizationId: incident.organizationId, prisma: transaction });
  });

  it("blocks users outside Claims Desk and prevents duplicate intake for a vehicle with an open claim", async () => {
    await expect(connectRentalIncidentClaim(transaction, staff, incident)).rejects.toMatchObject({ status: 403 });
    await expect(connectRentalIncidentClaim(transaction, manager, { ...incident, organizationId: "outside-claims-desk" })).rejects.toMatchObject({ status: 403 });
    expect(db.insuranceClaim.findFirst).not.toHaveBeenCalled();
    db.insuranceClaim.findFirst.mockResolvedValue({ id: "existing" });
    await expect(connectRentalIncidentClaim(transaction, manager, incident)).rejects.toThrow("already has an open claim");
    expect(mocks.createRepository).not.toHaveBeenCalled();
  });

  it("rejects a mismatched existing claim and audits a verified link without editing claim identity", async () => {
    const input = { ...incident, claimId: "existing" };
    db.insuranceClaim.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "existing", version: 3 });
    await expect(connectRentalIncidentClaim(transaction, manager, input)).rejects.toMatchObject({ status: 409 });
    expect(db.insuranceClaimActivity.create).not.toHaveBeenCalled();
    db.insuranceClaim.updateMany.mockResolvedValue({ count: 1 });
    await expect(connectRentalIncidentClaim(transaction, manager, input)).resolves.toBe("existing");
    expect(db.insuranceClaim.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({
      id: "existing", organizationId: incident.organizationId, OR: expect.arrayContaining([{ vehicleId: incident.vehicle.id }])
    }) }));
    expect(db.insuranceClaim.updateMany).toHaveBeenCalledWith({
      where: { id: "existing", organizationId: incident.organizationId, version: 3 },
      data: { lastActivityAt: expect.any(Date), version: { increment: 1 } }
    });
    expect(db.insuranceClaimActivity.create).toHaveBeenCalledWith({ data: expect.objectContaining({ claimId: "existing", action: "RENTAL_INCIDENT_LINKED", detail: expect.stringContaining(incident.incidentId) }) });
  });
});
