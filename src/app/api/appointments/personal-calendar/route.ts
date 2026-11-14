import { NextResponse } from "next/server";
import { getCalendarUser as getCurrentUser } from "@/server/auth/workflow-user";
import { prisma } from "@/server/db/client";

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

const eventFields = { id: true, calendarId: true, title: true, startsAt: true, endsAt: true } as const;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Authentication required." }, 401);
  const params = new URL(request.url).searchParams;
  const start = new Date(params.get("start") ?? "");
  const end = new Date(params.get("end") ?? "");
  const range = +end - +start;
  if (!Number.isFinite(range) || range <= 0 || range > 43 * 86400000) {
    return reply({ error: "Choose a valid calendar range." }, 400);
  }
  const [calendars, events] = await Promise.all([
    prisma.personalCalendar.findMany({ where: { userId: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.personalCalendarEvent.findMany({
      where: { userId: user.id, startsAt: { gte: start, lt: end } },
      select: eventFields,
      orderBy: { startsAt: "asc" }
    })
  ]);
  return reply({ calendars, events });
}

async function save(request: Request, editing: boolean) {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Authentication required." }, 401);
  const input = await request.json().catch(() => null);
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  if (!editing && input?.kind === "calendar") {
    if (!title || title.length > 60) return reply({ error: "Enter a calendar name of up to 60 characters." }, 400);
    const calendar = await prisma.personalCalendar.upsert({
      where: { userId_name: { userId: user.id, name: title } },
      create: { userId: user.id, name: title },
      update: {},
      select: { id: true, name: true }
    });
    return reply({ calendar }, 201);
  }

  const startsAt = new Date(typeof input?.startsAt === "string" ? input.startsAt : "");
  const endsAt = new Date(typeof input?.endsAt === "string" ? input.endsAt : "");
  const duration = +endsAt - +startsAt;
  if (!title || title.length > 160 || !Number.isFinite(duration) || duration <= 0 || duration > 86400000) {
    return reply({ error: "Enter a title and an end time after the start, within 24 hours." }, 400);
  }
  if (input.calendarId !== null && (typeof input.calendarId !== "string" || !await prisma.personalCalendar.findUnique({
    where: { id_userId: { id: input.calendarId, userId: user.id } },
    select: { id: true }
  }))) return reply({ error: "Calendar not found." }, 404);

  const data = { title, startsAt, endsAt, calendarId: input.calendarId as string | null };
  if (editing) {
    if (typeof input.id !== "string") return reply({ error: "Event not found." }, 404);
    const result = await prisma.personalCalendarEvent.updateMany({ where: { id: input.id, userId: user.id }, data });
    return result.count ? reply({ saved: true }) : reply({ error: "Event not found." }, 404);
  }

  const event = await prisma.personalCalendarEvent.create({ data: { ...data, userId: user.id }, select: eventFields });
  return reply({ event }, 201);
}

export function POST(request: Request) {
  return save(request, false);
}

export function PATCH(request: Request) {
  return save(request, true);
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Authentication required." }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return reply({ error: "Event not found." }, 404);
  const result = await prisma.personalCalendarEvent.deleteMany({ where: { id, userId: user.id } });
  return result.count ? reply({ deleted: true }) : reply({ error: "Event not found." }, 404);
}
