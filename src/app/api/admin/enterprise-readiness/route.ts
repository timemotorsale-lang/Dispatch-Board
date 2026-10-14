import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { executeEnterpriseReadinessCommand, getEnterpriseReadinessConsole } from "@/server/enterprise-readiness/service";

function response(error: unknown) {
  const message = error instanceof Error ? error.message : "Enterprise-readiness request failed.";
  const status = message === "Authentication required." ? 401 : message.includes("privileges") || message.includes("authority") || message.includes("capability") ? 403 : message.includes("version") ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try { return NextResponse.json(await getEnterpriseReadinessConsole(await getCurrentUser())); } catch (error) { return response(error); }
}

export async function POST(request: Request) {
  try { return NextResponse.json(await executeEnterpriseReadinessCommand(await getCurrentUser(), await request.json())); } catch (error) { return response(error); }
}
