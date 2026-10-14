import { describe, expect, it } from "vitest";
import { dedupeAutomationActions, evaluateWorkflowAutomationRules } from "@/lib/workflow-automation-rules";

const now = new Date("2026-09-09T21:00:00.000Z");

describe("workflow automation rules", () => {
  it("creates explainable actions for the first enterprise automation rules", () => {
    const actions = evaluateWorkflowAutomationRules({
      appointments: [{ href: "/appointments/apt-1", id: "apt-1", startAt: "2026-09-09T15:00:00.000Z", status: "MISSED", title: "Service appointment" }],
      carryovers: [{ count: 3, href: "/vehicles/coo-workbook", id: "carry-1", title: "Call customer again" }],
      customerFollowUps: [{ dueAt: "2026-09-09T14:00:00.000Z", href: "/crm/customers/customer-1", id: "follow-1", status: "OPEN", title: "Call Asmaa" }],
      documents: [{ href: "/vehicles/360/vehicle-1?section=documents", id: "doc-1", received: false, required: true, title: "Missing title packet" }],
      leads: [{ href: "/crm/opportunities/lead-1", id: "lead-1", lastActivityAt: "2026-08-29T18:00:00.000Z", status: "OPEN", title: "RAV4 lead" }],
      now,
      promises: [{ dueAt: "2026-09-09T13:00:00.000Z", href: "/customers/cases/promise-1", id: "promise-1", status: "PENDING", title: "Return call promise" }],
      repairDelays: [{ href: "/vehicles/advisor?ro=ro-1", id: "ro-1", lastCustomerUpdateAt: "2026-09-08T14:00:00.000Z", targetAt: "2026-09-09T13:00:00.000Z", title: "RO delay", waitingOnParts: true }],
      vehicles: [{ href: "/vehicles/control-tower?vehicle=vehicle-1", id: "vehicle-1", stageEnteredAt: "2026-09-05T13:00:00.000Z", status: "ACTIVE", title: "Corolla recon", blocked: false }],
    });

    expect(actions.map((item) => item.ruleCode)).toEqual([
      "OVERDUE_PROMISE",
      "MISSING_DOCUMENT",
      "OVERDUE_CUSTOMER_FOLLOW_UP",
      "REPAIR_DELAY_WITHOUT_CUSTOMER_UPDATE",
      "VEHICLE_STUCK_TOO_LONG",
      "APPOINTMENT_MISSED",
      "REPEATED_CARRYOVER",
      "STALE_LEAD",
    ]);
    expect(actions[0]).toMatchObject({
      actionLabel: "Protect promise",
      explanation: expect.stringContaining("customer trust risk"),
      targetQueue: "MANAGER_REVIEW",
    });
    expect(actions.every((item) => item.evidence.length > 0 && item.dedupeKey === `${item.ruleCode}:${item.sourceId}`)).toBe(true);
  });

  it("does not trigger rules for closed, current, or already satisfied work", () => {
    const actions = evaluateWorkflowAutomationRules({
      appointments: [{ href: "/appointments/apt-1", id: "apt-1", startAt: "2026-09-10T15:00:00.000Z", status: "SCHEDULED", title: "Future appointment" }],
      carryovers: [{ count: 2, href: "/vehicles/coo-workbook", id: "carry-1", title: "Not repeated enough" }],
      customerFollowUps: [{ dueAt: "2026-09-09T14:00:00.000Z", href: "/crm/customers/customer-1", id: "follow-1", status: "COMPLETED", title: "Completed call" }],
      documents: [{ href: "/vehicles/360/vehicle-1", id: "doc-1", received: true, required: true, title: "Received title packet" }],
      leads: [{ href: "/crm/opportunities/lead-1", id: "lead-1", lastActivityAt: "2026-09-08T18:00:00.000Z", status: "OPEN", title: "Fresh lead" }],
      now,
      promises: [{ dueAt: "2026-09-09T13:00:00.000Z", href: "/customers/cases/promise-1", id: "promise-1", status: "FULFILLED", title: "Fulfilled promise" }],
      repairDelays: [{ href: "/vehicles/advisor?ro=ro-1", id: "ro-1", lastCustomerUpdateAt: "2026-09-09T20:00:00.000Z", targetAt: "2026-09-10T13:00:00.000Z", title: "Current RO" }],
      vehicles: [{ href: "/vehicles/control-tower?vehicle=vehicle-1", id: "vehicle-1", stageEnteredAt: "2026-09-09T19:00:00.000Z", status: "ACTIVE", title: "Fresh recon" }],
    });

    expect(actions).toEqual([]);
  });

  it("dedupes repeat actions by rule and source before staff sees them", () => {
    const [first] = evaluateWorkflowAutomationRules({
      customerFollowUps: [{ dueAt: "2026-09-09T14:00:00.000Z", href: "/crm/customers/customer-1", id: "follow-1", status: "OPEN", title: "Call Asmaa" }],
      now,
    });

    expect(dedupeAutomationActions([first, { ...first, id: "copy" }])).toEqual([first]);
  });
});
