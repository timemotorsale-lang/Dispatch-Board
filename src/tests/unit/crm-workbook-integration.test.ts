import { describe, expect, it } from "vitest";
import { buildCrmWorkbookPlan } from "@/lib/workday-workbook-crm-integration";

describe("CRM workbook integration", () => {
  it("prioritizes CRM work and recommends attention for urgent customer issues", () => {
    const plan = buildCrmWorkbookPlan([
      {
        detail: "Customer promised update has not happened.",
        href: "/crm/customers/1",
        id: "promise",
        itemType: "PROMISED_CUSTOMER_COMMUNICATION",
        priority: "HIGH",
        riskLevel: "WATCH",
        sourceId: "promise-1",
        sourceType: "CRM_PROMISE",
        title: "Call customer with promise update"
      },
      {
        detail: "Appointment starts this afternoon.",
        href: "/appointments",
        id: "appointment",
        itemType: "APPOINTMENT_TODAY",
        priority: "MEDIUM",
        riskLevel: "NONE",
        sourceId: "appointment-1",
        sourceType: "APPOINTMENT",
        title: "Appointment: Asmaa"
      }
    ]);

    expect(plan[0]).toMatchObject({
      alreadyInTodayFocus: false,
      nextBestAction: { destination: "NEEDS_ATTENTION", label: "Review now" },
      title: "Call customer with promise update"
    });
  });

  it("prevents duplicate focus candidates by source lineage and title", () => {
    const plan = buildCrmWorkbookPlan([
      {
        detail: "First copy",
        href: "/tasks/task-1",
        id: "task-a",
        itemType: "MANAGER_ASSIGNED_CUSTOMER_TASK",
        priority: "HIGH",
        riskLevel: "WATCH",
        sourceId: "task-1",
        sourceType: "TASK",
        title: "Deliver sold vehicles"
      },
      {
        detail: "Duplicate copy",
        href: "/tasks/task-1",
        id: "task-b",
        itemType: "MANAGER_ASSIGNED_CUSTOMER_TASK",
        priority: "HIGH",
        riskLevel: "WATCH",
        sourceId: "task-1",
        sourceType: "TASK",
        title: "Deliver sold vehicles"
      },
      {
        detail: "Same title already on today's focus",
        href: "/crm/customers/2",
        id: "follow-up",
        itemType: "FOLLOW_UP_DUE_TODAY",
        priority: "MEDIUM",
        riskLevel: "NONE",
        sourceId: "follow-up-1",
        sourceType: "CRM_NEXT_ACTION",
        title: "Call Michael Johnson"
      }
    ], {
      existingFocusItems: [
        { outcome: "Call Michael Johnson", sourceId: null, sourceType: null }
      ]
    });

    expect(plan.filter((item) => item.title === "Deliver sold vehicles")).toHaveLength(1);
    expect(plan.find((item) => item.title === "Call Michael Johnson")).toMatchObject({ alreadyInTodayFocus: true });
  });
});
