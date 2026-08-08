import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { bulkApproveCleanTimeCards, decideTimeCard } from "@/server/time-attendance";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const command = payload && typeof payload === "object" && !Array.isArray(payload) && payload.command === "BULK_APPROVE_CLEAN"
      ? "BULK"
      : "SINGLE";
    return NextResponse.json(command === "BULK"
      ? await bulkApproveCleanTimeCards(await getCurrentUser(), payload)
      : await decideTimeCard(await getCurrentUser(), payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time card review failed.";
    const status = message === "Authentication required." ? 401 : message.includes("capability required") ? 403 : message.includes("stale") || message.includes("changed during") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
