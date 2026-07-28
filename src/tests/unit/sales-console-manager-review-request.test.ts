import { describe, expect, it } from "vitest";

import {
  m10FallbackReviewPlaceholdersBlockSubmission,
  m10ManagerReviewExtendsM9ApprovalFoundation,
  m10ManagerReviewRequestsRemainDisabled,
  m10ManagerReviewRequiresSourceRecordsAuditAndReason,
  m10ManagerReviewRolesAreScopedToManagersAndAdmins,
  salesConsoleM10ManagerReviewRequestFoundation
} from "@/features/sales/sales-console-m10-manager-review-request";

describe("Sales Console M10 manager review request foundation", () => {
  it("keeps manager review requests disabled", () => {
    expect(m10ManagerReviewRequestsRemainDisabled()).toBe(true);
    expect(
      salesConsoleM10ManagerReviewRequestFoundation.contracts.every((contract) =>
        !contract.requestEnabled && !contract.decisionEnabled && !contract.sourceWriteEnabled
      )
    ).toBe(true);
  });

  it("requires source records, audit, reason, and evidence", () => {
    expect(m10ManagerReviewRequiresSourceRecordsAuditAndReason()).toBe(true);
  });

  it("scopes reviews to managers and admins", () => {
    expect(m10ManagerReviewRolesAreScopedToManagersAndAdmins()).toBe(true);
  });

  it("extends the M9 manager approval foundation without activating it", () => {
    expect(m10ManagerReviewExtendsM9ApprovalFoundation()).toBe(true);
  });

  it("blocks fallback placeholders from becoming submissions", () => {
    expect(m10FallbackReviewPlaceholdersBlockSubmission()).toBe(true);
  });
});
