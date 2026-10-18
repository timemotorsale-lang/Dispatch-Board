import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createShopExecutionRepository } from "@/server/shop-execution/repository";
import { LIGHT_DUTY_CATALOG_VERSION, LIGHT_DUTY_OPERATIONS } from "@/lib/light-duty-baseline";
import { catalogLaborLineKey } from "@/lib/catalog-job-readiness";
import { catalogScopeDigest } from "@/server/diagnostics/catalog-approval";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/server/enterprise-command/aggregate-mutation", async original => ({ ...await original<typeof import("@/server/enterprise-command/aggregate-mutation")>(), executeAggregateMutation: mocks.execute }));

const tx = {
  repairJob: { findFirst: vi.fn() },
  repairAuthorization: { findFirst: vi.fn() },
  repairEstimateVersion: { findFirst: vi.fn() },
  repairJobLaborClock: { findUnique: vi.fn(), upsert: vi.fn() },
  repairJobLaborEvent: { findFirst: vi.fn() },
  workProcedureVersion: { findFirst: vi.fn() },
  vehiclePolicyVersion: { findFirst: vi.fn() },
  technicianQualification: { findMany: vi.fn() },
  repairPartDemand: { findMany: vi.fn() }
};
const repository = createShopExecutionRepository({} as PrismaClient);
const command = { organizationId: "org-1", subjectId: "job-1" } as Parameters<typeof repository.dispatch>[0];
const dispatch = {} as Parameters<typeof repository.dispatch>[1];
const labor = { eventType: "START", technicianUserId: "tech-1", occurredAt: new Date("2026-10-16T12:00Z"), correctionMinutes: null } as Parameters<typeof repository.labor>[1];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.execute.mockImplementation(async (_database, _command, _topic, mutate) => mutate(tx, 1));
  tx.repairJob.findFirst.mockResolvedValue({ id: "job-1", repairOrderId: "ro-1", authorizationId: "auth-1", authorizedLineKey: "labor-1", estimateVersionId: "estimate-1", dispatches: [{ position: "CURRENT", status: "ACTIVE" }] });
  tx.repairAuthorization.findFirst.mockResolvedValue({ id: "auth-1", disposition: "ACCEPTED", authorizedLineKeys: ["labor-1"] });
  tx.repairEstimateVersion.findFirst.mockResolvedValue({ id: "estimate-1" });
});

describe("pilot transactional execution guards", () => {
  function expandedBatteryJob() {
    const operation = LIGHT_DUTY_OPERATIONS.find(item => item.label === "Replace high-voltage battery assembly")!;
    const key = catalogLaborLineKey(operation.id);
    tx.repairJob.findFirst.mockResolvedValue({ id: "job-1", repairOrderId: "ro-1", authorizationId: "auth-1", authorizedLineKey: key, estimateVersionId: "estimate-1", requiredSkills: [], requiredCertifications: [], bayRequirements: [], toolRequirements: [], dispatches: [{ position: "CURRENT", status: "ACTIVE", technicianUserId: "tech-1" }] });
    tx.repairAuthorization.findFirst.mockResolvedValue({ id: "auth-1", disposition: "ACCEPTED", authorizedLineKeys: [key] });
    tx.vehiclePolicyVersion.findFirst.mockResolvedValue({ id: "policy-1", createdByUserId: "author", approvedByUserId: "reviewer", approvedAt: new Date("2026-10-15"), activatedAt: new Date("2026-10-16"), configuration: { version: 1, catalogVersion: LIGHT_DUTY_CATALOG_VERSION, systemId: "ev", scopeDigest: catalogScopeDigest("ev"), enabled: true, reviewReference: "Recorded EV scope review", capabilityReference: "Recorded EV capability review" } });
  }

  it("rechecks catalog approval before dispatch and every clock start/resume", async () => {
    expandedBatteryJob();
    tx.vehiclePolicyVersion.findFirst.mockResolvedValue(null);
    await expect(repository.dispatch(command, dispatch, new Date())).rejects.toThrow("on hold");
    for (const eventType of ["START", "RESUME"] as const) await expect(repository.labor(command, { ...labor, eventType })).rejects.toThrow("on hold");
    expect(tx.repairJobLaborClock.upsert).not.toHaveBeenCalled();
    expect(tx.workProcedureVersion.findFirst).not.toHaveBeenCalled();
  });

  it("does not trust empty stored requirements when starting expanded work", async () => {
    expandedBatteryJob();
    tx.technicianQualification.findMany.mockResolvedValue([]);
    await expect(repository.labor(command, labor)).rejects.toThrow();
    expect(tx.technicianQualification.findMany).toHaveBeenCalled();
    expect(tx.repairJobLaborClock.upsert).not.toHaveBeenCalled();
  });

  it("holds expired qualifications and absent or released catalog parts before starting", async () => {
    expandedBatteryJob();
    const qualifications = [{ code: "CATALOG_EV", type: "SKILL", effectiveFrom: new Date(0), effectiveTo: null }, { code: "HV_PLATFORM_QUALIFIED", type: "CERTIFICATION", effectiveFrom: new Date(0), effectiveTo: null }];
    tx.technicianQualification.findMany.mockResolvedValue(qualifications.map(item => ({ ...item, effectiveTo: new Date(0) })));
    await expect(repository.labor(command, labor)).rejects.toThrow("Current technician qualifications");
    tx.technicianQualification.findMany.mockResolvedValue(qualifications);
    for (const demands of [[], [{ status: "RELEASED", quantityRequired: 1, quantityReserved: 1 }], [{ status: "REQUESTED", quantityRequired: 2, quantityReserved: 1 }]]) {
      tx.repairPartDemand.findMany.mockResolvedValue(demands);
      await expect(repository.labor(command, labor)).rejects.toThrow("fully reserved");
    }
    expect(tx.repairJobLaborClock.upsert).not.toHaveBeenCalled();
  });
  it("refuses a revoked approval before dispatch procedure lookup", async () => {
    tx.repairAuthorization.findFirst.mockResolvedValue({ id: "auth-2", disposition: "REVOKED", authorizedLineKeys: [] });
    await expect(repository.dispatch(command, dispatch, new Date())).rejects.toThrow("authorization");
    expect(tx.workProcedureVersion.findFirst).not.toHaveBeenCalled();
    expect(tx.repairAuthorization.findFirst).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
  });

  it("refuses an earlier approval after an estimate revision at dispatch and clock start", async () => {
    tx.repairEstimateVersion.findFirst.mockResolvedValue({ id: "estimate-2" });
    await expect(repository.dispatch(command, dispatch, new Date())).rejects.toThrow("estimate was revised");
    await expect(repository.labor(command, labor)).rejects.toThrow("estimate was revised");
    expect(tx.repairJobLaborClock.upsert).not.toHaveBeenCalled();
  });

  it("refuses reverse chronology before updating a measured clock", async () => {
    tx.repairJobLaborClock.findUnique.mockResolvedValue({ accumulatedMinutes: 10 });
    tx.repairJobLaborEvent.findFirst.mockResolvedValue({ occurredAt: new Date("2026-10-16T13:00Z") });
    await expect(repository.labor(command, labor)).rejects.toThrow("precede");
    expect(tx.repairJobLaborClock.upsert).not.toHaveBeenCalled();
  });
});
