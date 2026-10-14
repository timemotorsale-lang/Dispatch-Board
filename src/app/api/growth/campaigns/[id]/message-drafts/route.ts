import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { saveGrowthMessageDraft } from "@/server/growth/operational-service";

import { growthApiError, readJson } from "../../../_helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    return NextResponse.json(await saveGrowthMessageDraft({
      actor: await getCurrentUser(),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      payload: {
        body: String(body.body ?? ""),
        callToAction: String(body.callToAction ?? ""),
        campaignId: id,
        subject: String(body.subject ?? "")
      },
      reason: String(body.reason ?? ""),
      scope: "message_draft"
    }));
  } catch (error) {
    return growthApiError(error);
  }
}
