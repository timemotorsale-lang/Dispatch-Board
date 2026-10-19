import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { listTaskCollaborators, replaceTaskCollaborators } from "@/server/services/task-collaborators";

type Context = { params: Promise<{ id: string }> };
function status(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Task not found.") return 404;
  if (message === "Only the task owner, assignee, or a manager can manage collaborators.") return 403;
  if (message.includes("collaborator") || message.includes("Task id")) return 400;
  return 500;
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to manage task collaborators right now.";
  return NextResponse.json({ error: message }, { status: status(message) });
}
export async function GET(_request: Request, context: Context) {
  try { return NextResponse.json({ collaborators: await listTaskCollaborators(await getCurrentUser(), (await context.params).id) }); } catch (error) { return failure(error); }
}
export async function PUT(request: Request, context: Context) {
  try { return NextResponse.json({ collaborators: await replaceTaskCollaborators(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null)) }); } catch (error) { return failure(error); }
}
