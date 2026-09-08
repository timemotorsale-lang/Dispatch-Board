import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { requestGrowthApproval } from "@/server/growth/operational-service";

import { growthApiError, readJson } from "../../../_helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    return NextResponse.json(await requestGrowthApproval({
      actor: await getCurrentUser(),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      payload: {
        approvalType: body.approvalType,
        campaignId: id,
        requestedRole: body.requestedRole
      },
      reason: String(body.reason ?? ""),
      scope: "approval_request"
    }));
  } catch (error) {
    return growthApiError(error);
  }
}
