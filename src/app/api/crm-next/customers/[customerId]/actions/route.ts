import { isTrustedAppMutation } from "@/lib/app-request-origin";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { readCustomerWishlist } from "@/server/crm-next/customer-wishlist";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { logUnifiedCrmCustomerNote } from "@/server/services/unified-crm-customer-note-service";
import { createUnifiedCrmCustomerTaskBridge } from "@/server/services/unified-crm-customer-task-bridge-service";
import { UnifiedCrmCustomerNoteError } from "@/server/unified-crm/customer-note-command";
import { UnifiedCrmCustomerTaskBridgeError } from "@/server/unified-crm/customer-task-bridge-command";

export async function GET(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const headers = { "cache-control": "private, no-store" };
  const actor = await getCurrentUser();
  if (!actor || !resolveCrmNextAccess(actor).allowed) return NextResponse.json({ error: "Customer workspace access is required." }, { status: actor ? 403 : 401, headers });
  if (new URL(request.url).searchParams.get("view") !== "wishlist") return NextResponse.json({ error: "Choose customer wishlist." }, { status: 400, headers });
  try { return NextResponse.json(await readCustomerWishlist(actor, (await params).customerId), { headers }); }
  catch { return NextResponse.json({ error: "The wishlist is unavailable to you right now." }, { status: 404, headers }); }
}

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
  if (payload.action === "save-wishlist" && !isTrustedAppMutation(request)) {
    return NextResponse.json({ error: "Open the customer record in this app before saving." }, { status: 403, headers });
  }
  const { customerId } = await context.params;
  const options = { readMode: "REVIEW", shellMode: "REVIEW" };
  try {
    const result = payload.action === "new-task"
      ? await createUnifiedCrmCustomerTaskBridge(actor, customerId, payload, { ...options, bridgeMode: "REVIEW" })
      : payload.action === "add-note" || payload.action === "save-wishlist"
        ? await logUnifiedCrmCustomerNote(actor, customerId, payload, { ...options, commandMode: "REVIEW", ...(payload.action === "save-wishlist" ? { purpose: "WISHLIST" } : {}) })
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
