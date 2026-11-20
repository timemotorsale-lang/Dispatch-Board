import { beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getPersonalJobLabor } from "@/server/time-attendance/personal-job-labor";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listCapabilityGrants: vi.fn(),
  findLocations: vi.fn(),
  findClocks: vi.fn(),
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/db/client", () => ({
  prisma: {
    location: { findMany: mocks.findLocations },
    repairJobLaborClock: { findMany: mocks.findClocks },
  },
}));
vi.mock("@/server/enterprise-command/repository", () => ({
  createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.listCapabilityGrants }),
}));

const actor = {
  id: "employee",
  isActive: true,
  roles: ["Mechanic"],
  duties: { all: [], direct: [], roleDefaults: [] },
};
const eventAt = new Date("2026-11-20T12:00:00Z");
const deny = (capability: string, locationId: string | null) => ({
  capability, locationId, effect: "DENY", constraints: null, validFrom: new Date(0), validTo: null,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue(actor);
  mocks.listCapabilityGrants.mockResolvedValue([]);
  mocks.findLocations.mockResolvedValue([{ id: "allowed" }, { id: "repair-denied" }, { id: "time-denied" }]);
});

describe("personal repair job labor", () => {
  it("does not read labor without an active session and self-service permission", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    expect(await getPersonalJobLabor()).toBeNull();
    expect(mocks.listCapabilityGrants).not.toHaveBeenCalled();

    mocks.listCapabilityGrants.mockResolvedValue([deny("TIME_SELF_SERVICE", null)]);
    expect(await getPersonalJobLabor()).toBeNull();
    expect(mocks.findLocations).not.toHaveBeenCalled();
    expect(mocks.findClocks).not.toHaveBeenCalled();
  });

  it("bounds the query to authorized locations and the current employee's clocks and events", async () => {
    mocks.listCapabilityGrants.mockResolvedValue([
      deny("REPAIR_ORDER_VIEW", "repair-denied"),
      deny("TIME_SELF_SERVICE", "time-denied"),
    ]);
    mocks.findClocks.mockResolvedValue(Array.from({ length: 11 }, (_, index) => ({
      state: "RUNNING",
      accumulatedMinutes: 25,
      repairJob: {
        id: `job-${index}`,
        jobNumber: `J${index}`,
        description: "Diagnostic check",
        status: "IN_PROGRESS",
        repairOrder: { id: "order", repairOrderNumber: "RO-1" },
        dispatches: [{ id: "dispatch" }],
        laborEvents: [{ occurredAt: eventAt }],
      },
    })));

    const labor = await getPersonalJobLabor();
    const organizationId = INITIAL_ORGANIZATION.id;
    const ownLabor = { organizationId, technicianUserId: actor.id };
    expect(mocks.listCapabilityGrants).toHaveBeenCalledWith(actor.id, organizationId);
    expect(mocks.findClocks).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        ...ownLabor,
        repairJob: { organizationId, repairOrder: { organizationId, locationId: { in: ["allowed"] } } },
      },
      take: 11,
      select: expect.objectContaining({
        repairJob: { select: expect.objectContaining({
          laborEvents: expect.objectContaining({ where: ownLabor, take: 1 }),
          dispatches: expect.objectContaining({ where: ownLabor, take: 1 }),
        }) },
      }),
    }));
    expect(labor?.status).toBe("available");
    if (labor?.status !== "available") throw new Error("Expected personal labor rows.");
    expect(labor.hasMore).toBe(true);
    expect(labor.jobs).toHaveLength(10);
    expect(labor.jobs[0]).toMatchObject({
      href: "/vehicles/repair-jobs/job-0/workbench",
      clockState: "RUNNING",
      recordedMinutes: 25,
      lastEventAt: eventAt.toISOString(),
    });
  });
});
