import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getServiceBilling, executeServiceBilling } from "@/server/service-billing/service";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Billing request failed.";
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const databaseFailure = error instanceof Error && error.name.startsWith("Prisma");
  return NextResponse.json({ error: databaseFailure && !["P2002","P2025","P2034"].includes(code) ? "Database outcome is uncertain. Retry this unchanged request to recover its original receipt; do not create a second payment." : message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError || ["P2002","P2025","P2034"].includes(code) ? 409 : databaseFailure ? 503 : 400, headers: { "Cache-Control": "no-store" } });
}
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await getServiceBilling(await getCurrentUser(), (await context.params).id), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await executeServiceBilling(await getCurrentUser(), (await context.params).id, await request.json()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}
