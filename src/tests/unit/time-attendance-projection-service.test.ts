import { describe, expect, it, vi } from "vitest";

import { weeklyPeriodForInstant } from "@/server/time-attendance/period";
import { createTimeCardProjectionService } from "@/server/time-attendance/projection-service";

function projectionDatabase() {
  let latest: Record<string, unknown> | null = null;
  const policy = {
    id: "policy-1",
    code: "MN-HOURLY-60-MIN-UNPAID-MEAL",
    name: "Minnesota hourly",
    version: 1,
    status: "ACTIVE",
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    timezone: "America/Chicago",
    workweekStartDay: "SUNDAY",
    overtimeCoverage: "US_FLSA_NONEXEMPT",
    sourceSnapshot: { reviewed: true }
  };
  const assignment = {
    id: "assignment-1",
    staffUserId: "staff-1",
    locationId: "loc-1",
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    policyProfile: policy
  };
  const events = [
    {
      id: "clock-in",
      eventType: "CLOCK_IN",
      occurredAt: new Date("2026-07-23T14:00:00.000Z"),
      recordedAt: new Date("2026-07-23T14:00:01.000Z"),
      createdAt: new Date("2026-07-23T14:00:01.000Z"),
      timezone: "America/Chicago",
      evidence: {},
      correctionOfEventId: null,
      correctedByEventId: null
    },
    {
      id: "clock-out",
      eventType: "CLOCK_OUT",
      occurredAt: new Date("2026-07-23T22:00:00.000Z"),
      recordedAt: new Date("2026-07-23T22:00:01.000Z"),
      createdAt: new Date("2026-07-23T22:00:01.000Z"),
      timezone: "America/Chicago",
      evidence: {},
      correctionOfEventId: null,
      correctedByEventId: null
    }
  ];
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    latest = { id: "card-1", ...data };
    return latest;
  });
  const timeCard = {
    findFirst: vi.fn(async () => latest),
    create
  };
  const database = {
    timeAttendancePolicyAssignment: { findMany: vi.fn(async () => [assignment]) },
    timeAttendanceEvent: { findMany: vi.fn(async () => events) },
    timeAttendanceBreakInterval: { findMany: vi.fn(async () => []) },
    timeAttendancePayPeriodDefinition: { findMany: vi.fn(async () => []) },
    timeOffRequest: { findMany: vi.fn(async () => []) },
    timeCard,
    $transaction: vi.fn(async (work: (tx: { timeCard: typeof timeCard }) => Promise<unknown>) => work({ timeCard }))
  };
  return { create, database, setLatest(value: Record<string, unknown> | null) { latest = value; } };
}

describe("time card projection service", () => {
  it("creates one deterministic persisted version and reuses it when inputs are unchanged", async () => {
    const fake = projectionDatabase();
    const service = createTimeCardProjectionService(fake.database as never);
    const request = {
      organizationId: "org-1",
      staffUserId: "staff-1",
      locationId: "loc-1",
      occurredAt: new Date("2026-07-23T22:00:00.000Z"),
      trigger: "CAPTURE" as const
    };

    const created = await service.project(request);
    const current = await service.project(request);

    expect(created).toMatchObject({ state: "CREATED", cardId: "card-1", cardVersion: 0 });
    expect(current).toMatchObject({ state: "CURRENT", cardId: "card-1", cardVersion: 0 });
    expect(created.checksum).toMatch(/^sha256:/);
    expect(fake.create).toHaveBeenCalledTimes(1);
  });

  it("fails closed when no approved policy assignment applies", async () => {
    const fake = projectionDatabase();
    fake.database.timeAttendancePolicyAssignment.findMany.mockResolvedValue([]);
    const result = await createTimeCardProjectionService(fake.database as never).project({
      organizationId: "org-1",
      staffUserId: "staff-1",
      locationId: "loc-1",
      occurredAt: new Date("2026-07-23T14:00:00.000Z"),
      trigger: "CAPTURE"
    });

    expect(result).toMatchObject({ state: "BLOCKED", cardId: null, payrollReady: false });
    expect(result.reason).toContain("No active approved time policy assignment");
    expect(fake.create).not.toHaveBeenCalled();
  });

  it("does not replace a locked version when source evidence changes", async () => {
    const fake = projectionDatabase();
    fake.setLatest({
      id: "locked-card",
      version: 3,
      status: "LOCKED",
      sourceEventChecksum: "sha256:prior",
      payrollReady: true
    });
    const result = await createTimeCardProjectionService(fake.database as never).project({
      organizationId: "org-1",
      staffUserId: "staff-1",
      locationId: "loc-1",
      occurredAt: new Date("2026-07-23T22:00:00.000Z"),
      trigger: "CORRECTION"
    });

    expect(result).toMatchObject({ state: "BLOCKED", cardId: "locked-card", cardVersion: 3 });
    expect(result.reason).toContain("reopened");
  });
});

describe("workweek period resolution", () => {
  it("keeps a spring-forward instant in the configured local workweek", () => {
    expect(weeklyPeriodForInstant({
      instant: new Date("2026-03-08T08:30:00.000Z"),
      timeZone: "America/Chicago",
      workweekStartDay: "SUNDAY"
    })).toMatchObject({ periodStartKey: "2026-03-08", periodEndKey: "2026-03-14" });
  });

  it("keeps both fall-back instants on the same local date", () => {
    const first = weeklyPeriodForInstant({
      instant: new Date("2026-11-01T06:30:00.000Z"),
      timeZone: "America/Chicago",
      workweekStartDay: "SUNDAY"
    });
    const second = weeklyPeriodForInstant({
      instant: new Date("2026-11-01T07:30:00.000Z"),
      timeZone: "America/Chicago",
      workweekStartDay: "SUNDAY"
    });
    expect(first.periodStartKey).toBe("2026-11-01");
    expect(second.periodStartKey).toBe(first.periodStartKey);
  });
});
