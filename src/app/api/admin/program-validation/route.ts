import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProgramIntegrationValidation } from "@/server/program-integration-validation/service";

export async function GET() {
  try { return NextResponse.json(getProgramIntegrationValidation(await getCurrentUser())); }
  catch (error) { const message = error instanceof Error ? error.message : "Program validation request failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("privileges") ? 403 : 400 }); }
}
