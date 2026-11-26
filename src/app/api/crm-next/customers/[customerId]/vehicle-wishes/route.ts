import { NextResponse } from "next/server";
import { isTrustedAppMutation } from "@/lib/app-request-origin";
import { parseVehicleWish } from "@/lib/customer-vehicle-wishes";
import { getCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { resolveCustomerToolsOrganization } from "@/server/crm-next/customer-wishlist";
import { changeCustomerVehicleWish, readCustomerVehicleWishes } from "@/server/crm-next/customer-vehicle-wishes";
import { evaluateUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { canCreateUnifiedCrmCustomerNote } from "@/server/unified-crm/customer-note-access";

type Context = { params: Promise<{ customerId: string }> };
const headers = { "cache-control": "private, no-store" };
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers });

async function access(context: Context, write: boolean) {
  const actor = await getCurrentUser();
  if (!actor) return error("Sign in again to use vehicle wishes.", 401);
  const { recordScope } = evaluateUnifiedCrmCustomerReadPolicy(actor);
  if (!recordScope || !resolveCrmNextAccess(actor).allowed) return error("Customer workspace access is required.", 403);
  if (write && !canCreateUnifiedCrmCustomerNote(actor, { readMode: "REVIEW", shellMode: "REVIEW", commandMode: "REVIEW" })) {
    return error("You do not have permission to change vehicle wishes.", 403);
  }
  const { customerId } = await context.params;
  const organizationId = await resolveCustomerToolsOrganization(actor, customerId);
  if (!organizationId) return error("This customer record is unavailable to you.", 404);
  const customer = { id: customerId, organizationId, archivedAt: null, mergedIntoCustomerId: null,
    ...(recordScope.kind === "OWNER" ? { ownerUserId: recordScope.ownerUserId } : {}) };
  return { actor, customerId, organizationId, customer };
}

export async function GET(_request: Request, context: Context) {
  try {
    const scope = await access(context, false);
    if (scope instanceof NextResponse) return scope;
    return NextResponse.json({ wishes: await readCustomerVehicleWishes(scope.customer) }, { headers });
  } catch {
    return error("Vehicle wishes could not be loaded. Try again.", 503);
  }
}

export async function POST(request: Request, context: Context) {
  if (!isTrustedAppMutation(request)) return error("Open the customer record in this app before saving.", 403);
  try {
    const scope = await access(context, true);
    if (scope instanceof NextResponse) return scope;
    const body = await request.json().catch(() => null);
    if (!body || typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
      return error("Choose a valid vehicle wish.", 400);
    }
    const currentVersion = Number.isInteger(body.version) && body.version > 0 && body.version < 2147483647;
    const save = body.action === "save" && (body.version === null || currentVersion);
    const archive = body.action === "archive" && currentVersion;
    if (!save && !archive) return error("Choose a supported vehicle wish action.", 400);
    const args = [scope.customer, scope.customerId, scope.organizationId, scope.actor.id, body.id.toLowerCase()] as const;
    let result;
    if (save) {
      let values;
      try { values = parseVehicleWish(body.fields); }
      catch (cause) { return error((cause as Error).message, 400); }
      result = await changeCustomerVehicleWish(...args, body.version === null
        ? { action: "add", values }
        : { action: "save", version: body.version, values });
    } else {
      result = await changeCustomerVehicleWish(...args, { action: "archive", version: body.version });
    }
    if (result.status === "unavailable") return error("This customer record is unavailable to you.", 404);
    if (result.status === "conflict") return error("This wish has changed or is no longer available. Review the latest list before trying again.", 409);
    return NextResponse.json(result, { headers });
  } catch {
    return error("The change could not be confirmed. Try again.", 503);
  }
}
