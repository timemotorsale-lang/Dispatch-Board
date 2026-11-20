import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { repairPrioritySources } from "@/lib/repair-priority-source";
import { INITIAL_MINNEAPOLIS_LOCATION as location } from "@/server/appointments/location-foundation";
import { getCurrentUser } from "@/server/auth/current-user";
import type { Prisma } from "@prisma/client";
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
  if (error instanceof Error && "code" in error && error.code === "P2034") {
    return NextResponse.json({ error: "This priority or checklist changed. Refresh and try again." }, { status: 409 });
  }
  return error instanceof QueueError
    ? NextResponse.json({ error: error.message }, { status: error.status })
    : NextResponse.json({ error: "Daily Priorities is temporarily unavailable." }, { status: 500 });
}

function text(value: unknown, limit: number) {
  if (typeof value !== "string" || value.length > limit) throw new QueueError("Check the length of the priority details.");
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
  if (!user?.isActive) throw new QueueError("Sign in to open Daily Priorities.", 401);
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
    throw new QueueError("Location access is required to open Daily Priorities.", 403);
  }
  return { user, today, membership, canPlan: isManager(user) || isAppointmentCoordinator(user) };
}

function sourceKey(source: string) {
  return createHash("sha256").update(source).digest("hex");
}

async function recordActivity(
  tx: Prisma.TransactionClient, today: string, actorUserId: string,
  action: string, message: string, metadata: Prisma.InputJsonObject
) {
  const date = new Date(today);
  const boardDay = await tx.boardDay.upsert({ where: { date }, create: { date }, update: {}, select: { id: true } });
  await tx.activityEvent.create({
    data: {
      boardDayId: boardDay.id, actorUserId, eventType: `daily_priority.${action}`, message,
      metadata: { ...metadata, locationId: location.id }
    }
  });
}

function ownedChecklist(userId: string): Prisma.WorkdayWorkbookWhereInput {
  return { userId, scope: { in: ["COO", "STAFF"] } };
}

