import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { claimsWorkspaceDependencies } from "@/server/claims-workspace/repository-factory";
import {
  CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION,
  ClaimsWorkspaceError,
  requestClaimHandoff
} from "@/server/claims-workspace/service";

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "CLAIM_NOT_FOUND") return 404;
  if (code === "CLAIM_MANAGER_APPROVAL_REQUIRED") return 403;
  if (code === "CLAIM_HANDOFF_BLOCKED") return 409;
  if (code === "CLAIM_INVALID") return 400;
  return 500;
}

export async function POST(request: Request, context: { params: Promise<{ claimId: string }> }) {
  const payload = await request.json().catch(() => null);
  const { claimId } = await context.params;
  try {
    return NextResponse.json(
      await requestClaimHandoff(await getCurrentUser(), claimId, payload ?? {}, await claimsWorkspaceDependencies())
    );
  } catch (error) {
    const code = error instanceof ClaimsWorkspaceError ? error.code : undefined;
    return NextResponse.json({
      code,
      contractVersion: CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION,
      error: error instanceof ClaimsWorkspaceError ? error.message : "Claim handoff could not be evaluated right now.",
      retryable: error instanceof ClaimsWorkspaceError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
