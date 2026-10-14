import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getControlledExportCsv } from "@/server/governance-operations/service";
import { readLiveReport } from "@/server/reporting/live-service";
import { isGeneralManager } from "@/server/policies/access";
import type { ReportDefinitionId } from "@/lib/reporting/contracts";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isGeneralManager(user)) return NextResponse.json({ error: "Export access is unavailable." }, { status: user ? 403 : 401 });
  try {
    const { id } = await params;
    const record = await prisma.inventoryGovernanceRecord.findFirstOrThrow({ where: { id, organizationId: INITIAL_ORGANIZATION.id, subjectType: "REPORTING_CONSOLE", recordType: "CONTROLLED_EXPORT", requestedByUserId: user.id } });
    const scope = record.scopeSnapshot as Record<string, unknown>;
    await readLiveReport(user, String(scope.definitionId) as ReportDefinitionId, { locationId: typeof scope.locationId === "string" ? scope.locationId : undefined });
    const result = await getControlledExportCsv(user, id);
    return new Response(result.csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="report-${id.replace(/[^a-zA-Z0-9_-]/g, "")}.csv"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Controlled export is unavailable or expired." }, { status: 404 }); }
}
