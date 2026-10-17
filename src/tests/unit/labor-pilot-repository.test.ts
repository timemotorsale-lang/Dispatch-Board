import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createShopExecutionRepository } from "@/server/shop-execution/repository";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/server/enterprise-command/aggregate-mutation", async original => ({ ...await original<typeof import("@/server/enterprise-command/aggregate-mutation")>(), executeAggregateMutation: mocks.execute }));

const tx = {
  repairJob: { findFirst: vi.fn() },
  repairAuthorization: { findFirst: vi.fn() },
  repairEstimateVersion: { findFirst: vi.fn() },
  repairJobLaborClock: { findUnique: vi.fn(), upsert: vi.fn() },
  repairJobLaborEvent: { findFirst: vi.fn() },
  workProcedureVersion: { findFirst: vi.fn() }
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
