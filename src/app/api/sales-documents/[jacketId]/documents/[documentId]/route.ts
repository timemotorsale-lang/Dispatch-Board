import { getCurrentUser } from "@/server/auth/current-user";
import { getSalesDocumentContent } from "@/server/sales-documents/service";
import { salesDocumentsFailure, salesDocumentResponse } from "@/server/sales-documents/http";

export async function GET(request: Request, context: { params: Promise<{ jacketId: string; documentId: string }> }) {
  try {
    const { jacketId, documentId } = await context.params;
    return salesDocumentResponse(await getSalesDocumentContent(await getCurrentUser(), jacketId, documentId), new URL(request.url).searchParams.get("download") === "1");
  } catch (error) { return salesDocumentsFailure(error); }
}
