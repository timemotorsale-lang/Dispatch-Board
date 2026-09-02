import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import {
  buildAdaptiveTaskChecklist,
  buildAdaptiveTaskSubtasks
} from "@/lib/adaptive-task-checklist";
import type { TaskTemplateChecklistItem, TaskTemplateRequiredUpdateField } from "@/server/validation/task-template";

type TaskNextActionInput = {
  blockerReason: string | null;
  checklistItems: Array<{
    completed: boolean;
    kind: string;
    label: string;
    required: boolean;
  }>;
  comments: Array<{
    body: string;
    createdAt: string;
  }>;
  completedAt: string | null;
  customerReference: string | null;
  description: string | null;
  dueAt: string;
  priority: string;
  readyForReviewAt: string | null;
  requiredUpdateFields: TaskTemplateRequiredUpdateField[];
  requiresManagerApproval: boolean;
  status: string;
  templateChecklistItems: TaskTemplateChecklistItem[];
  title: string;
  updateFieldValues: Record<string, string | boolean>;
  vehicleReference: string | null;
  workflowArea: string;
};

export type TaskNextActionRecommendation = {
  confidence: "high" | "medium" | "low";
  label: string;
  reason: string;
  triggers: string[];
};

function hasRequiredUpdateValue(value: string | boolean | undefined) {
  return typeof value === "boolean" || typeof value === "string" && value.trim().length > 0;
}

function extractDescriptionValue(description: string | null | undefined, label: string) {
  if (!description) return null;
  const pattern = new RegExp(`${label}:\\s*([^.]*)`, "i");
  const match = description.match(pattern);
  const value = match?.[1]?.trim();

  return value || null;
}

function taskCategoryLabel(task: TaskNextActionInput) {
  const quickUpdateCategory = extractDescriptionValue(task.description, "Category");
  if (quickUpdateCategory) return quickUpdateCategory;

  return task.workflowArea.replaceAll("_", " ");
}

function buildRoleAwareAction(task: TaskNextActionInput, category: string) {
  const normalizedCategory = category.toLocaleLowerCase();
  const person = extractDescriptionValue(task.description, "Person");
  const company = extractDescriptionValue(task.description, "Company");
  const contact = person ?? company ?? task.customerReference;
  const contactTarget = contact ? ` ${contact}` : "";

  if (normalizedCategory.includes("vendor")) return `Contact${contactTarget || " the vendor"}, confirm the next commitment, and record the outcome.`;
  if (normalizedCategory.includes("customer")) return `Follow up with${contactTarget || " the customer"}, confirm the decision or need, and record the outcome.`;
  if (normalizedCategory.includes("parts")) return "Confirm parts status, ETA, and owner, then record the next movement.";
  if (normalizedCategory.includes("facility")) return "Confirm the facility issue owner, fix plan, and follow-up time.";
  if (normalizedCategory.includes("finance")) return "Confirm the payment, title, lender, or finance item and record the result.";
  if (normalizedCategory.includes("sales")) return "Follow up on the sales opportunity and record the next customer step.";
  if (normalizedCategory.includes("staff") || normalizedCategory.includes("training")) return "Clarify who needs support, assign the next help step, and record the result.";
  if (task.workflowArea === "SERVICE_ADVISOR") return "Confirm the customer update, authorization, promise, or handoff, then record the advisor outcome.";
  if (task.workflowArea === "SHOP") return "Confirm the repair or recon step, update blockers, and record the next shop action.";
  if (task.workflowArea === "SALES") return "Contact the customer or lead and record the next sales step.";
  if (task.workflowArea === "INVENTORY") return "Confirm inventory status, owner, and next movement.";

  return "Confirm the next owner, action, and due time, then record the progress update.";
}

function latestComment(task: TaskNextActionInput) {
  return [...task.comments].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
}

function taskEvidenceText(task: TaskNextActionInput) {
  return [
    task.title,
    task.description,
    task.vehicleReference,
    task.customerReference,
    ...task.comments.map((comment) => comment.body),
    ...task.checklistItems.map((item) => item.label)
  ].filter(Boolean).join(" ");
}

function completionLanguage(value: string) {
  return /\b(done|completed|finished|resolved|closed|ready|final qc|delivered)\b/i.test(value);
}

