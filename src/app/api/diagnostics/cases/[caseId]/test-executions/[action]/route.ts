import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { diagnosticHttpFailure } from "@/server/diagnostics/http";
import { executeDiagnosticTestLifecycle } from "@/server/diagnostics/service";
import type { DiagnosticTestLifecycleAction } from "@/server/diagnostics/test-execution-domain";

const actions: Record<string, DiagnosticTestLifecycleAction> = { start: "START", pause: "PAUSE", resume: "RESUME", complete: "COMPLETE", invalidate: "INVALIDATE", cancel: "CANCEL" };

export async function POST(request: Request, context: { params: Promise<{ action: string; caseId: string }> }) {
  try {
    const params = await context.params;
    const action = actions[params.action.toLowerCase()];
    if (!action) throw new Error("Diagnostic test lifecycle action is invalid.");
    const result = await executeDiagnosticTestLifecycle(await getCurrentUser(), params.caseId, action, await request.json().catch(() => null));
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) { return diagnosticHttpFailure(error); }
}
