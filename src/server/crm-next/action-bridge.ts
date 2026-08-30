import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextAttentionItem } from "@/server/crm-next/read-model";
import { createManualTask } from "@/server/services/task-create-service";

export type CrmNextActionBridgePreview = {
  contractVersion: "crm-next-action-bridge/v1";
  state: "DOGFOOD_READY" | "PREVIEW_ONLY" | "DENIED";
  liveTaskCreated: boolean;
  reason: string;
  dispatchPreview?: {
    title: string;
    assignedTo: string;
    due: string;
    source: string;
    customer360Update: string;
  };
};

export function previewCrmNextActionToTaskBridge(
  actor: AuthenticatedUser | null,
  input: { attentionItemId: string }
): CrmNextActionBridgePreview {
  const access = resolveCrmNextAccess(actor);
  if (!access.allowed) {
    return {
      contractVersion: "crm-next-action-bridge/v1",
      liveTaskCreated: false,
      reason: "CRM Next is not enabled for this user, so the bridge fails closed.",
      state: "DENIED"
    };
  }

  const item = getCrmNextAttentionItem(actor, input.attentionItemId);
  const dogfoodReady = access.mode === "DOGFOOD";

  return {
    contractVersion: "crm-next-action-bridge/v1",
    liveTaskCreated: false,
    reason: dogfoodReady
      ? "CRM Next can create an internal Dispatch task when you confirm the operation."
      : "Task creation is not available in this mode.",
    state: dogfoodReady ? "DOGFOOD_READY" : "PREVIEW_ONLY",
    dispatchPreview: {
      title: item.nextAction,
      assignedTo: item.owner,
      due: "Today 3:00 PM",
      source: `CRM Next · ${item.customerName} · ${item.reason}`,
      customer360Update: "Customer 360 would receive a timeline event after the Dispatch task is completed."
    }
  };
}

export async function createCrmNextDispatchTaskFromAttention(
  actor: AuthenticatedUser | null,
  input: { attentionItemId: string; idempotencyKey?: string }
) {
  const access = resolveCrmNextAccess(actor);
  if (!access.allowed) {
    throw new Error("CRM Next is not enabled for this user.");
  }
  if (access.mode !== "DOGFOOD") {
    throw new Error("CRM Next task creation is not enabled for this user.");
  }
  if (!actor) {
    throw new Error("Authentication required.");
  }

  const item = getCrmNextAttentionItem(actor, input.attentionItemId);
  const now = new Date();
  const boardDate = now.toISOString().slice(0, 10);
  const dueAt = new Date(now);
  dueAt.setHours(15, 0, 0, 0);

  const task = await createManualTask(actor, {
    assignedUserId: actor.id,
    boardDate,
    customerReference: item.customerName,
    description: [
      `CRM Next task for ${item.customerName}.`,
      `Reason: ${item.reason}.`,
      `Area: ${item.area}.`,
      `Original owner shown in CRM Next: ${item.owner}.`,
      input.idempotencyKey ? `Idempotency key: ${input.idempotencyKey}.` : ""
    ].filter(Boolean).join(" "),
    dueAt: dueAt.toISOString(),
    intakeMetadata: {
      channel: "CRM Next",
      expectedOutcome: "Complete the next customer action and record the result in the customer workspace.",
      intakeType: "Customer Follow-up",
      requiredUpdates: ["Customer outcome", "Next customer step", "Source record updated"]
    },
    priority: item.level === "High" ? "HIGH" : item.level === "Medium" ? "MEDIUM" : "LOW",
    requiresManagerApproval: false,
    status: "NOT_STARTED",
    title: item.nextAction,
    workflowArea: item.area.toUpperCase() === "SALES" ? "SALES" : "ADMIN"
  });

  return {
    contractVersion: "crm-next-action-bridge/v1",
    liveTaskCreated: true,
    reason: "Dispatch task created and assigned to you.",
    state: "DOGFOOD_READY" as const,
    task
  };
}

