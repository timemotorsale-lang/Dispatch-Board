import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import {
  getCrmNextAttentionItem,
  getCrmNextOperationalCommandCenter,
  getCrmNextOperationalCustomer360,
  type CrmNextAttentionItem,
  type CrmNextCustomer360
} from "@/server/crm-next/read-model";
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

function attentionItemFromCustomer(customer: CrmNextCustomer360, itemId: string): CrmNextAttentionItem {
  return {
    age: "Current",
    area: "Sales",
    customerHref: `/crm-next/customers/${encodeURIComponent(customer.id)}`,
    customerId: customer.id,
    customerName: customer.name,
    id: itemId,
    level: customer.riskLevel,
    nextAction: customer.nextAction,
    owner: "Unassigned",
    reason: customer.nextAction || "Review customer record",
    workHref: `/crm-next/work/${encodeURIComponent(itemId)}`
  };
}

async function resolveBridgeAttentionItem(actor: AuthenticatedUser | null, attentionItemId: string) {
  if (!attentionItemId.startsWith("customer-read-")) return getCrmNextAttentionItem(actor, attentionItemId);

  const model = await getCrmNextOperationalCommandCenter(actor);
  const queued = model.attention.find((item) => item.id === attentionItemId);
  if (queued) return queued;

  const customerId = decodeURIComponent(attentionItemId.slice("customer-read-".length));
  const { customer } = await getCrmNextOperationalCustomer360(actor, customerId);
  return attentionItemFromCustomer(customer, attentionItemId);
}

export function previewCrmNextActionToTaskBridge(
  actor: AuthenticatedUser | null,
  input: { attentionItemId: string; itemOverride?: CrmNextAttentionItem }
): CrmNextActionBridgePreview {
  const access = resolveCrmNextAccess(actor);
  if (!access.allowed) {
    return {
      contractVersion: "crm-next-action-bridge/v1",
      liveTaskCreated: false,
      reason: "Customer Console is not enabled for this user, so the bridge fails closed.",
      state: "DENIED"
    };
  }

  const item = input.itemOverride ?? getCrmNextAttentionItem(actor, input.attentionItemId);
  const dogfoodReady = access.mode === "DOGFOOD";

  return {
    contractVersion: "crm-next-action-bridge/v1",
    liveTaskCreated: false,
    reason: dogfoodReady
      ? "Customer Console can create an internal Dispatch task when you confirm the operation."
      : "Task creation is not available in this mode.",
    state: dogfoodReady ? "DOGFOOD_READY" : "PREVIEW_ONLY",
    dispatchPreview: {
      title: item.nextAction,
      assignedTo: item.owner,
      due: "Today 3:00 PM",
      source: `Customer Console · ${item.customerName} · ${item.reason}`,
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
    throw new Error("Customer Console is not enabled for this user.");
  }
  if (access.mode !== "DOGFOOD") {
    throw new Error("Customer Console task creation is not enabled for this user.");
  }
  if (!actor) {
    throw new Error("Authentication required.");
  }

  const item = await resolveBridgeAttentionItem(actor, input.attentionItemId);
  const now = new Date();
  const boardDate = now.toISOString().slice(0, 10);
  const dueAt = new Date(now);
  dueAt.setHours(15, 0, 0, 0);

  const task = await createManualTask(actor, {
    assignedUserId: actor.id,
    boardDate,
    customerReference: item.customerName,
    description: [
      `Customer Console task for ${item.customerName}.`,
      `Reason: ${item.reason}.`,
      `Area: ${item.area}.`,
      `Original owner shown in Customer Console: ${item.owner}.`,
      input.idempotencyKey ? `Idempotency key: ${input.idempotencyKey}.` : ""
    ].filter(Boolean).join(" "),
    dueAt: dueAt.toISOString(),
    intakeMetadata: {
      channel: "Customer Console",
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

