import { beforeEach, describe, expect, it, vi } from "vitest";
import VehicleSaleEntryPage from "@/app/(app)/vehicles/[id]/sale/page";
import { getVehicleJourney } from "@/server/inventory-unit/journey-service";
import { prisma } from "@/server/db/client";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); }, notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: async () => ({ id: "staff" }) }));
vi.mock("@/server/inventory-unit/journey-service", () => ({ getVehicleJourney: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { vehicleRelationship: { findMany: vi.fn() } } }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: async () => [] }) }));
vi.mock("@/server/enterprise-command/vehicle-capabilities", () => ({ evaluateVehicleCapability: vi.fn(() => ({ allowed: true })) }));
vi.mock("@/server/disposition-wholesale/service", () => ({ getDispositionWholesaleWorkspace: async () => ({ cases: [{ id: "case-other", inventoryUnitId: "other" }, { id: "case-current", inventoryUnitId: "unit" }] }) }));

const journey = { vehicle: { id: "vehicle" }, unit: { id: "unit", locationId: "lot" }, access: { inventory: true }, intake: { status: "CONFIRMED" } };
const request = (mode?: string) => VehicleSaleEntryPage({ params: Promise.resolve({ id: "vehicle" }), searchParams: Promise.resolve({ mode }) });
describe("vehicle sale entry", () => {
  beforeEach(() => { vi.mocked(getVehicleJourney).mockResolvedValue(journey as never); vi.mocked(prisma.vehicleRelationship.findMany).mockResolvedValue([{ relationshipType: "DEALERSHIP_OWNED" }] as never); vi.mocked(evaluateVehicleCapability).mockReturnValue({ allowed: true } as never); });
  it("routes ordinary preparation to the shared vehicle details", async () => { await expect(request()).rejects.toThrow("redirect:/vehicles/vehicle/details"); });
  it("opens ordinary details without confirmed intake or an inventory cycle", async () => { vi.mocked(getVehicleJourney).mockResolvedValue({ ...journey, unit: null, intake: { status: "DRAFT" } } as never); await expect(request()).rejects.toThrow("redirect:/vehicles/vehicle/details"); });
  it("requires confirmed intake before starting an as-is sale", async () => { vi.mocked(getVehicleJourney).mockResolvedValue({ ...journey, intake: { status: "DRAFT" } } as never); await expect(request("as-is")).rejects.toThrow("redirect:/vehicles/vehicle/intake"); });
  it("does not offer inventory sale for customer-only ownership", async () => { vi.mocked(prisma.vehicleRelationship.findMany).mockResolvedValue([{ relationshipType: "CUSTOMER_OWNER" }] as never); const page = await request("as-is"); expect(page.type).toBe("section"); });
  it("reuses only this vehicle's existing case and evaluates release permission", async () => { const page = await request("as-is"); expect(page.props.existingCaseId).toBe("case-current"); expect(evaluateVehicleCapability).toHaveBeenCalledWith(expect.objectContaining({ capability: "INVENTORY_RELEASE_MANAGE", locationId: "lot" })); });
  it("leaves starting the review disabled without release permission", async () => { vi.mocked(evaluateVehicleCapability).mockReturnValue({ allowed: false } as never); expect((await request("as-is")).props.canStart).toBe(false); });
});
