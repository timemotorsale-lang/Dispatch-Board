import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { importGrowthResultPreview } from "@/server/growth/operational-service";

import { growthApiError, readJson } from "../../_helpers";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    return NextResponse.json(await importGrowthResultPreview({
      actor: await getCurrentUser(),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      payload: {
        campaignId: String(body.campaignId ?? ""),
        events: Array.isArray(body.events) ? body.events : []
      },
      reason: String(body.reason ?? ""),
      scope: "launch_lock"
    }));
  } catch (error) {
    return growthApiError(error);
  }
}
