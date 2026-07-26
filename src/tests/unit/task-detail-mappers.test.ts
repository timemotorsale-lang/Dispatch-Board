import { describe, expect, it } from "vitest";

import { buildDefinitionOfDone } from "@/features/tasks/detail/task-detail-mappers";
import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";

describe("task detail mappers", () => {
  it("upgrades untouched legacy generic checklist text to context-aware items", () => {
    const task = {
      id: "task_1",
      title: "Review office/admin support tasks",
      description: "Review office, admin, and front-desk support work that needs attention today.",
      workflowArea: "OPERATIONS_COORDINATOR",
      checklistItems: [
        "Clarify the required outcome and supporting context",
        "Confirm the responsible owner and due time",
        "Complete the primary operational action",
        "Document evidence of the work performed",
        "Notify the affected stakeholder of the outcome",
        "Confirm no required follow-up remains open"
      ].map((label, index) => ({
        id: `legacy_${index + 1}`,
        kind: TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE,
        label,
        completed: false
      })),
      templateChecklistItems: []
    } as Parameters<typeof buildDefinitionOfDone>[0];

    expect(buildDefinitionOfDone(task).map((item) => item.label)).toEqual([
      "Identify the exact work lane: customer, vehicle, appointment, repair, parts, sales, payment, or document",
      "Search and link the canonical record before creating or updating anything",
      "Verify the missing document, signature, proof, payment, photo, or handoff requirement",
      "Complete the safe coordinator step or prepare the workflow for the authorized owner",
      "Attach the evidence or note to the canonical record, not a duplicate task trail",
      "Record the blocker, responsible owner, due time, and next handoff"
    ]);
  });
});
