import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { saveSalesDocument } from "@/server/sales-documents/service";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { salesDocumentsFailure } from "@/server/sales-documents/http";

export async function POST(request: Request, context: { params: Promise<{ jacketId: string }> }) {
  try {
    const user = await getCurrentUser(), form = await request.formData(), file = form.get("file");
    if (!(file instanceof File)) throw new SalesDocumentsError("Choose a document to upload.");
    if (file.size > 25 * 1024 * 1024) throw new SalesDocumentsError("Choose a file up to 25 MB.");
    const captureMethod = form.get("captureMethod");
    if (captureMethod !== null && captureMethod !== "DOCUMENT_SCAN") throw new SalesDocumentsError("Choose a supported capture method.");
    return NextResponse.json(await saveSalesDocument(user, (await context.params).jacketId, {
      bytes: new Uint8Array(await file.arrayBuffer()), fileName: file.name, contentType: file.type, documentType: String(form.get("documentType") ?? "supplemental"), signed: form.get("signed") === "true", expectedRevision: form.has("revision") ? Number(form.get("revision")) : undefined, captureMethod: captureMethod === "DOCUMENT_SCAN" ? "DOCUMENT_SCAN" : undefined
    }), { status: 201 });
  } catch (error) { return salesDocumentsFailure(error); }
}
