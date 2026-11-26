import { getCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { isTrustedAppMutation } from "@/lib/app-request-origin";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { CustomerVehicleToolError, linkCustomerVehicle, lookupCustomerVehicle } from "@/server/crm-next/customer-vehicle-tools";
import { UnifiedCrmCustomerNoteError } from "@/server/unified-crm/customer-note-command";

type Context = { params: Promise<{ customerId: string }> };
const headers = { "Cache-Control": "private, no-store" };
function fail(error: unknown) {
  if (error instanceof CustomerVehicleToolError) return Response.json({ error: error.message }, { headers, status: error.status });
  if (error instanceof UnifiedCrmCustomerNoteError) return Response.json({ error: "Your account cannot link vehicles for this customer." }, { headers, status: error.httpStatus });
  if (error instanceof EnterpriseCommandConflictError) return Response.json({ error: "The vehicle changed. Find it again before linking." }, { headers, status: 409 });
  return Response.json({ error: "Vehicle linking is unavailable. Find the vehicle again to retry." }, { headers, status: 503 });
}

export async function GET(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor || !resolveCrmNextAccess(actor).allowed) return Response.json({ error: "Customer workspace access is required." }, { headers, status: actor ? 403 : 401 });
  try { return Response.json(await lookupCustomerVehicle(actor, (await params).customerId, new URL(request.url).searchParams.get("vin")), { headers }); }
  catch (error) { return fail(error); }
}

export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor || !resolveCrmNextAccess(actor).allowed || !isTrustedAppMutation(request)) return Response.json({ error: "Open the customer record in this app before linking." }, { headers, status: actor ? 403 : 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail(new CustomerVehicleToolError("Find and review the vehicle first."));
  try { return Response.json(await linkCustomerVehicle(actor, (await params).customerId, body), { headers }); }
  catch (error) { return fail(error); }
}
