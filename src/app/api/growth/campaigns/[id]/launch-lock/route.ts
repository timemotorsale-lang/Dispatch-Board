import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createGrowthLaunchLock } from "@/server/growth/operational-service";

import { growthApiError, readJson } from "../../../_helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    return NextResponse.json(await createGrowthLaunchLock({
      actor: await getCurrentUser(),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      payload: { campaignId: id },
      reason: String(body.reason ?? ""),
      scope: "launch_lock"
    }));
  } catch (error) {
    return growthApiError(error);
  }
}
