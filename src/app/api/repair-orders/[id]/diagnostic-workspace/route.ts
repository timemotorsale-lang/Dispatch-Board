import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderDetail } from "@/server/repair-order/service";
import { getDiagnosticCaseWorkspace, getRepairOrderDiagnosticsBridge } from "@/server/diagnostics/service";
import { diagnosticHttpFailure } from "@/server/diagnostics/http";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await context.params;
    await getRepairOrderDetail(user, id);
    const bridge = await getRepairOrderDiagnosticsBridge(user, id);
    const cases = bridge.cases.map(item => ({ id: item.id, concern: item.concern, status: item.status, version: item.version }));
    const requested = new URL(request.url).searchParams.get("caseId");
    const selected = requested ?? cases[0]?.id;
    if (selected && !cases.some(item => item.id === selected)) return NextResponse.json({ error: "Diagnostic case does not belong to this repair order or is unavailable." }, { status: 404 });
    const workspace = selected ? await getDiagnosticCaseWorkspace(user, selected) : null;
    return NextResponse.json({ state: bridge.state, cases, workspace }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return diagnosticHttpFailure(error); }
}
