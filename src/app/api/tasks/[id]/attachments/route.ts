import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { listTaskAttachments, uploadTaskAttachment } from "@/server/services/task-attachments";

type Context = { params: Promise<{ id: string }> };

function status(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Board access required.") return 403;
  if (message === "Task not found.") return 404;
  if (message.startsWith("Choose") || message.startsWith("Uploaded") || message.startsWith("Documents are") || message.startsWith("Document name")) return 400;
  return 500;
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ attachments: await listTaskAttachments(await getCurrentUser(), id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load documents.";
    return NextResponse.json({ error: message }, { status: status(message) });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    const form = await request.formData();
    return NextResponse.json({ attachment: await uploadTaskAttachment(user, id, form.get("file")) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload document.";
    return NextResponse.json({ error: message }, { status: status(message) });
  }
}
