import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCustomerContactDetails } from "@/server/services/customer-contact-details-service";
import { UnifiedCrmCustomer360Error } from "@/server/unified-crm/customer-360-contract";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function GET(_request: Request, context: { params: Promise<{ customerId: string }> }) {
  try {
    const actor = await getCurrentUser();
    if (!resolveCrmNextAccess(actor).allowed) return NextResponse.json({ error: actor ? "Customer contact access is unavailable for your account." : "Your session expired. Sign in again to see customer contacts." }, { status: actor ? 403 : 401, headers });
    const { customerId } = await context.params;
    const result = await getCustomerContactDetails(actor, customerId, { readMode: "REVIEW", shellMode: "REVIEW" });
    return NextResponse.json(result, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof UnifiedCrmCustomer360Error ? error.message : "Customer contacts could not be loaded. Retry or open the customer record." }, { status: error instanceof UnifiedCrmCustomer360Error ? error.httpStatus : 503, headers });
  }
}
