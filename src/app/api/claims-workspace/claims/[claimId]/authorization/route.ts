import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { claimsWorkspaceDependencies } from "@/server/claims-workspace/repository-factory";
import { attachClaimEvidence, getClaimWorkspaceReadModel, ClaimsWorkspaceError } from "@/server/claims-workspace/service";
import { createClaimCustomerAuthorizationPdf } from "@/server/claims-workspace/customer-authorization-pdf";
import { CLAIM_PERMISSION_CATEGORIES } from "@/lib/claim-customer-authorization";

function failure(error: unknown) {
  const status = error instanceof ClaimsWorkspaceError ? error.code === "AUTHENTICATION_REQUIRED" ? 401 : error.code === "CLAIM_NOT_FOUND" ? 404 : error.code === "CLAIM_INVALID" ? 400 : 403 : 503;
  return NextResponse.json({ error: status === 503 ? "Authorization action could not be confirmed. Refresh before retrying." : (error as Error).message }, { status });
}
export async function GET(request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    const actor = await getCurrentUser(); const { claimId } = await params;
    const model = await getClaimWorkspaceReadModel(actor, claimId, await claimsWorkspaceDependencies());
    const bytes = await createClaimCustomerAuthorizationPdf(model.claim);
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="claim-customer-authorization.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    const actor = await getCurrentUser(); const { claimId } = await params; const dependencies = await claimsWorkspaceDependencies();
    const model = await getClaimWorkspaceReadModel(actor, claimId, dependencies);
    const input = await request.json().catch(() => null);
    if (!input || model.claim.status !== "OPEN" || input.action !== "WITHDRAW" || !CLAIM_PERMISSION_CATEGORIES.includes(input.category) || typeof input.reason !== "string" || input.reason.trim().length < 10 || input.reason.length > 1000) throw new ClaimsWorkspaceError("CLAIM_INVALID", "Select a permission and record the customer's withdrawal request (10-1000 characters).");
    const result = await attachClaimEvidence(actor, claimId, { category: input.category, status: "BLOCKED", title: `${input.category === "CLAIM_COMMUNICATION" ? "Claim communication" : "Direct payment"} permission withdrawn`, notes: input.reason.trim(), relationshipTargets: ["CLAIM", "CUSTOMER"] }, dependencies);
    return NextResponse.json(result);
  } catch (error) { return failure(error); }
}
