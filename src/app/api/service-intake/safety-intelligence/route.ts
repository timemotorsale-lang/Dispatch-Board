import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getNhtsaSafetyIntelligence } from "@/server/vehicle-identification/nhtsa-safety";

export async function POST(request: Request) {
  try {
    if (!await getCurrentUser()) throw new Error("Authentication required.");
    const value = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Safety intelligence request must be an object.");
    return NextResponse.json({ safetyIntelligence: await getNhtsaSafetyIntelligence({ concern: typeof value.concern === "string" ? value.concern : "", make: typeof value.make === "string" ? value.make : "", model: typeof value.model === "string" ? value.model : "", year: Number(value.year) }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vehicle safety intelligence is unavailable.";
    return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : 400 });
  }
}