export async function GET(request: Request) {
  try {
    const { user, today, membership, canPlan } = await access();
    const params = new URL(request.url).searchParams;
    const requestedDate = planDate(params.get("date") ?? today);
    const linkRow = params.get("linkRow");
    const lookup = async (db: Prisma.TransactionClient) => {
      const handoff = canPlan && linkRow ? await db.repairPriority.findFirst({
        where: { id: text(linkRow, 120), locationId: location.id }, select: { planDate: true }
      }) : null;
      const date = handoff?.planDate ?? requestedDate;
      const rows = await db.repairPriority.findMany({
        where: { locationId: location.id, planDate: date },
        select: {
          id: true,
          checklistItemId: true,
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
      });
      return { date, rows };
    };
    const [{ date, rows }, staff] = await Promise.all([
      canPlan && linkRow ? prisma.$transaction(lookup, { isolationLevel: "RepeatableRead" }) : lookup(prisma),
      prisma.userLocationAccess.findMany({
        where: membership,
        select: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } }
      })
    ]);
    const sources = rows.length ? await prisma.workdayChecklistItem.findMany({
      where: { id: { in: rows.map((row) => row.checklistItemId) }, workbook: ownedChecklist(user.id) },
      select: { id: true, workbook: { select: { scope: true, boardDay: { select: { date: true } } } } }
    }) : [];
    const ownedSources = new Map(sources.map(({ id, workbook }) => [id, workbook]));
    return NextResponse.json({
      date, today, canPlan, viewerId: user.id,
      staff: staff.map(({ user: member }) => member),
      rows: rows.map(({ checklistItemId, ...row }) => {
        const source = ownedSources.get(checklistItemId);
        const sourceHref = source
          ? `/vehicles/coo-workbook/checklist?date=${source.boardDay.date.toISOString().slice(0, 10)}&workbookScope=${source.scope === "COO" ? "COO" : "MY"}#source-${encodeURIComponent(checklistItemId)}`
          : null;
        return { ...row, sourceHref };
      })
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") throw new QueueError("Same-site request required.", 403);
    const { user, today, membership, canPlan } = await access();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") throw new QueueError("A Daily Priorities action is required.");

    if (body.action === "publish" || body.action === "refine_source") {
      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.workdayChecklistItem.findFirst({
          where: { id: text(body.itemId, 120), workbook: { ...ownedChecklist(user.id), status: "ACTIVE" } },
          include: { workbook: { include: { boardDay: true } } }
        });
        if (!item) throw new QueueError("Open your own active workbook to change or publish this item.", 403);
        const available = repairPrioritySources(item);
        if (body.action === "refine_source") {
          const previous = text(body.source, 5000);
          const revised = text(body.text, 5000);
          const entry = available.find(({ source }) => source === previous);
          if (!previous || !entry) throw new QueueError("This saved update changed. Refresh the checklist.", 409);
          if (!revised || /[\r\n]/.test(revised)) throw new QueueError("Enter a single line for the checklist update.");
          if (revised === entry.text) return { ok: true };
          const prefix = previous.slice(0, previous.length - entry.text.length);
          const replacement = prefix ? `${prefix}${revised}` : `${new Date().toISOString()}|${revised}`;
          const lines = item.update.split("\n");
          if (lines.some((line) => line.trim() === replacement)) {
            throw new QueueError("This correction overlaps another saved update.");
          }
          const update = lines.map((line) => line.trim() === previous ? replacement : line).join("\n");
          if (update.length > 5000) throw new QueueError("Keep the combined checklist updates within 5,000 characters.");
          await tx.workdayChecklistItem.update({ where: { id: item.id }, data: { update } });
          await tx.repairPriority.updateMany({
            where: { locationId: location.id, checklistItemId: item.id, sourceKey: sourceKey(previous) },
            data: { sourceKey: sourceKey(replacement) }
          });
          await recordActivity(tx, today, user.id, "source_refined", "Refined a Daily Priorities checklist update.", {
            checklistItemId: item.id
          });
          return { ok: true, update };
        }
        const selection: unknown = body.sources;
        if (!Array.isArray(selection) || !selection.length || selection.length > 100 ||
          selection.some((source) => typeof source !== "string" || !available.some((entry) => entry.source === source))) {
          throw new QueueError("Select saved workbook entries to publish. Refresh if the checklist changed.");
        }
        if (selection.includes("") && body.expectedTitle !== item.text) {
          throw new QueueError("The checklist title changed. Refresh and select the entry again.", 409);
        }
        const date = item.workbook.boardDay.date.toISOString().slice(0, 10);
        if (date !== today || (body.date !== undefined && body.date !== today)) {
          throw new QueueError("Open today’s checklist to publish Daily Priorities.", 409);
        }
        const published = await tx.repairPriority.createManyAndReturn({
          data: available.filter(({ source }) => selection.includes(source)).map(({ source, text: summary }) => ({
            locationId: location.id,
            checklistItemId: item.id,
            sourceKey: sourceKey(source),
            summary,
            planDate: date,
            priority: item.status === "RED" ? 1 : 2
          })),
          skipDuplicates: true, select: { id: true }
        });
        if (published.length) await recordActivity(tx, today, user.id, "published", "Published Daily Priorities.", {
          checklistItemId: item.id, priorityIds: published.map(({ id }) => id), planDate: date
        });
        return { count: published.length, date };
      }, { isolationLevel: "Serializable" });
      return NextResponse.json(result);
    }

    if (!["save", "claim", "carry"].includes(body.action)) throw new QueueError("Unknown Daily Priorities action.");
    const row = await prisma.repairPriority.findFirst({
      where: { id: text(body.id, 120), locationId: location.id },
      include: { task: { select: { status: true } } }
    });
    if (!row) throw new QueueError("Priority not found.", 404);
    if (body.version !== row.version) throw new QueueError("This priority changed. Refresh and try again.", 409);
    const where = { id: row.id, locationId: location.id, version: row.version };
    const open = row.status !== "DONE" && row.task?.status !== "COMPLETED";
    const carryDate = (value: unknown) => {
      const date = planDate(value);
      if (!open || date < today || date <= row.planDate) {
        throw new QueueError("Choose a later plan date on or after today for an unfinished priority.");
      }
      return date;
    };

    if (body.action === "claim" || body.action === "carry") {
      const claim = body.action === "claim";
      if (claim) {
        if (row.planDate !== today || row.ownerUserId || row.status !== "READY" || !open) {
          throw new QueueError("Only an unassigned, ready priority on today’s board can be claimed.", 409);
        }
      } else if (!canPlan && row.ownerUserId !== user.id && !await prisma.workdayChecklistItem.findFirst({
        where: { id: row.checklistItemId, workbook: ownedChecklist(user.id) }, select: { id: true }
      })) {
        throw new QueueError("Only the publisher, assigned owner, or planner can carry this priority forward.", 403);
      }
      const date = claim ? row.planDate : carryDate(body.planDate);
      await prisma.$transaction(async (tx) => {
        const updated = await tx.repairPriority.updateMany({
          where: claim ? {
            ...where, ownerUserId: null, planDate: today, status: "READY",
            OR: [{ taskId: null }, { task: { status: { not: "COMPLETED" } } }]
          } : { ...where, OR: [{ taskId: null }, { task: { status: { not: "COMPLETED" } } }] },
          data: { ...(claim ? { ownerUserId: user.id } : { planDate: date }), version: { increment: 1 } }
        });
        if (!updated.count) throw new QueueError("This priority changed. Refresh and try again.", 409);
        await recordActivity(tx, today, user.id, claim ? "claimed" : "carried", claim
          ? "Claimed a Daily Priority." : "Carried a Daily Priority forward.", {
          priorityId: row.id, previousPlanDate: row.planDate, planDate: date
        });
      });
      return NextResponse.json({ ok: true, date });
    }
    if (!canPlan && row.ownerUserId !== user.id) throw new QueueError("Only the planner or assigned owner can update this priority.", 403);
    const status = text(body.status, 20);
    const blocker = text(body.blocker, 500);
    if (!["READY", "IN_PROGRESS", "BLOCKED", "DONE"].includes(status)) throw new QueueError("Select a valid status.");
    if (status === "BLOCKED" && !blocker) throw new QueueError("Describe what is blocking the priority.");

    const plan = {
      summary: row.summary, vehicle: row.vehicle, planDate: row.planDate, priority: row.priority,
      durationMinutes: row.durationMinutes, ownerUserId: row.ownerUserId, taskId: row.taskId, appointmentId: row.appointmentId
    };
    if (canPlan) {
      plan.summary = text(body.summary, 5000);
      plan.vehicle = text(body.vehicle, 250);
      if (body.planDate !== undefined && body.planDate !== row.planDate) {
        throw new QueueError("Use Carry forward to move this priority to another date.", 409);
      }
      if (!plan.summary || ![1, 2, 3].includes(body.priority)) throw new QueueError("Enter a summary and priority.");
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
    await prisma.$transaction(async (tx) => {
      const updated = await tx.repairPriority.updateMany({
        where,
        data: { ...plan, status, blocker, nextAction: text(body.nextAction, 500), version: { increment: 1 } }
      });
      if (!updated.count) throw new QueueError("This priority changed. Refresh and try again.", 409);
      await recordActivity(tx, today, user.id, "updated", "Updated a Daily Priority.", {
        priorityId: row.id, planDate: row.planDate,
        previousStatus: row.status, status, previousOwnerUserId: row.ownerUserId, ownerUserId: plan.ownerUserId
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
