import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createGrowthWritebackPreviews } from "@/server/growth/operational-service";

import { growthApiError } from "../_helpers";

export async function GET(request: Request) {
  try {
    const campaignId = new URL(request.url).searchParams.get("campaignId");
    if (!campaignId) throw new Error("Campaign ID is required.");
    return NextResponse.json({
      canMutateCrm: false,
      previews: await createGrowthWritebackPreviews(await getCurrentUser(), campaignId)
    });
  } catch (error) {
    return growthApiError(error);
  }
}
