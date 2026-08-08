import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getPayrollHandoffFile, getPayrollHandoffReadiness, runPayrollHandoffCommand } from "@/server/time-attendance";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("download") === "1") {
      const file = await getPayrollHandoffFile(await getCurrentUser(), url.searchParams.get("batchId") ?? "");
      return new NextResponse(file.content, {
        headers: {
          "Content-Disposition": `attachment; filename="${file.filename}"`,
          "Content-Type": "text/csv; charset=utf-8",
          "X-Payroll-Handoff-Checksum": file.checksum ?? ""
        }
      });
    }
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
