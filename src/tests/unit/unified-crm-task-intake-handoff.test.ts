import { describe, expect, it } from "vitest";

import {
  buildUnifiedCrmTaskIntakeHref,
  normalizeUnifiedCrmTaskIntakeDefaults
} from "@/lib/unified-crm-task-intake-handoff";

describe("Unified CRM task intake handoff", () => {
  it("builds a safe CRM-to-task intake link with customer context", () => {
    const href = buildUnifiedCrmTaskIntakeHref({
      customerDisplayName: "Alex Morgan",
      customerId: "customer-1",
      customerNumber: "CUS-001",
      dueAt: "2026-08-15T15:00:00.000Z"
    });

    expect(href).toContain("/tasks/intake?");
    expect(href).toContain("customerReference=Alex+Morgan+%C2%B7+CUS-001");
    expect(href).toContain("title=Follow+up+with+Alex+Morgan");
    expect(href).toContain("workflowArea=SALES");
    expect(href).toContain("returnTo=%2Fcrm%2Fcustomers%2Fcustomer-1");
  });

  it("preserves a safe CRM Work return when task intake starts from CRM Work customer context", () => {
    const href = buildUnifiedCrmTaskIntakeHref({
      customerDisplayName: "Alex Morgan",
      customerId: "customer-1",
      customerNumber: "CUS-001",
      customerContextReturn: "/crm?view=work",
      dueAt: "2026-08-15T15:00:00.000Z"
    });

    expect(href).toContain(
      "returnTo=%2Fcrm%2Fcustomers%2Fcustomer-1%3FcrmReturnTo%3D%252Fcrm%253Fview%253Dwork"
    );
  });

  it("normalizes only allowlisted CRM handoff defaults", () => {
    expect(normalizeUnifiedCrmTaskIntakeDefaults({
      brief: "  Carry this into intake.  ",
      customerReference: " Alex Morgan · CUS-001 ",
      dueDate: "2026-08-15",
      dueTime: "10:30",
      expectedOutcome: "  Record the promised follow-up and next step. ",
      intakeType: "Customer Issue",
      title: " Follow up with Alex Morgan ",
      workflowArea: "sales"
    })).toEqual({
      brief: "Carry this into intake.",
      customerReference: "Alex Morgan · CUS-001",
      dueDate: "2026-08-15",
      dueTime: "10:30",
      expectedOutcome: "Record the promised follow-up and next step.",
      intakeType: "Customer Issue",
      title: "Follow up with Alex Morgan",
      workflowArea: "SALES"
    });

    expect(normalizeUnifiedCrmTaskIntakeDefaults({
      dueDate: "2026-15-99",
      dueTime: "soon",
      intakeType: "Hack",
      title: "Ok",
      workflowArea: "drop table"
    })).toEqual({
      brief: undefined,
      customerReference: undefined,
      dueDate: undefined,
      dueTime: undefined,
      expectedOutcome: undefined,
      intakeType: undefined,
      title: "Ok",
      workflowArea: undefined
    });
  });
});
