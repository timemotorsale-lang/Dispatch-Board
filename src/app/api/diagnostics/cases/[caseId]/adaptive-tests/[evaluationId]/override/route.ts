import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { diagnosticHttpFailure } from "@/server/diagnostics/http";
import { overrideDiagnosticAdaptiveTest } from "@/server/diagnostics/service";

export async function POST(request: Request, context: { params: Promise<{ caseId: string; evaluationId: string }> }) {
  try {
    const { caseId, evaluationId } = await context.params;
    const result = await overrideDiagnosticAdaptiveTest(await getCurrentUser(), caseId, evaluationId, await request.json().catch(() => null));
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) { return diagnosticHttpFailure(error); }
}
