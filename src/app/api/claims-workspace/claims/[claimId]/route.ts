import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { claimsWorkspaceDependencies } from "@/server/claims-workspace/repository-factory";
import {
  CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION,
  ClaimsWorkspaceError,
  updateClaimExecutionDetails
} from "@/server/claims-workspace/service";

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "CLAIM_NOT_FOUND") return 404;
  if (code === "CLAIM_INVALID") return 400;
  return 500;
}

export async function PATCH(request: Request, context: { params: Promise<{ claimId: string }> }) {
  const payload = await request.json().catch(() => null);
  const { claimId } = await context.params;
  try {
    return NextResponse.json(
      await updateClaimExecutionDetails(await getCurrentUser(), claimId, payload ?? {}, await claimsWorkspaceDependencies())
    );
  } catch (error) {
    const code = error instanceof ClaimsWorkspaceError ? error.code : undefined;
    return NextResponse.json({
      code,
      contractVersion: CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION,
      error: error instanceof ClaimsWorkspaceError ? error.message : "Claim details could not be updated right now.",
      retryable: error instanceof ClaimsWorkspaceError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
