import { describe, expect, it } from "vitest";

import { incompleteRepairUpdateIssue } from "@/features/technician/technician-repair-workbench";

describe("technician repair workbench", () => {
  it("explains what is missing before requesting the next action", () => {
    expect(incompleteRepairUpdateIssue({ blockerReason: "", recommendedNextStep: "Create a completion job." })).toMatch(/why the repair is incomplete/i);
    expect(incompleteRepairUpdateIssue({ blockerReason: "Parts are missing", recommendedNextStep: "" })).toMatch(/recommended next step/i);
    expect(incompleteRepairUpdateIssue({ blockerReason: "Parts are missing", recommendedNextStep: "Create a completion job." })).toBeNull();
  });
});
