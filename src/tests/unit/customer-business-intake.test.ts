import { describe, expect, it } from "vitest";
import { businessIntakeNote } from "@/lib/customer-business-intake";

describe("business customer intake", () => {
  it("keeps recognized business sections and excludes unknown or sensitive fields", () => {
    const note = businessIntakeNote({ tradeName: "Example Motors", operatorName: "Example Operator", coApplicantName: "Example Applicant", ssn: "123456789", taxId: "123456789" });
    expect(note).toContain("Trade name: Example Motors");
    expect(note).toContain("Operator name: Example Operator");
    expect(note).toContain("Co-applicant name: Example Applicant");
    expect(note).not.toContain("123456789");
  });
  it("validates ownership percentages and tax ID endings", () => {
    expect(() => businessIntakeNote({ ownershipPercent: "101" })).toThrow("between 0 and 100");
    expect(() => businessIntakeNote({ taxIdLast4: "123456789" })).toThrow("last four");
    expect(() => businessIntakeNote({ principalName: "x".repeat(301) })).toThrow("300 characters");
  });
});
