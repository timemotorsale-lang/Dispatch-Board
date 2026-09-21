import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { claimsWorkspaceDependencies } from "@/server/claims-workspace/repository-factory";
import {
  CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION,
  ClaimsWorkspaceError,
  createInsuranceClaim,
  getClaimsDeskReadModel
} from "@/server/claims-workspace/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const liveClaimsHeaders = {
  "Cache-Control": "no-store, max-age=0"
};

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "CLAIM_INVALID") return 400;
  return 500;
}

function errorResponse(error: unknown) {
  const code = error instanceof ClaimsWorkspaceError ? error.code : undefined;
  return NextResponse.json({
    code,
    contractVersion: CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION,
    error: error instanceof ClaimsWorkspaceError ? error.message : "Insurance claim workflow is temporarily unavailable.",
    retryable: error instanceof ClaimsWorkspaceError ? error.retryable : false
  }, { status: statusForCode(code) });
}

export async function GET() {
  try {
    return NextResponse.json(await getClaimsDeskReadModel(await getCurrentUser(), await claimsWorkspaceDependencies()), {
      headers: liveClaimsHeaders
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  try {
    const result = await createInsuranceClaim(await getCurrentUser(), payload ?? {}, await claimsWorkspaceDependencies());
    return NextResponse.json(result, { headers: liveClaimsHeaders, status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
