import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_MANUAL_CALL_DISPOSITION_CONTRACT_VERSION,
  UnifiedCrmManualCallDispositionError,
  type UnifiedCrmManualCallDispositionReadModel
} from "@/server/unified-crm/manual-call-disposition-contract";

type Dependencies = { now?: () => Date };

export async function getUnifiedCrmManualCallDisposition(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmManualCallDispositionReadModel> {
  if (!actor) throw new UnifiedCrmManualCallDispositionError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM manual call disposition.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") throw new UnifiedCrmManualCallDispositionError("MANUAL_CALL_DISPOSITION_NOT_AUTHORIZED", "CRM manual call disposition is available to the manager workspace.");
  return {
    activation: { callRecordingEnabled: false, clickToCallEnabled: false, manualOutcomeCaptureEnabled: true, transcriptionEnabled: false, state: "IMPLEMENTED_UNVERIFIED" },
    contractVersion: UNIFIED_CRM_MANUAL_CALL_DISPOSITION_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    outcomes: [
      { label: "Reached customer", nextStepRequired: false, outcome: "REACHED_CUSTOMER" },
      { label: "Left voicemail", nextStepRequired: true, outcome: "LEFT_VOICEMAIL" },
      { label: "No answer", nextStepRequired: true, outcome: "NO_ANSWER" },
      { label: "Bad number", nextStepRequired: true, outcome: "BAD_NUMBER" },
      { label: "Customer asked for callback", nextStepRequired: true, outcome: "CALL_BACK_REQUESTED" }
    ],
    rollback: { fallback: "customer-interaction-manual-note", featureControl: "crm.communications.manualCallDisposition.enabled", posture: "manual-only" },
    state: "IMPLEMENTED_UNVERIFIED",
    visibility: "management"
  };
}
