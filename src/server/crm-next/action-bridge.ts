import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextAttentionItem } from "@/server/crm-next/read-model";

export type CrmNextActionBridgePreview = {
  contractVersion: "crm-next-action-bridge/v1";
  state: "PREVIEW_ONLY" | "DENIED";
  liveTaskCreated: false;
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
  return {
    contractVersion: "crm-next-action-bridge/v1",
    liveTaskCreated: false,
    reason: "CRM Next action-to-task bridge is safely gated. This preview proves the handoff shape without changing Dispatch Board tasks.",
    state: "PREVIEW_ONLY",
    dispatchPreview: {
      title: item.nextAction,
      assignedTo: item.owner,
      due: "Today 3:00 PM",
      source: `CRM Next · ${item.customerName} · ${item.reason}`,
      customer360Update: "Customer 360 would receive a timeline event after the Dispatch task is completed."
    }
  };
}

