import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getTaskAttachment } from "@/server/services/task-attachments";

type Context = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id, attachmentId } = await context.params;
    const document = await getTaskAttachment(await getCurrentUser(), id, attachmentId);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const disposition = download || !["application/pdf", "image/png", "image/jpeg"].includes(document.contentType) ? "attachment" : "inline";
    const fileName = document.fileName.replace(/["\r\n]/g, "_");
    return new NextResponse(Uint8Array.from(document.fileData).buffer, {
      headers: {
        "content-disposition": `${disposition}; filename="${fileName}"`,
        "content-length": String(document.fileSizeBytes),
        "content-type": document.contentType,
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open document.";
    const status = message === "Authentication required." ? 401 : message === "Board access required." ? 403 : message === "Task not found." || message === "Document not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
