import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createUnifiedCrmOpportunityAppointmentBridge } from "@/server/services/unified-crm-opportunity-appointment-bridge-service";
import {
  UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_ERROR_CONTRACT_VERSION,
  UnifiedCrmOpportunityAppointmentBridgeError,
  type UnifiedCrmOpportunityAppointmentBridgeFailureCode
} from "@/server/unified-crm/opportunity-appointment-bridge-command";

const TYPED_CODES = new Set<UnifiedCrmOpportunityAppointmentBridgeFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "APPOINTMENT_BRIDGE_NOT_AUTHORIZED",
  "APPOINTMENT_BRIDGE_OFF",
  "OPPORTUNITY_NOT_AVAILABLE",
  "OPPORTUNITY_VERSION_CONFLICT",
  "INVALID_APPOINTMENT_BRIDGE_COMMAND",
  "IDEMPOTENCY_KEY_REUSED",
  "APPOINTMENT_SOURCE_UNAVAILABLE",
  "ORGANIZATION_SCOPE_AMBIGUOUS",
  "ORGANIZATION_SCOPE_UNAVAILABLE"
]);

function statusFor(code: string | undefined, duplicate = false) {
  if (duplicate) return 200;
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "APPOINTMENT_BRIDGE_NOT_AUTHORIZED" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") return 403;
  if (code === "INVALID_APPOINTMENT_BRIDGE_COMMAND") return 400;
  if (code === "OPPORTUNITY_NOT_AVAILABLE") return 404;
  if (code === "IDEMPOTENCY_KEY_REUSED" || code === "ORGANIZATION_SCOPE_AMBIGUOUS" || code === "OPPORTUNITY_VERSION_CONFLICT") return 409;
  if (code === "APPOINTMENT_BRIDGE_OFF" || code === "APPOINTMENT_SOURCE_UNAVAILABLE") return 503;
  return 500;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> }
) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { opportunityId } = await params;

  try {
    const result = await createUnifiedCrmOpportunityAppointmentBridge(user, opportunityId, payload);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const isTyped = typeof code === "string" && TYPED_CODES.has(code as UnifiedCrmOpportunityAppointmentBridgeFailureCode);
    const message = isTyped && error instanceof Error
      ? error.message
      : "CRM opportunity appointment bridge could not be completed safely.";
    return NextResponse.json({
      code: isTyped ? code : undefined,
      contractVersion: UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: error instanceof UnifiedCrmOpportunityAppointmentBridgeError
        ? error.retryable
        : code === "APPOINTMENT_SOURCE_UNAVAILABLE"
    }, { status: statusFor(code) });
  }
}
