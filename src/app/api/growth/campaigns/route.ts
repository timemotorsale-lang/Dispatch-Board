import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createGrowthCampaign, getGrowthOperationalHome } from "@/server/growth/operational-service";

import { growthApiError, readJson } from "../_helpers";

export async function GET() {
  try {
    const home = await getGrowthOperationalHome(await getCurrentUser());
    return NextResponse.json({ campaigns: home.activeCampaigns });
  } catch (error) {
    return growthApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    return NextResponse.json(await createGrowthCampaign({
      actor: await getCurrentUser(),
      idempotencyKey: String(body.idempotencyKey ?? ""),
      payload: {
        budgetCents: Number(body.budgetCents ?? 0),
        campaignType: body.campaignType,
        channel: body.channel,
        objective: body.objective,
        opportunityId: String(body.opportunityId ?? "")
      },
      reason: String(body.reason ?? ""),
      scope: "campaign_plan"
    }), { status: 201 });
  } catch (error) {
    return growthApiError(error);
  }
}
