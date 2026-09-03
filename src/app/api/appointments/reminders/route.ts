import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    return NextResponse.json({ error: "A valid reminder date is required." }, { status: 400 });
  }
  try {
    // Match the follow-up date, not the day the note was written. Never expose another user's workbook.
    const reminders = await prisma.workdayQuickUpdate.findMany({
      where: { followUpNeeded: true, dueWindow: date, workbook: { userId: user.id } },
      select: { id: true, text: true, category: true, person: true, company: true, convertedTaskId: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
    const checklist = await prisma.workdayChecklistItem.findMany({
      where: { reminderDate: date, done: false, workbook: { userId: user.id } },
      select: { id: true, text: true, convertedTaskId: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
    return NextResponse.json({ date, reminders: [...reminders, ...checklist.map(item => ({ ...item, id: `checklist:${item.id}`, category: "CHECKLIST", person: "", company: "", source: "Checklist" }))] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load scheduled reminders." }, { status: 500 });
  }
}
