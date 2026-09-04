import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { validFlowDate } from "@/features/advisor/workbook-flow-dates";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const through = params.get("through") ?? date;
  if (!validFlowDate(date) || !validFlowDate(through) || through < date || Date.parse(through) - Date.parse(date) > 30 * 86400000) {
    return NextResponse.json({ error: "A valid reminder date is required." }, { status: 400 });
  }
  try {
    // Match the follow-up date, not the day the note was written. Never expose another user's workbook.
    const reminders = await prisma.workdayQuickUpdate.findMany({
      where: { followUpNeeded: true, dueWindow: through === date ? date : { gte: date, lte: through }, workbook: { userId: user.id } },
      select: { id: true, text: true, category: true, person: true, phoneNumber: true, company: true, convertedTaskId: true, dueWindow: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
    const checklist = await prisma.workdayChecklistItem.findMany({
      where: { reminderDate: through === date ? date : { gte: date, lte: through }, done: false, workbook: { userId: user.id } },
      select: { id: true, text: true, convertedTaskId: true, reminderDate: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
    return NextResponse.json({ date, through, reminders: [...reminders.map(item => ({ ...item, date: item.dueWindow })), ...checklist.map(item => ({ ...item, date: item.reminderDate, id: `checklist:${item.id}`, category: "CHECKLIST", person: "", company: "", source: "Checklist" }))] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load scheduled reminders." }, { status: 500 });
  }
}
