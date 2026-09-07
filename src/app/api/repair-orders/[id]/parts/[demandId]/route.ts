import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { cancelRepairPartDemand } from "@/server/parts-ledger/service";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Part demand update failed.";
  return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : error instanceof EnterpriseCommandConflictError ? 409 : 400 });
}

export async function DELETE(request: Request, context: { params: Promise<{ demandId: string; id: string }> }) {
  try {
    const params = await context.params;
    return NextResponse.json(await cancelRepairPartDemand(await getCurrentUser(), params.id, params.demandId, await request.json().catch(() => null), { enforceRollout: false }));
  } catch (error) {
    return failure(error);
  }
}
