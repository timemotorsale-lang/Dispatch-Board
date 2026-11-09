import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { canManageAssignments } from "@/server/policies/access";
import { flowDay, flowMidnight, shiftFlowDate, validFlowDate } from "@/features/advisor/workbook-flow-dates";
import { isTaskOccurrence, parseTaskRepeat, taskOccurrences } from "@/lib/calendar-task-repeat";
import { listActiveUserSummaries } from "@/server/services/user-summary";
import { createManualTask } from "@/server/services/task-create-service";
import { createRepeatingDispatchTask } from "@/server/services/dispatch-task-repeat-service";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";

const personalFields = {
  id: true, title: true, notes: true, localDate: true, localTime: true, completedAt: true,
  listId: true, repeat: true, deadline: true, starredAt: true, archivedAt: true, position: true
} as const;
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function withCalendarStorage(handler: () => Promise<Response>) {
  try {
    if (!prisma.personalCalendarTask || !prisma.personalTaskList || !prisma.personalTaskOccurrence) {
      return reply({ error: "The task calendar needs an updated database client. Reload the app after the server is updated." }, 503);
    }
    return await handler();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)) {
      return reply({ error: "The task calendar database update is pending. Try again after it is applied." }, 503);
    }
    throw error;
  }
}

export function GET(request: Request) {
  return withCalendarStorage(() => readTasks(request));
}

