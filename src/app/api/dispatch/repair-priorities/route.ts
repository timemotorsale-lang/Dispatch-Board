import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { repairPrioritySources } from "@/lib/repair-priority-source";
import { INITIAL_MINNEAPOLIS_LOCATION as location } from "@/server/appointments/location-foundation";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { isAppointmentCoordinator, isManager } from "@/server/policies/access";
import { getTaskReadModelById } from "@/server/services/task-read";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";

class QueueError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function failure(error: unknown) {
  return error instanceof QueueError
    ? NextResponse.json({ error: error.message }, { status: error.status })
    : NextResponse.json({ error: "The repair queue is temporarily unavailable." }, { status: 500 });
}

function text(value: unknown, limit: number) {
  if (typeof value !== "string" || value.length > limit) throw new QueueError("Check the length of the repair details.");
  return value.trim();
}

function planDate(value: unknown) {
  try {
    return normalizeBoardDate(text(value, 10));
  } catch {
    throw new QueueError("Select a valid plan date.");
  }
}

async function access() {
  const user = await getCurrentUser();
  if (!user?.isActive) throw new QueueError("Sign in to open repair priorities.", 401);
  const today = getBoardDateInTimeZone(new Date(), location.timezone);
  const date = new Date(today);
  const membership = {
    locationId: location.id,
    canViewSchedule: true,
    validFrom: { lte: date },
    OR: [{ validTo: null }, { validTo: { gte: date } }],
    user: { isActive: true }
  };
  if (!await prisma.userLocationAccess.findFirst({ where: { ...membership, userId: user.id } })) {
    throw new QueueError("Location access is required to open repair priorities.", 403);
  }
  return { user, today, membership, canPlan: isManager(user) || isAppointmentCoordinator(user) };
}

export async function GET(request: Request) {
  try {
    const { user, today, membership, canPlan } = await access();
    const date = planDate(new URL(request.url).searchParams.get("date") ?? today);
    const [rows, staff] = await Promise.all([
      prisma.repairPriority.findMany({
        where: { locationId: location.id, OR: [
          { planDate: date },
          { planDate: { lt: date }, status: { not: "DONE" }, OR: [
            { taskId: null },
            { task: { status: { not: "COMPLETED" } } }
          ] }
        ] },
        select: {
          id: true,
          version: true,
          summary: true,
          vehicle: true,
          planDate: true,
          priority: true,
          status: true,
          nextAction: true,
          blocker: true,
          durationMinutes: true,
          ownerUserId: true,
          appointment: { select: { appointmentNumber: true, bookingStatus: true, startsAt: true } },
          task: { select: { id: true, status: true, dueAt: true } }
        },
        orderBy: [{ priority: "asc" }, { planDate: "asc" }, { createdAt: "asc" }]
      }),
      prisma.userLocationAccess.findMany({
        where: membership,
        select: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } }
      })
    ]);
    return NextResponse.json({
      date, canPlan, viewerId: user.id,
      staff: staff.map(({ user: member }) => member),
      rows
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") throw new QueueError("Same-site request required.", 403);
    const { user, membership, canPlan } = await access();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") throw new QueueError("A repair queue action is required.");

    if (body.action === "publish") {
      const item = await prisma.workdayChecklistItem.findFirst({
        where: { id: text(body.itemId, 120), workbook: { scope: "COO", userId: user.id, status: "ACTIVE" } },
        include: { workbook: { include: { boardDay: true } } }
      });
      if (!item) throw new QueueError("Only the owner of an open COO workbook can publish this item.", 403);
      const available = repairPrioritySources(item);
      const selection: unknown = body.sources;
      if (!Array.isArray(selection) || !selection.length || selection.length > 100 ||
        selection.some((source) => typeof source !== "string" || !available.some((entry) => entry.source === source))) {
        throw new QueueError("Select saved workbook entries to publish. Refresh if the checklist changed.");
      }
      const date = item.workbook.boardDay.date.toISOString().slice(0, 10);
      const published = await prisma.repairPriority.createMany({
        data: available.filter(({ source }) => selection.includes(source)).map(({ source, text: summary }) => ({
          locationId: location.id,
          checklistItemId: item.id,
          sourceKey: createHash("sha256").update(source).digest("hex"),
          summary,
          planDate: date,
          priority: item.status === "RED" ? 1 : 2
        })),
        skipDuplicates: true
      });
      return NextResponse.json({ count: published.count, date });
    }

    if (body.action !== "save") throw new QueueError("Unknown repair queue action.");
    const row = await prisma.repairPriority.findFirst({
      where: { id: text(body.id, 120), locationId: location.id }
    });
    if (!row) throw new QueueError("Repair priority not found.", 404);
    if (!canPlan && row.ownerUserId !== user.id) throw new QueueError("Only the planner or assigned owner can update this repair.", 403);
    if (body.version !== row.version) throw new QueueError("This repair changed. Reload the queue and try again.", 409);
    const status = text(body.status, 20);
    const blocker = text(body.blocker, 500);
    if (!["READY", "IN_PROGRESS", "BLOCKED", "DONE"].includes(status)) throw new QueueError("Select a valid status.");
    if (status === "BLOCKED" && !blocker) throw new QueueError("Describe what is blocking the repair.");

    const plan = {
      summary: row.summary, vehicle: row.vehicle, planDate: row.planDate, priority: row.priority,
      durationMinutes: row.durationMinutes, ownerUserId: row.ownerUserId, taskId: row.taskId, appointmentId: row.appointmentId
    };
    if (canPlan) {
      plan.summary = text(body.summary, 5000);
      plan.vehicle = text(body.vehicle, 250);
      plan.planDate = planDate(body.planDate);
      if (!plan.summary || ![1, 2, 3].includes(body.priority)) throw new QueueError("Enter a repair summary and priority.");
      plan.priority = body.priority;
      if (body.durationMinutes !== null &&
        (!Number.isInteger(body.durationMinutes) || body.durationMinutes < 5 || body.durationMinutes > 1440)) {
        throw new QueueError("Estimated duration must be between 5 and 1,440 minutes.");
      }
      plan.durationMinutes = body.durationMinutes;
      plan.ownerUserId = text(body.ownerUserId, 120) || null;
      if (plan.ownerUserId && plan.ownerUserId !== row.ownerUserId &&
        !await prisma.userLocationAccess.findFirst({ where: { ...membership, userId: plan.ownerUserId } })) {
        throw new QueueError("Choose an active team member at this location.");
      }
      plan.taskId = text(body.taskId, 120) || null;
      if (plan.taskId && plan.taskId !== row.taskId &&
        !await getTaskReadModelById(user, plan.taskId).catch(() => null)) {
        throw new QueueError("Choose a task you can open.");
      }
      const number = text(body.appointmentNumber, 120);
      const appointment = number ? await prisma.appointment.findFirst({
        where: { appointmentNumber: number, locationId: location.id },
        select: { id: true }
      }) : null;
      if (number && !appointment) throw new QueueError("Enter an appointment number from this location.");
      plan.appointmentId = appointment?.id ?? null;
    }
    const updated = await prisma.repairPriority.updateMany({
      where: { id: row.id, locationId: location.id, version: row.version },
      data: { ...plan, status, blocker, nextAction: text(body.nextAction, 500), version: { increment: 1 } }
    });
    if (!updated.count) throw new QueueError("This repair changed. Reload the queue and try again.", 409);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
