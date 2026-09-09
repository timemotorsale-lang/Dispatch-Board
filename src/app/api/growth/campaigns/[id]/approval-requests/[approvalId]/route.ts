import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { decideGrowthApproval } from "@/server/growth/operational-service";

import { growthApiError, readJson } from "../../../../_helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ approvalId: string; id: string }> }) {
  try {
    const { approvalId, id } = await params;
    const body = await readJson(request);
    const decision = String(body.decision ?? "").toUpperCase();
    if (decision !== "APPROVED" && decision !== "REJECTED") throw new Error("Approval decision must be approved or rejected.");

    return NextResponse.json(await decideGrowthApproval({
      actor: await getCurrentUser(),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      payload: {
        approvalId,
        campaignId: id,
        decision
      },
      reason: String(body.reason ?? ""),
      scope: "approval_decision"
    }));
  } catch (error) {
    return growthApiError(error);
  }
}
