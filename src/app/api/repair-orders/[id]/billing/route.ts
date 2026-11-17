import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getServiceBilling, executeServiceBilling } from "@/server/service-billing/service";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Billing request failed.";
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const sqlCode = code === "P2010" && error && typeof error === "object" && "meta" in error
    ? String((error.meta as { code?: unknown } | undefined)?.code ?? "") : "";
  const rejectedConstraint = ({
    "23505": { status: 409, message: "This financial reference is already recorded. Reload and inspect its receipt before using a different reference for a distinct transaction." },
    "23514": { status: 400, message: "The financial entry failed validation and was not saved. Review its amount, method, and source before submitting again." },
    "23503": { status: 409, message: "The linked financial record changed or is unavailable. Reload and select the original deposit or invoice again." },
  } as Record<string, { status: number; message: string }>)[sqlCode];
  if (rejectedConstraint) return NextResponse.json({ error: rejectedConstraint.message }, { status: rejectedConstraint.status, headers: { "Cache-Control": "no-store" } });
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
