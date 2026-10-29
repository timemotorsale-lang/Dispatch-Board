import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/current-user";
import { readDispatchTeam } from "@/server/dispatch/read";
import { executeDispatchCommand } from "@/server/dispatch/command";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone } from "@/server/validation/board-date";
function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return NextResponse.json({ error: error.code === "P2025" ? "The work record was not found." : "Team activity is temporarily unavailable. Your saved work is retained." }, { status: error.code === "P2025" ? 404 : 503 });
  const message = error instanceof Error ? error.message : "Team activity is unavailable.";
  return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : /access required|Only the|receiving person/.test(message) ? 403 : /changed|pending|already/.test(message) ? 409 : 422 });
}
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const settings = await getGenerationSettings();
    return NextResponse.json(await readDispatchTeam(user, new URL(request.url).searchParams.get("date") ?? getBoardDateInTimeZone(new Date(), settings.timezone)), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || !["http:", "https:"].includes(new URL(origin).protocol) || new URL(origin).host !== (request.headers.get("host") ?? new URL(request.url).host) || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 12000) return NextResponse.json({ error: "Team update is too large." }, { status: 413 });
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 12000) return NextResponse.json({ error: "Team update is too large." }, { status: 413 });
    return NextResponse.json(await executeDispatchCommand(user, JSON.parse(body)), { headers: { "Cache-Control": "private, no-store" } });
  }
  catch (error) { return failure(error); }
}
