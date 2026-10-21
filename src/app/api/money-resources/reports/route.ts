import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { moneyError } from "@/server/money-resources/http";
import { expenseReportCsv, moneyExpenseReport } from "@/server/money-resources/report";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const complete = ["csv", "print"].includes(query.get("format") || "");
    const report = await moneyExpenseReport(await getCurrentUser(), query, complete);
    if (query.get("format") === "csv") return new NextResponse(expenseReportCsv(report), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=expense-report-${report.from}-${report.to}.csv`, "cache-control": "private, no-store" } });
    return NextResponse.json(report, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return moneyError(error); }
}
