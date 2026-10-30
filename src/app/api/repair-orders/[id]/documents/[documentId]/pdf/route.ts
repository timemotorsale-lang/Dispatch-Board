import { getCurrentUser } from "@/server/auth/current-user";
import { getServiceDocumentForPrint } from "@/server/repair-order/document-service";
import { createServiceDocumentPdf, serviceDocumentFilename } from "@/server/repair-order/service-document-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await context.params;
  try {
    const document = await getServiceDocumentForPrint(await getCurrentUser(), id, documentId);
    const bytes = await createServiceDocumentPdf(document.content);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${serviceDocumentFilename(document.content.number)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF download could not be prepared. Try Print instead.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : message === "Service document was not found." ? 404 : 500;
    const safe = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
    const href = `/service-documents?${new URLSearchParams({ repairOrderId: id, documentId, workspace: "1" })}`;
    const detail = status === 401 ? "Sign in again to download this document." : status === 403 ? "Your account cannot download this document." : message.startsWith("This document needs browser printing") || message.startsWith("Document integrity") || status === 404 ? message : "The PDF could not be prepared. Return to the document and use Print, or try again.";
    return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PDF unavailable</title><body><main><h1>PDF unavailable</h1><p>${safe(detail)}</p><a href="${safe(href)}">Return to the document</a></main></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }
}
