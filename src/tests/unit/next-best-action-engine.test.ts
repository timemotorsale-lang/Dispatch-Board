import { describe, expect, it } from "vitest";

import { getNextBestActions } from "@/server/services/next-best-action-engine";
import { buildUnifiedAction } from "@/server/services/unified-action-service";
import type { UnifiedActionType } from "@/server/unified-actions/unified-action-contract";

const now = new Date("2026-09-09T15:00:00.000Z");

function action(overrides: {
  actionType?: UnifiedActionType;
  customerId?: string;
  dueAt?: string | null;
  id: string;
  priority?: string;
  reportWorthy?: boolean;
  sourceModule?: "CRM" | "SALES" | "APPOINTMENTS" | "WORKBOOK";
  status?: string;
  title: string;
}) {
  return buildUnifiedAction({
    actionType: overrides.actionType ?? "follow_up",
    businessImpact: `${overrides.title} matters to the customer relationship.`,
    description: `${overrides.title} needs attention.`,
    dueAt: overrides.dueAt === undefined ? "2026-09-09T18:00:00.000Z" : overrides.dueAt,
    id: overrides.id,
    now,
    owner: { id: "owner-1", name: "Taylor B." },
    priority: overrides.priority ?? "medium",
    relationships: { customerId: overrides.customerId ?? "customer-1" },
    reportWorthy: overrides.reportWorthy,
    source: { href: `/source/${overrides.id}`, label: "Source", module: overrides.sourceModule ?? "CRM", recordId: overrides.id },
    status: overrides.status ?? "not_started",
    title: overrides.title
  });
}

describe("next best action engine", () => {
  it("surfaces overdue critical work before lower-risk activity", () => {
    const model = getNextBestActions({
      actions: [
        action({ id: "routine", title: "Routine follow-up", priority: "low", dueAt: "2026-09-10T15:00:00.000Z" }),
        action({ id: "overdue", title: "Save customer promise", priority: "critical", dueAt: "2026-09-09T14:00:00.000Z" })
      ],
      now
    });

    expect(model.primary).toMatchObject({
      actionId: "overdue",
      ruleId: "overdue-critical-work",
      suggestedButtonLabel: "Save customer promise"
    });
    expect(model.explanation).toContain("rule-ranked");
  });

  it("uses specific rules for blockers, promises, appointments, and unscheduled sales follow-up", () => {
    const model = getNextBestActions({
      actions: [
        action({ actionType: "follow_up", dueAt: null, id: "stale-lead", sourceModule: "SALES", title: "Revive internet lead" }),
        action({ actionType: "schedule_appointment", id: "appointment", title: "Customer appointment" }),
        action({ actionType: "review_promise", dueAt: "2026-09-09T14:30:00.000Z", id: "promise", title: "Promise risk" }),
        action({ id: "blocked", status: "blocked", title: "Blocked repair update" })
      ],
      limit: 4,
      now
    });

    expect(model.recommendations.map((item) => item.ruleId)).toEqual(expect.arrayContaining([
      "blocked-work",
      "promise-risk",
      "appointment-today",
      "unscheduled-follow-up"
    ]));
    expect(model.recommendations.find((item) => item.ruleId === "unscheduled-follow-up")?.suggestedButtonLabel).toBe("Set follow-up");
  });

  it("detects repeated carryover by relationship and keeps source links", () => {
    const model = getNextBestActions({
      actions: [
        action({ actionType: "carry_over", customerId: "customer-7", id: "carry-1", title: "Carry over title issue" }),
        action({ actionType: "carry_over", customerId: "customer-7", id: "carry-2", title: "Carry over title issue again" })
      ],
      now
    });

    expect(model.primary).toMatchObject({
      ruleId: "repeated-carryover",
      sourceHref: "/source/carry-1",
      suggestedButtonLabel: "Review carryover"
    });
    expect(model.source.includedActionIds).toEqual(["carry-1", "carry-2"]);
  });

  it("does not surface completed or cancelled work", () => {
    const model = getNextBestActions({
      actions: [
        action({ id: "done", status: "done", title: "Completed customer call" }),
        action({ id: "cancelled", status: "cancelled", title: "Cancelled duplicate task" })
      ],
      now
    });

    expect(model).toMatchObject({
      primary: null,
      state: "EMPTY"
    });
    expect(model.explanation).toContain("Completed and cancelled work is not surfaced.");
  });
});
