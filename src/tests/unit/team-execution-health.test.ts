import { StaffDayStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { deriveExecutionHealthCondition } from "@/server/services/team-execution-health";

const base = { status: StaffDayStatus.ACTIVE, started: true, hasReport: false, active: 0, blocked: 0, waiting: 0, readyForReview: 0, claimableCount: 0 };

describe("team execution health conditions", () => {
  it("uses explainable workflow precedence without scores", () => {
    expect(deriveExecutionHealthCondition({ ...base, readyForReview: 1, blocked: 2 })).toBe("READY_FOR_REVIEW");
    expect(deriveExecutionHealthCondition({ ...base, blocked: 2 })).toBe("BLOCKED");
    expect(deriveExecutionHealthCondition({ ...base, waiting: 1 })).toBe("WAITING");
    expect(deriveExecutionHealthCondition({ ...base, active: 2 })).toBe("ACTIVE");
    expect(deriveExecutionHealthCondition({ ...base, claimableCount: 3 })).toBe("NEEDS_ASSIGNMENT");
    expect(deriveExecutionHealthCondition({ ...base, hasReport: true })).toBe("CLOSED");
  });
});
