import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getLaborBillingReport, serviceReportCsv } from "@/server/service-billing/reporting";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const report = await getLaborBillingReport(await getCurrentUser(), params.get("from") ?? "", params.get("to") ?? "", params.get("locationId") ?? undefined);
    const kind = params.get("csv");
    if (kind === "financial" || kind === "operational" || kind === "activity") return new Response(serviceReportCsv(report[kind]), { headers: { "Cache-Control": "no-store", "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="labor-${kind}-${report.from}-${report.to}.csv"` } });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { const message = error instanceof Error ? error.message : "Report failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required:") ? 403 : 400, headers: { "Cache-Control": "no-store" } }); }
}
