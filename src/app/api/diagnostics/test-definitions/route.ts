import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { diagnosticHttpFailure } from "@/server/diagnostics/http";
import { listDiagnosticTestDefinitions, registerDiagnosticTestDefinition } from "@/server/diagnostics/service";

export async function GET() {
  try { return NextResponse.json(await listDiagnosticTestDefinitions(await getCurrentUser())); }
  catch (error) { return diagnosticHttpFailure(error); }
}

export async function POST(request: Request) {
  try {
    const result = await registerDiagnosticTestDefinition(await getCurrentUser(), await request.json().catch(() => null));
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) { return diagnosticHttpFailure(error); }
}
