import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { DASHBOARD_TABLES, dashboardCsv, getDashboard, type DashboardTable } from "@/features/collections/server/dashboard-service";
import { assertModuleOn, collectionsErrorResponse, collectionsJson } from "@/features/collections/server/http";

export async function GET(request: Request) {
  try {
    assertModuleOn();
    const params = new URL(request.url).searchParams;
    const data = await getDashboard(await getCurrentUser());
    const table = params.get("table") as DashboardTable | null;
    if (params.get("format") === "csv" && table && DASHBOARD_TABLES.includes(table)) {
      return new NextResponse(dashboardCsv(data, table), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=collections-${table}.csv`, "cache-control": "no-store" } });
    }
    return collectionsJson(data);
  } catch (error) { return collectionsErrorResponse(error); }
}