function waitingLanguage(value: string) {
  return /\b(waiting|pending|delayed|eta|parts delayed|vendor|customer callback|call back|hold)\b/i.test(value);
}

function transportationLanguage(value: string) {
  return /\b(transportation|transport|tow|towed|pickup|pick up|drop[\s-]?off|drop off|delivery|delivered|ride|uber|lyft|loaner)\b/i.test(value);
}

function reportOrFilingLanguage(value: string) {
  return /\b(report|accident report|arbitration|claim|file|filing|document|paperwork|photos|evidence|invoice|receipt)\b/i.test(value);
}

function customerContactLanguage(value: string) {
  return /\b(customer|called|texted|emailed|left message|voicemail|phone|callback|call back)\b/i.test(value);
}

function shortLabel(label: string) {
  return label.trim().replace(/\s+/g, " ");
}

function buildEffectiveChecklist(task: TaskNextActionInput) {
  const persisted = task.checklistItems.filter((item) => item.kind === TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE);

  if (persisted.length > 0) return persisted;
  if (task.templateChecklistItems.length > 0) {
    return task.templateChecklistItems.map((item) => ({
      completed: false,
      kind: TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE,
      label: item.label,
      required: item.required !== false
    }));
  }

  return buildAdaptiveTaskChecklist({
    description: task.description,
    title: task.title,
    workflowArea: task.workflowArea
  }).map((item) => ({
    completed: false,
    kind: TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE,
    label: item.label,
    required: true
  }));
}

function buildEffectiveSubtasks(task: TaskNextActionInput) {
  const persisted = task.checklistItems.filter((item) => item.kind === TASK_CHECKLIST_ITEM_KIND.SUBTASK);

  if (persisted.length > 0) return persisted;

  return buildAdaptiveTaskSubtasks({
    workflowArea: task.workflowArea
  }).map((item) => ({
    completed:
      item.completedWhen === "started"
        ? task.status !== "NOT_STARTED"
        : item.completedWhen === "commented"
          ? task.comments.length > 0
          : item.completedWhen === "closed"
            ? Boolean(task.readyForReviewAt || task.completedAt)
            : false,
    kind: TASK_CHECKLIST_ITEM_KIND.SUBTASK,
    label: item.label,
    required: true
  }));
}

function recommendation(
  label: string,
  reason: string,
  triggers: string[],
  confidence: TaskNextActionRecommendation["confidence"] = "high"
): TaskNextActionRecommendation {
  return { confidence, label, reason, triggers };
}

