import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { getTaskReadModelById } from "@/server/services/task-read";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "application/zip"
]);

async function requireTask(user: AuthenticatedUser | null, taskId: string) {
  const task = await getTaskReadModelById(user, taskId);
  if (!task) throw new Error("Task not found.");
  return task;
}

export function validateTaskAttachment(file: FormDataEntryValue | null): asserts file is File {
  if (!(file instanceof File)) throw new Error("Choose a document to upload.");
  if (!file.size) throw new Error("Uploaded document is empty.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Documents are limited to 10 MB each.");
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Choose a PDF, Word document, PNG, JPG, or ZIP file.");
  if (!file.name || file.name.length > 255) throw new Error("Document name must be 255 characters or fewer.");
}

function summary(attachment: {
  id: string;
  taskId: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: Date;
}) {
  const base = `/api/tasks/${encodeURIComponent(attachment.taskId)}/attachments/${encodeURIComponent(attachment.id)}`;
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    fileSizeBytes: attachment.fileSizeBytes,
    createdAt: attachment.createdAt.toISOString(),
    viewHref: base,
    downloadHref: `${base}?download=1`
  };
}

export async function listTaskAttachments(user: AuthenticatedUser | null, taskId: string) {
  await requireTask(user, taskId);
  const attachments = await prisma.taskAttachment.findMany({
    where: { taskId },
    select: { id: true, taskId: true, fileName: true, contentType: true, fileSizeBytes: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  });
  return attachments.map(summary);
}

export async function uploadTaskAttachment(user: AuthenticatedUser | null, taskId: string, file: FormDataEntryValue | null) {
  await requireTask(user, taskId);
  validateTaskAttachment(file);
  const attachment = await prisma.taskAttachment.create({
    data: {
      taskId,
      uploadedByUserId: user!.id,
      fileName: file.name,
      contentType: file.type,
      fileSizeBytes: file.size,
      fileData: new Uint8Array(await file.arrayBuffer())
    },
    select: { id: true, taskId: true, fileName: true, contentType: true, fileSizeBytes: true, createdAt: true }
  });
  return summary(attachment);
}

export async function getTaskAttachment(user: AuthenticatedUser | null, taskId: string, attachmentId: string) {
  await requireTask(user, taskId);
  const attachment = await prisma.taskAttachment.findFirst({ where: { id: attachmentId, taskId } });
  if (!attachment) throw new Error("Document not found.");
  return attachment;
}
