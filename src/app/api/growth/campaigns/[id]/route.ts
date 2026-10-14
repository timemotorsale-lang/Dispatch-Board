import { NextResponse } from "next/server";

import { getGrowthCampaign } from "@/server/growth/operational-service";

import { growthApiError } from "../../_helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await getGrowthCampaign(id));
  } catch (error) {
    return growthApiError(error);
  }
}
