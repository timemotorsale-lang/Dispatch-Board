import { NextResponse } from "next/server";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";

import { growthApiError, readJson } from "../../../_helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required.");
    const { id } = await params;
    const body = await readJson(request) as { reason?: string };
    const reason = body.reason?.trim() || "Dismiss Growth opportunity after manager review.";
    if (reason.length < 10) throw new Error("Reason is required.");
    const opportunity = await prisma.growthOpportunity.findFirst({
      select: { id: true },
      where: { id, organizationId: INITIAL_ORGANIZATION.id }
    });
    if (!opportunity) throw new Error("Growth opportunity was not found.");
    const updated = await prisma.growthOpportunity.update({
      data: {
        dismissedAt: new Date(),
        dismissedByUserId: user.id,
        dismissedReason: reason,
        status: "DISMISSED"
      },
      where: { id: opportunity.id }
    });
    return NextResponse.json({ opportunity: updated });
  } catch (error) {
    return growthApiError(error);
  }
}
