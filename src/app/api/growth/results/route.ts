import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getGrowthOperationalHome } from "@/server/growth/operational-service";
import { buildGrowthResultsAttributionReviewModel } from "@/server/growth/results-attribution";

import { growthApiError } from "../_helpers";

export async function GET() {
  try {
    await getGrowthOperationalHome(await getCurrentUser());
    return NextResponse.json(buildGrowthResultsAttributionReviewModel());
  } catch (error) {
    return growthApiError(error);
  }
}
