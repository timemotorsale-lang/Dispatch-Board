import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getGrowthOperationalHome } from "@/server/growth/operational-service";

import { growthApiError } from "../_helpers";

export async function GET() {
  try {
    const home = await getGrowthOperationalHome(await getCurrentUser());
    return NextResponse.json({
      generatedAt: home.generatedAt,
      opportunities: home.opportunities,
      sourceMode: home.sourceMode
    });
  } catch (error) {
    return growthApiError(error);
  }
}
