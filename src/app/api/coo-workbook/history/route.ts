import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { validFlowDate, shiftFlowDate } from "@/features/advisor/workbook-flow-dates";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const before = params.get("before") ?? "";
  const scope = params.get("scope") === "STAFF" ? "STAFF" : "COO";
  if (!validFlowDate(before)) return NextResponse.json({ error: "A valid history date is required." }, { status: 400 });
  try {
    const records = await prisma.workdayWorkbook.findMany({
      where: { userId: user.id, scope, boardDay: { date: { gte: new Date(`${shiftFlowDate(before, -28)}T00:00:00.000Z`), lt: new Date(`${before}T00:00:00.000Z`) } } },
      orderBy: { boardDay: { date: "desc" } },
      select: {
        id: true, status: true, boardDay: { select: { date: true } },
        checklistItems: { orderBy: { createdAt: "asc" }, select: { id: true, text: true, update: true, done: true, carryoverReady: true, convertedTaskId: true } },
        dailyFocusItems: { orderBy: { sortOrder: "asc" }, select: { id: true, outcome: true, progressUpdate: true, status: true, mustCloseToday: true, convertedTaskId: true } },
        quickUpdates: { orderBy: { createdAt: "asc" }, select: { id: true, text: true, followUpNeeded: true, dueWindow: true, carryoverReady: true, convertedTaskId: true } },
        reportDrafts: { where: { cadence: "DAILY" }, orderBy: { version: "desc" }, take: 1, select: { id: true, title: true, version: true } }
      }
    });
    return NextResponse.json({ before, days: records.map(record => ({ ...record, date: record.boardDay.date.toISOString().slice(0,10), boardDay: undefined })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Unable to load past workbook activity." }, { status: 500 }); }
}
