import { describe, expect, it } from "vitest";

import {
  buildUnifiedAction,
  classifyUnifiedActionDueState,
  inferUnifiedActionType,
  normalizeUnifiedActionPriority,
  normalizeUnifiedActionStatus,
  unifiedActionFromCrmWorkQueueItem
} from "@/server/services/unified-action-service";
import type { UnifiedCrmWorkQueueItem } from "@/server/unified-crm/work-queue-contract";

const now = new Date("2026-09-09T15:00:00.000Z");

describe("unified action service", () => {
  it("normalizes status, priority, and due state without changing source records", () => {
    const action = buildUnifiedAction({
      actionType: "follow_up",
      description: "Customer needs a call before close.",
      dueAt: "2026-09-09T21:00:00.000Z",
      id: "manual-1",
      nextRecommendedAction: "Call customer",
      now,
      owner: { id: "user-1", name: "Eli Manager" },
      priority: "urgent",
      source: { href: "/crm/customers/customer-1", label: "Customer 360", module: "CRM", recordId: "customer-1" },
      status: "in progress",
      title: "Follow up with customer"
    });

    expect(action).toMatchObject({
      actionType: "follow_up",
      contractVersion: "unified-action/v1",
      dueState: "due_today",
      priority: "critical",
      reportWorthy: true,
      status: "in_progress"
    });
    expect(action.source).toEqual({ href: "/crm/customers/customer-1", label: "Customer 360", module: "CRM", recordId: "customer-1" });
  });

  it("classifies completed, overdue, upcoming, and unscheduled dates", () => {
    expect(classifyUnifiedActionDueState({ completedAt: "2026-09-09T14:00:00.000Z", dueAt: "2026-09-08T14:00:00.000Z", now })).toBe("completed");
    expect(classifyUnifiedActionDueState({ dueAt: "2026-09-09T14:59:00.000Z", now })).toBe("overdue");
    expect(classifyUnifiedActionDueState({ dueAt: "2026-09-10T14:00:00.000Z", now })).toBe("upcoming");
    expect(classifyUnifiedActionDueState({ dueAt: "not-a-date", now })).toBe("unscheduled");
    expect(normalizeUnifiedActionStatus("ready")).toBe("not_started");
    expect(normalizeUnifiedActionPriority("minor")).toBe("low");
  });

  it("infers common dealership action types from source language", () => {
    expect(inferUnifiedActionType({ title: "Promise risk", label: "Review promise" })).toBe("review_promise");
    expect(inferUnifiedActionType({ title: "Repair order update needed" })).toBe("update_repair_order");
    expect(inferUnifiedActionType({ title: "Schedule customer visit" })).toBe("schedule_appointment");
    expect(inferUnifiedActionType({ title: "Send SMS follow-up" })).toBe("send_message");
  });

  it("adapts CRM work queue rows into the shared action shape", () => {
    const item: UnifiedCrmWorkQueueItem = {
      customerHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm",
      customerLabel: "Alex Morgan · CUS-1001",
      dueAt: "2026-09-09T14:00:00.000Z",
      dueLabel: "Overdue",
      dueState: "overdue",
      history: ["Customer left voicemail."],
      id: "work-1",
      kind: "customer",
      ownerName: "Taylor B.",
      primaryActionLabel: "Open customer",
      reason: "Customer follow-up is overdue.",
      sourceHref: "/crm/customers/customer-1?crmReturnTo=%2Fcrm",
      sourceLabel: "Customer 360",
      stageLabel: "Follow-up",
      title: "Customer follow-up",
      updatedAt: "2026-09-09T13:00:00.000Z"
    };

    const action = unifiedActionFromCrmWorkQueueItem(item, now);

    expect(action).toMatchObject({
      businessImpact: "Customer follow-up is overdue.",
      dueState: "overdue",
      id: "crm:customer:work-1",
      nextRecommendedAction: "Open customer",
      priority: "high",
      relationships: { customerId: "customer-1" },
      reportWorthy: true,
      source: { module: "CRM", recordId: "work-1" }
    });
    expect(action.description).toContain("Recent context: Customer left voicemail.");
  });
});

