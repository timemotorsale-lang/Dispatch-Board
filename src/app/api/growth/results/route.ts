import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getGrowthResultsDashboard } from "@/server/growth/operational-service";

import { growthApiError } from "../_helpers";

export async function GET() {
  try {
    return NextResponse.json(await getGrowthResultsDashboard(await getCurrentUser()));
  } catch (error) {
    return growthApiError(error);
  }
}
