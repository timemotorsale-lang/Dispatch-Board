import { describe, expect, it } from "vitest";

import {
  recommendAssignment,
  type RecommendationCandidate
} from "@/server/services/assignment-recommendation";

const candidates: RecommendationCandidate[] = [
  {
    userId: "user-role",
    userName: "Bailey",
    isActive: true,
    roleIds: ["role-sales"],
    directDutyIds: [],
    workflowAreas: ["SALES"]
  },
  {
    userId: "user-duty",
    userName: "Alex",
    isActive: true,
    roleIds: [],
    directDutyIds: ["duty-leads"],
    workflowAreas: ["SALES"]
  }
];

describe("assignment recommendation", () => {
  it("uses the ordered rule path and stops at a direct duty match", () => {
    expect(
      recommendAssignment({
        dutyId: "duty-leads",
        roleId: "role-sales",
        workflowArea: "SALES",
        candidates
      })
    ).toMatchObject({
      recommendedUserId: "user-duty",
      reasonCode: "DIRECT_DUTY_MATCH",
      reasonPath: ["Checked direct user duty match"],
      reasonText: "Recommended because this user has a direct duty match.",
      reviewNeeded: false
    });
  });

  it("falls through role, owner, and workflow rules in order", () => {
    expect(recommendAssignment({ roleId: "role-sales", candidates }).reasonCode).toBe("ROLE_MATCH");
    expect(
      recommendAssignment({ templateOwnerUserId: "user-duty", candidates }).reasonCode
    ).toBe("TEMPLATE_OWNER_MATCH");
    expect(recommendAssignment({ workflowArea: "SALES", candidates })).toMatchObject({
      recommendedUserId: "user-duty",
      reasonCode: "WORKFLOW_AREA_MATCH"
    });
  });

  it("uses name then id as a deterministic tie-break", () => {
    const result = recommendAssignment({ workflowArea: "SALES", candidates: [...candidates].reverse() });
    expect(result.recommendedUserId).toBe("user-duty");
  });

  it("ignores inactive users and requests manager review when no clear match exists", () => {
    const result = recommendAssignment({
      workflowArea: "SHOP",
      candidates: candidates.map((candidate) => ({ ...candidate, isActive: false }))
    });
    expect(result).toMatchObject({
      recommendedUserId: null,
      reasonCode: "MANAGER_REVIEW_NEEDED",
      reasonText: "Manager review needed because no eligible staff match was found.",
      reviewNeeded: true
    });
    expect(result.reasonPath).toHaveLength(5);
  });
});
