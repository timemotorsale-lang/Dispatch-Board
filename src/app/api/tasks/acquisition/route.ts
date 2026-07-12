import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getTaskAcquisitionOverview } from "@/server/services/task-acquisition-service";

export async function GET(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    return NextResponse.json(await getTaskAcquisitionOverview(await getCurrentUser(), date));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load work acquisition.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 400 });
  }
}
