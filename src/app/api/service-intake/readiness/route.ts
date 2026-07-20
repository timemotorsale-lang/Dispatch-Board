import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { evaluateServiceIntakeReadiness } from "@/server/service-intake/readiness-service";

export async function POST(request: Request) {
  try {
    return NextResponse.json({ readiness: await evaluateServiceIntakeReadiness(await getCurrentUser(), await request.json().catch(() => null)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Service readiness could not be evaluated.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
