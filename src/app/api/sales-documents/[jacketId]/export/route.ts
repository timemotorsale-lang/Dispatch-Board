import { getCurrentUser } from "@/server/auth/current-user";
import { exportSalesDocumentPacket } from "@/server/sales-documents/service";
import { salesDocumentsFailure, salesDocumentResponse } from "@/server/sales-documents/http";

export async function GET(request: Request, context: { params: Promise<{ jacketId: string }> }) {
  try {
    const query = new URL(request.url).searchParams;
    return salesDocumentResponse(await exportSalesDocumentPacket(await getCurrentUser(), (await context.params).jacketId, Number(query.get("version")), query.get("format") === "pdf"), true);
  } catch (error) { return salesDocumentsFailure(error); }
}
