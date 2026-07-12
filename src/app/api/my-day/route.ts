import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getStaffDay, startStaffDay } from "@/server/services/staff-day";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  try {
    return NextResponse.json(await getStaffDay(await getCurrentUser(), date, url.searchParams.get("userId") ?? undefined));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load My Day.";
    const status = message === "Authentication required." ? 401 : message.includes("permission") ? 403 : message.includes("date") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  try {
    return NextResponse.json({ staffDay: await startStaffDay(await getCurrentUser(), date, await request.json().catch(() => null)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start My Day.";
    const status = message === "Authentication required." ? 401 : message.includes("not found") ? 404 : message.includes("permission") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
