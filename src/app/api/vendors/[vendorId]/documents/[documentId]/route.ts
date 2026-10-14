import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getVendorDocumentDownload } from "@/server/vendors/vendor-service";

function statusForError(message: string) {
  if (message === "Authentication required.") return 401;
  if (message === "Vendor document not found.") return 404;
  return 500;
}

function safeFileName(fileName: string) {
  return fileName.replace(/["\r\n]/g, "_");
}

export async function GET(request: Request, context: { params: Promise<{ vendorId: string; documentId: string }> }) {
  try {
    const user = await getCurrentUser();
    const url = new URL(request.url);
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
    const { documentId, vendorId } = await context.params;
    const document = await getVendorDocumentDownload(user, vendorId, documentId);
    const body = Uint8Array.from(document.fileData).buffer;
    return new NextResponse(body, {
      headers: {
        "content-disposition": `${disposition}; filename="${safeFileName(document.fileName)}"`,
        "content-length": String(document.fileSizeBytes),
        "content-type": document.contentType || "application/octet-stream"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to download vendor document.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
