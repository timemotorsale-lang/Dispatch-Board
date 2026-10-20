import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { logUnifiedCrmCustomerNote } from "@/server/services/unified-crm-customer-note-service";
import { createUnifiedCrmCustomerTaskBridge } from "@/server/services/unified-crm-customer-task-bridge-service";
import { UnifiedCrmCustomerNoteError } from "@/server/unified-crm/customer-note-command";
import { UnifiedCrmCustomerTaskBridgeError } from "@/server/unified-crm/customer-task-bridge-command";

export async function POST(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const headers = { "cache-control": "no-store" };
  const actor = await getCurrentUser();
  const access = resolveCrmNextAccess(actor);
  if (!access.allowed) {
    return NextResponse.json({ error: actor ? "Customer Console is unavailable for your account." : "Sign in again before saving. Your text has not been cleared." }, { status: actor ? 403 : 401, headers });
  }
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Enter the customer action before saving." }, { status: 400, headers });
  }
  const { customerId } = await context.params;
  const options = { readMode: "REVIEW", shellMode: "REVIEW" };
  try {
    const result = payload.action === "new-task"
      ? await createUnifiedCrmCustomerTaskBridge(actor, customerId, payload, { ...options, bridgeMode: "REVIEW" })
      : payload.action === "add-note"
        ? await logUnifiedCrmCustomerNote(actor, customerId, payload, { ...options, commandMode: "REVIEW" })
        : null;
    if (!result) return NextResponse.json({ error: "Choose a supported customer action." }, { status: 400, headers });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201, headers });
  } catch (error) {
    if (error instanceof UnifiedCrmCustomerNoteError || error instanceof UnifiedCrmCustomerTaskBridgeError) {
      return NextResponse.json({ error: error.message, code: error.code, retryable: error.retryable }, { status: error.httpStatus, headers });
    }
    return NextResponse.json({ error: "This action could not be saved. Your text is still here; try again." }, { status: 500, headers });
  }
}
