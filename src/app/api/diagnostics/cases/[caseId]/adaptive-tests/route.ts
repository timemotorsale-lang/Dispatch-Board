import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { diagnosticHttpFailure } from "@/server/diagnostics/http";
import { evaluateDiagnosticAdaptiveTests } from "@/server/diagnostics/service";

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  try {
    const result = await evaluateDiagnosticAdaptiveTests(await getCurrentUser(), (await context.params).caseId, await request.json().catch(() => null));
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) { return diagnosticHttpFailure(error); }
}
