import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { decideTimeOffRequest } from "@/server/time-attendance";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await decideTimeOffRequest(await getCurrentUser(), await request.json().catch(() => null)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time-off decision failed.";
    const status = message === "Authentication required." ? 401 : message.includes("capability required") ? 403 : message.includes("changed during") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
