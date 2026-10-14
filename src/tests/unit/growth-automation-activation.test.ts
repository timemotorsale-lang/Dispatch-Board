import { describe, expect, it } from "vitest";

import {
  buildGrowthAutomationActivationReviewModel,
  evaluateGrowthAutomationActivation
} from "@/server/growth/automation-activation";

describe("growth automation activation", () => {
  it("keeps automations inactive until every governance check clears", () => {
    const readiness = evaluateGrowthAutomationActivation({
      audienceApproved: true,
      frequencyCapPerContact: 1,
      hasManualPause: true,
      messageApproved: false,
      ownerApproved: true,
      triggerReviewed: true
    });

    expect(readiness.canActivateAutomation).toBe(false);
    expect(readiness.state).toBe("Message review needed");
    expect(readiness.nextAction).toBe("Approve customer-facing language and disclosure");
  });

  it("requires a safe contact frequency", () => {
    const readiness = evaluateGrowthAutomationActivation({
      audienceApproved: true,
      frequencyCapPerContact: 5,
      hasManualPause: true,
      messageApproved: true,
      ownerApproved: true,
      triggerReviewed: true
    });

    expect(readiness.canActivateAutomation).toBe(false);
    expect(readiness.state).toBe("Frequency review needed");
    expect(readiness.checks.find((check) => check.id === "frequency")?.passed).toBe(false);
  });

  it("returns a review model that is clear for daily operators", () => {
    const model = buildGrowthAutomationActivationReviewModel();

    expect(model.playbook).toBe("Unsold quote recovery");
    expect(model.writeback).toBe("Prepared task only");
    expect(model.summary).toContain("cannot send customer messages");
    expect(model.canActivateAutomation).toBe(false);
  });
});
