import { NextResponse } from "next/server";
import { ClaimWorkflowError } from "@/lib/claim-repair-workflow";
import { getCurrentUser } from "@/server/auth/current-user";
import { executeClaimRepairWorkflow, getClaimRepairWorkflow } from "@/server/claims-workspace/repair-workflow-service";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

type Context = { params: Promise<{ claimId: string }> };
function failure(error: unknown) {
  const status = error instanceof ClaimWorkflowError ? error.status : error instanceof EnterpriseCommandConflictError ? 409 : 503;
  return NextResponse.json({ error: status === 503 ? "Claim repair workflow could not confirm the result. Refresh the workflow before retrying." : error instanceof Error ? error.message : "Workflow could not be updated." }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function GET(_request: Request, context: Context) {
  try {
    const { claimId } = await context.params;
    return NextResponse.json(await getClaimRepairWorkflow(await getCurrentUser(), claimId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const { claimId } = await context.params;
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ClaimWorkflowError("A workflow action is required.");
    const user = await getCurrentUser();
    await executeClaimRepairWorkflow(user, claimId, raw);
    return NextResponse.json(await getClaimRepairWorkflow(user, claimId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
