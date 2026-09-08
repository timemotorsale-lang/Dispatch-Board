import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { saveGrowthAudienceSnapshot } from "@/server/growth/operational-service";

import { growthApiError, readJson } from "../../../_helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    return NextResponse.json(await saveGrowthAudienceSnapshot({
      actor: await getCurrentUser(),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      payload: {
        campaignId: id,
        rows: Array.isArray(body.rows) ? body.rows : undefined
      },
      reason: String(body.reason ?? ""),
      scope: "audience_snapshot"
    }));
  } catch (error) {
    return growthApiError(error);
  }
}
