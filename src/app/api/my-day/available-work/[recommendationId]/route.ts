import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { claimAvailableWork, dismissAvailableWork } from "@/server/services/available-work";

type Context = { params: Promise<{ recommendationId: string }> };

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to update this recommendation.";
  const status = message === "Authentication required." ? 401 : message.includes("not found") ? 404 : message.includes("already claimed") || message.includes("no longer available") ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(_request: Request, context: Context) {
  try {
    const { recommendationId } = await context.params;
    return NextResponse.json({ claim: await claimAvailableWork(await getCurrentUser(), recommendationId) });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { recommendationId } = await context.params;
    return NextResponse.json({ dismissal: await dismissAvailableWork(await getCurrentUser(), recommendationId, await request.json().catch(() => null)) });
  } catch (error) {
    return failure(error);
  }
}
