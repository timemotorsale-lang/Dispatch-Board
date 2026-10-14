import { NextResponse } from "next/server";
import { WorkdayQuickUpdateCategory } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { validFlowDate } from "@/features/advisor/workbook-flow-dates";

const reminderCategories = new Set<WorkdayQuickUpdateCategory>(Object.values(WorkdayQuickUpdateCategory));

function normalizeReminderText(value: unknown) {
  if (typeof value !== "string") throw new Error("Reminder reason is required.");
  const normalized = value.trim();
  if (!normalized) throw new Error("Reminder reason is required.");
  return normalized.slice(0, 1000);
}

function normalizeReminderCategory(value: unknown) {
  if (typeof value !== "string" || !reminderCategories.has(value as WorkdayQuickUpdateCategory)) throw new Error("Choose a valid reminder category.");
  return value as WorkdayQuickUpdateCategory;
}

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

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  const id = typeof payload?.id === "string" ? payload.id : "";
  if (!id || id.startsWith("checklist:")) {
    return NextResponse.json({ error: "Only Quick Update reminders can be edited here." }, { status: 400 });
  }

  try {
    const text = normalizeReminderText(payload?.text);
    const category = normalizeReminderCategory(payload?.category);
    const existing = await prisma.workdayQuickUpdate.findFirst({
      where: { id, workbook: { userId: user.id } },
      select: { id: true }
    });
    if (!existing) return NextResponse.json({ error: "Reminder was not found." }, { status: 404 });

    const reminder = await prisma.workdayQuickUpdate.update({
      data: { category, text },
      where: { id },
      select: {
        category: true,
        company: true,
        convertedTaskId: true,
        dueWindow: true,
        id: true,
        person: true,
        phoneNumber: true,
        text: true
      }
    });
    return NextResponse.json({ reminder: { ...reminder, date: reminder.dueWindow } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reminder could not be updated." }, { status: 400 });
  }
}
