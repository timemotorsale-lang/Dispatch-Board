import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { saveRepairDiagnosisWork } from "@/server/shop-planning/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => null);
    if (body?.action !== "request" && body?.action !== "findings") throw new Error("Choose diagnosis request or findings.");
    const { id } = await params;
    const result = await saveRepairDiagnosisWork(await getCurrentUser(), id, body.action, body);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const concurrent = error instanceof Error && "code" in error && error.code === "P2034";
    const message = concurrent ? "This repair order changed while you were saving. Reload before trying again."
      : error instanceof Error ? error.message : "Could not save diagnosis work.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403
      : concurrent || error instanceof EnterpriseCommandConflictError ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
