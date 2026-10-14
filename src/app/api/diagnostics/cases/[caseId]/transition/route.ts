import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { diagnosticHttpFailure } from "@/server/diagnostics/http";
import { transitionDiagnosticCase } from "@/server/diagnostics/service";

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  try {
    return NextResponse.json(await transitionDiagnosticCase(await getCurrentUser(), (await context.params).caseId, await request.json().catch(() => null)));
  } catch (error) {
    return diagnosticHttpFailure(error);
  }
}
