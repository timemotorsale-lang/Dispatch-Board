import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { diagnosticHttpFailure } from "@/server/diagnostics/http";
import { getDiagnosticCase } from "@/server/diagnostics/service";

export async function GET(_request: Request, context: { params: Promise<{ caseId: string }> }) {
  try {
    return NextResponse.json(await getDiagnosticCase(await getCurrentUser(), (await context.params).caseId));
  } catch (error) {
    return diagnosticHttpFailure(error);
  }
}