async function readTasks(request: Request) {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Authentication required." }, 401);

  const params = new URL(request.url).searchParams;
  const start = params.get("start");
  const end = params.get("end");
  const windowRequested = start !== null || end !== null;
  if (windowRequested && (!start || !end || !validFlowDate(start) || !validFlowDate(end) || end <= start || Date.parse(end) - Date.parse(start) > 42 * 86400000)) {
    return reply({ error: "Choose a valid task date range." }, 400);
  }

  if (!windowRequested && params.get("staff") === "1") {
    const staff = canManageAssignments(user) ? await listActiveUserSummaries() : [];
    return reply({ staff: staff.filter(person => person.id !== user.id).map(person => ({ id: person.id, name: person.name })) });
  }
  if (!windowRequested && params.get("lists") === "1") {
    return reply({ lists: await prisma.personalTaskList.findMany({
      where: { userId: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" }
    }) });
  }
  const today = flowDay(new Date().toISOString());
  const [personal, dispatch, lists] = await Promise.all([
    prisma.personalCalendarTask.findMany({
      where: {
        userId: user.id,
        ...(start && end ? { archivedAt: null, OR: [
          { localDate: { gte: start, lt: end } },
          { localDate: { lt: start }, repeat: { not: Prisma.AnyNull } }
        ] } : {})
      },
      select: { ...personalFields, occurrences: { select: { localDate: true }, where: { localDate: start && end ? { gte: start, lt: end } : { gte: today } } } },
      orderBy: [{ completedAt: { sort: "asc", nulls: "first" } }, { localDate: "asc" }, { createdAt: "desc" }]
    }),
    start && end ? prisma.task.findMany({
      where: { assignedUserId: user.id, dueAt: { gte: new Date(flowMidnight(start)), lt: new Date(flowMidnight(end)) } },
      select: { id: true, title: true, dueAt: true, status: true, workflowArea: true, requiresManagerApproval: true, templateSnapshot: true },
      orderBy: { dueAt: "asc" }
    }) : [],
    prisma.personalTaskList.findMany({ where: { userId: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);

  return reply({
    lists,
    tasks: [
      ...personal.flatMap(({ occurrences, ...task }) => {
        const repeat = parseTaskRepeat(task.repeat);
        const ordinary = { ...task, repeat, scope: "personal", completed: Boolean(task.completedAt) };
        if (!repeat || !task.localDate) return !start || (task.localDate && task.localDate >= start && task.localDate < end!) ? [ordinary] : [];
        const done = new Set(occurrences.map(entry => entry.localDate));
        const listStart = task.localDate > today ? task.localDate : today;
        const dates = taskOccurrences(task.localDate, repeat, start ?? listStart, end ?? shiftFlowDate(listStart, 366 * 25), !windowRequested, windowRequested ? undefined : done);
        if (!windowRequested && !dates.length) return [{ ...ordinary, repeatEnded: true, completed: true }];
        return dates.map(date => ({ ...ordinary, id: `${task.id}:${date}`, seriesId: task.id, localDate: date, completed: done.has(date) }));
      }),
      ...dispatch.map(task => {
        const snapshot = task.templateSnapshot;
        const details = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : null;
        const allDay = details?.calendarAllDay === true;
        const intake = details?.intake;
        return {
          id: task.id, title: task.title, scope: "dispatch", localDate: flowDay(task.dueAt.toISOString()),
          workflowArea: task.workflowArea,
          workType: intake && typeof intake === "object" && !Array.isArray(intake) && typeof intake.intakeType === "string" ? intake.intakeType : null,
          localTime: allDay ? null : timeFormat.format(task.dueAt), completed: task.status === "COMPLETED",
          canComplete: !task.requiresManagerApproval && (task.status === "NOT_STARTED" || task.status === "IN_PROGRESS")
        };
      })
    ]
  });
}

export function POST(request: Request) {
  return withCalendarStorage(() => saveTask(request));
}

async function saveTask(request: Request) {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Authentication required." }, 401);
  const input = await request.json().catch(() => null);
  if (input?.action === "reorder") {
    const ids: unknown = input.ids;
    if (!Array.isArray(ids) || ids.length > 500 || ids.some(id => typeof id !== "string") || new Set(ids).size !== ids.length) return reply({ error: "Choose a valid task order." }, 400);
    await prisma.$transaction(ids.map((id, index) => prisma.personalCalendarTask.updateMany({
      where: { id, userId: user.id, listId: typeof input.listId === "string" ? input.listId : null },
      data: { position: ids.length - index }
    })));
    return reply({ saved: true });
  }
  if (input?.action === "createList" || input?.action === "renameList") {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name || name.length > 60 || name.toLowerCase() === "personal") return reply({ error: "Choose a list name of up to 60 characters." }, 400);
    if (input.action === "createList") {
      const list = await prisma.personalTaskList.upsert({
        where: { userId_name: { userId: user.id, name } }, update: {}, create: { userId: user.id, name }
      });
      return reply({ list }, 201);
    }
    if (typeof input.listId !== "string") return reply({ error: "List not found." }, 404);
    try {
      const result = await prisma.personalTaskList.updateMany({ where: { id: input.listId, userId: user.id }, data: { name } });
      return result.count ? reply({ saved: true }) : reply({ error: "List not found." }, 404);
    } catch {
      return reply({ error: "That list name is already in use." }, 409);
    }
  }
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const notes = typeof input?.notes === "string" ? input.notes.trim() : "";
  const localDate = input?.localDate;
  const localTime = input?.localTime;
  const requestId = input?.requestId;
  if (!title || title.length > 160 || notes.length > 4000) {
    return reply({ error: "Enter a title of up to 160 characters and notes of up to 4,000 characters." }, 400);
  }
  if ((localDate !== null && (typeof localDate !== "string" || !validFlowDate(localDate))) ||
      (localTime !== null && (!localDate || typeof localTime !== "string" || !validTime.test(localTime)))) {
    return reply({ error: "Choose a valid task date and time." }, 400);
  }
  if (input.scope === "dispatch") {
    if (input.listId || input.deadline) return reply({ error: "Personal lists and separate deadlines are available for personal tasks." }, 400);
    if (!localDate) return reply({ error: "Choose a due date for this Dispatch task." }, 400);
    const assignedUserId = typeof input.assignedUserId === "string" && input.assignedUserId ? input.assignedUserId : user.id;
    if (assignedUserId !== user.id && !canManageAssignments(user)) return reply({ error: "You can only assign a task to yourself." }, 403);
    const minutes = localTime ? Number(localTime.slice(0, 2)) * 60 + Number(localTime.slice(3)) : 1439;
    try {
      const taskInput = {
        title, description: notes, assignedUserId, boardDate: localDate,
        dueAt: locationLocalDateMinuteToInstant({ localDate, minuteOfDay: minutes, timezone: "America/Chicago" }),
        workflowArea: input.workflowArea, calendarAllDay: localTime === null,
        customerReference: input.customerReference,
        vehicleReference: input.vehicleReference
      };
      if (input.repeat) return reply(await createRepeatingDispatchTask(user, taskInput, input.repeat, requestId, localTime ?? "23:59"), 201);
      const task = await createManualTask(user, taskInput);
      return reply({ task }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.startsWith("Assigned user") || message.startsWith("Task creation requires")) return reply({ error: message }, 400);
      return reply({ error: "Unable to create the Dispatch task. Check My Tasks before retrying." }, 500);
    }
  }
  if (input.scope !== "personal" || typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId)) {
    return reply({ error: "Choose a valid task list." }, 400);
  }
  const repeat = parseTaskRepeat(input.repeat);
  const deadline = input.deadline ?? null;
  const listId = input.listId ?? null;
  if (input.repeat && (!repeat || !localDate || (repeat.until && repeat.until < localDate))) return reply({ error: "Choose a valid repeat schedule and end date." }, 400);
  if (deadline !== null && (typeof deadline !== "string" || !validFlowDate(deadline))) return reply({ error: "Choose a valid deadline." }, 400);
  if (listId !== null && (typeof listId !== "string" || !await prisma.personalTaskList.findFirst({ where: { id: listId, userId: user.id }, select: { id: true } }))) {
    return reply({ error: "List not found." }, 404);
  }
  const task = await prisma.personalCalendarTask.upsert({
    where: { userId_requestId: { userId: user.id, requestId } },
    create: { userId: user.id, requestId, title, notes, localDate, localTime, listId, deadline, ...(repeat ? { repeat } : {}) },
    update: {},
    select: personalFields
  });
  return reply({ task }, 201);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Authentication required." }, 401);
  const input = await request.json().catch(() => null);
  if (input?.action === "stopRepeat") {
    if (typeof input.id !== "string" || typeof input.occurrence !== "string" || !validFlowDate(input.occurrence)) return reply({ error: "Choose an occurrence." }, 400);
    const task = await prisma.personalCalendarTask.findFirst({ where: { id: input.id, userId: user.id }, select: { localDate: true, repeat: true } });
    const repeat = parseTaskRepeat(task?.repeat);
    if (!repeat || !task?.localDate || !isTaskOccurrence(task.localDate, input.occurrence, repeat)) return reply({ error: "Task occurrence not found." }, 404);
    const result = await prisma.personalCalendarTask.updateMany({
      where: { id: input.id, userId: user.id, repeat: { equals: repeat } }, data: { repeat: { ...repeat, until: input.occurrence } }
    });
    return result.count ? reply({ saved: true }) : reply({ error: "The repeat schedule changed. Refresh and try again." }, 409);
  }
  if (typeof input?.id === "string" && typeof input.starred === "boolean") {
    const result = await prisma.personalCalendarTask.updateMany({ where: { id: input.id, userId: user.id }, data: { starredAt: input.starred ? new Date() : null } });
    return result.count ? reply({ saved: true }) : reply({ error: "Task not found." }, 404);
  }
  if (input?.action === "restore" && typeof input.id === "string") {
    const result = await prisma.personalCalendarTask.updateMany({
      where: { id: input.id, userId: user.id }, data: { archivedAt: null }
    });
    return result.count ? reply({ saved: true }) : reply({ error: "Task not found." }, 404);
  }
  if (typeof input?.id !== "string" || typeof input.completed !== "boolean") {
    return reply({ error: "Choose a task and completion status." }, 400);
  }
  if (input.occurrence !== undefined) {
    const task = await prisma.personalCalendarTask.findFirst({ where: { id: input.id, userId: user.id, archivedAt: null }, select: { localDate: true, repeat: true } });
    const repeat = parseTaskRepeat(task?.repeat);
    if (!repeat || !task?.localDate || typeof input.occurrence !== "string" || !validFlowDate(input.occurrence) || !isTaskOccurrence(task.localDate, input.occurrence, repeat)) {
      return reply({ error: "Task occurrence not found." }, 404);
    }
    const key = { taskId: input.id, localDate: input.occurrence };
    if (input.completed) await prisma.personalTaskOccurrence.upsert({ where: { taskId_localDate: key }, create: key, update: {} });
    else await prisma.personalTaskOccurrence.deleteMany({ where: key });
    return reply({ saved: true });
  }
  const result = await prisma.personalCalendarTask.updateMany({
    where: { id: input.id, userId: user.id, repeat: { equals: Prisma.AnyNull } },
    data: { completedAt: input.completed ? new Date() : null }
  });
  return result.count ? reply({ saved: true }) : reply({ error: "Task not found." }, 404);
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Authentication required." }, 401);
  const { action, listId } = await request.json().catch(() => ({})) ?? {};
  if (listId !== null && (typeof listId !== "string" || !await prisma.personalTaskList.findFirst({ where: { id: listId, userId: user.id } }))) {
    return reply({ error: "List not found." }, 404);
  }
  if (action === "deleteList" && listId) {
    await prisma.personalTaskList.deleteMany({ where: { id: listId, userId: user.id } });
    return reply({ saved: true });
  }
  const where = { userId: user.id, listId, repeat: { equals: Prisma.AnyNull } };
  if (action === "deleteCompleted") {
    const result = await prisma.personalCalendarTask.deleteMany({ where: { ...where, completedAt: { not: null } } });
    return reply({ count: result.count });
  }
  if (action === "archiveOld") {
    const cutoff = shiftFlowDate(flowDay(new Date().toISOString()), -30);
    const result = await prisma.personalCalendarTask.updateMany({
      where: { ...where, archivedAt: null, completedAt: { lt: new Date(flowMidnight(cutoff)) } }, data: { archivedAt: new Date() }
    });
    return reply({ count: result.count });
  }
  return reply({ error: "Choose a list action." }, 400);
}
