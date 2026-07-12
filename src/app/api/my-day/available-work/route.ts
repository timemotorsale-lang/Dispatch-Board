import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getAvailableWork } from "@/server/services/available-work";

export async function GET(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    return NextResponse.json(await getAvailableWork(await getCurrentUser(), date));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load available work.";
    const status = message === "Authentication required." ? 401 : message.includes("Start Day") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
