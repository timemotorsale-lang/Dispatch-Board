import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getPayrollHandoffReadiness, runPayrollHandoffCommand } from "@/server/time-attendance";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await getPayrollHandoffReadiness(await getCurrentUser(), {
      periodEnd: url.searchParams.get("periodEnd") ?? undefined,
      periodStart: url.searchParams.get("periodStart") ?? undefined
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payroll handoff readiness failed.";
    const status = message === "Authentication required." ? 401 : message.includes("Only managers") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const result = await runPayrollHandoffCommand(
      await getCurrentUser(),
      await request.json().catch(() => null)
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payroll handoff command failed.";
    const status = message === "Authentication required." ? 401 : message.includes("Only managers") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