export function buildTaskNextActionRecommendation(
  task: TaskNextActionInput,
  now = new Date()
): TaskNextActionRecommendation {
  const requiredUpdateFields = task.requiredUpdateFields.filter((field) => field.required);
  const missingUpdateFields = requiredUpdateFields.filter((field) => !hasRequiredUpdateValue(task.updateFieldValues[field.key]));
  const checklist = buildEffectiveChecklist(task);
  const openChecklist = checklist.filter((item) => item.required !== false && !item.completed);
  const subtasks = buildEffectiveSubtasks(task);
  const openSubtasks = subtasks.filter((item) => !item.completed);
  const latest = latestComment(task);
  const latestText = latest?.body ?? "";
  const evidenceText = taskEvidenceText(task);
  const dueDate = new Date(task.dueAt);
  const isPastDue = !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < now.getTime();
  const category = taskCategoryLabel(task);

  if (task.status === "COMPLETED") {
    return recommendation(
      "This task is closed. Review the record only if you need the history.",
      "The task status is completed.",
      ["status:completed"]
    );
  }

  if (task.status === "BLOCKED" || task.status === "ESCALATED" || task.blockerReason) {
    return recommendation(
      "Record the blocker owner, unblock action, and next review time.",
      task.blockerReason ? `The task has a blocker: ${task.blockerReason}` : "The task is blocked or elevated.",
      ["status:blocking"]
    );
  }

  if (isPastDue && !latest) {
    return recommendation(
      "Update the overdue task first: confirm what happened, who owns it, and the new due time.",
      "The task is past due and has no progress update yet.",
      ["due:past", "progress:none"]
    );
  }

  if (latest && transportationLanguage(latestText) && reportOrFilingLanguage(evidenceText)) {
    return recommendation(
      "Use the transportation details to complete the report or filing step, then record the filing status.",
      "The latest update added transportation/logistics information and this task is tied to report or filing work.",
      ["latest-update:transportation", "task-context:report-filing"]
    );
  }

  if (latest && transportationLanguage(latestText)) {
    return recommendation(
      "Confirm the transportation plan, next owner, and timing, then record whether movement is complete.",
      "The latest update added transportation or logistics information.",
      ["latest-update:transportation"],
      "medium"
    );
  }

  if (latest && reportOrFilingLanguage(latestText)) {
    return recommendation(
      "Complete the document or filing step, attach the result if available, then record the next owner.",
      "The latest update points to report, document, claim, or filing work.",
      ["latest-update:document-filing"],
      "medium"
    );
  }

  if (latest && customerContactLanguage(latestText) && !completionLanguage(latestText)) {
    return recommendation(
      "Confirm the customer's decision or missing information, then record the next commitment.",
      "The latest update includes customer contact but does not confirm a final outcome.",
      ["latest-update:customer-contact"],
      "medium"
    );
  }

  if (latest && waitingLanguage(latestText)) {
    return recommendation(
      "Follow up on the waiting item, confirm the commitment, then record the new ETA.",
      "The latest progress update indicates the task is waiting on someone or something.",
      ["latest-update:waiting"],
      "medium"
    );
  }

  if (latest && completionLanguage(latestText)) {
    if (openChecklist.length > 0) {
      return recommendation(
        `Verify the remaining checklist item: ${openChecklist[0].label}.`,
        "The latest update sounds complete, but the checklist still has open work.",
        ["latest-update:completion", "checklist:open"]
      );
    }

    if (task.requiresManagerApproval && !task.readyForReviewAt) {
      return recommendation(
        "Send this for manager review after confirming the final outcome.",
        "The latest update sounds complete and manager review is required.",
        ["latest-update:completion", "approval:needed"]
      );
    }

    return recommendation(
      "Confirm the final outcome, then mark the task complete.",
      "The latest update indicates the work may be finished.",
      ["latest-update:completion"]
    );
  }

  if (missingUpdateFields.length > 0) {
    return recommendation(
      buildRoleAwareAction(task, category),
      `A required update is still missing: ${missingUpdateFields[0].label}.`,
      ["required-update:missing"]
    );
  }

  if (openChecklist.length > 0) {
    return recommendation(
      `Work the next checklist item: ${openChecklist[0].label}.`,
      `${openChecklist.length} required checklist item${openChecklist.length === 1 ? " is" : "s are"} still open.`,
      ["checklist:open"]
    );
  }

  if (openSubtasks.length > 0) {
    const nextSubtask = shortLabel(openSubtasks[0].label);
    const subtaskLower = nextSubtask.toLocaleLowerCase();
    const label =
      subtaskLower.includes("post progress") || subtaskLower.includes("progress update")
        ? "Record a progress update with what changed, what is still needed, and the next check-in time."
        : `Work the next subtask: ${nextSubtask}.`;

    return recommendation(
      label,
      `${openSubtasks.length} subtask${openSubtasks.length === 1 ? " is" : "s are"} still open.`,
      ["subtask:open"],
      "medium"
    );
  }

  if (task.requiresManagerApproval && !task.readyForReviewAt) {
    return recommendation(
      "Send this for manager review after confirming the outcome.",
      "Checklist and subtasks are clear, but manager review is required.",
      ["approval:needed"]
    );
  }

  if (task.status === "NOT_STARTED") {
    return recommendation(
      "Start the task, confirm the first action, and leave a short progress note.",
      "The task has not been started.",
      ["status:not-started"]
    );
  }

  if (isPastDue) {
    return recommendation(
      "Record the current outcome and reset the due time if work must continue.",
      "The task is past due.",
      ["due:past"],
      "medium"
    );
  }

  return recommendation(
    buildRoleAwareAction(task, category),
    "No blocker or open checklist item is currently driving a more specific cue.",
    ["role-aware:fallback"],
    "medium"
  );
}
