import { NextResponse } from "next/server";
import { SalesDocumentsError } from "./domain";
import { vehicleCustodyBlocker } from "@/server/deal-continuity/custody-error";

export function salesDocumentsFailure(error: unknown) {
  const blocker = vehicleCustodyBlocker(error);
  if (blocker) return NextResponse.json({ error: blocker }, { status: 409 });
  return NextResponse.json({ error: error instanceof SalesDocumentsError ? error.message : "Sales Documents could not complete this action. Check database and document storage availability." }, { status: error instanceof SalesDocumentsError ? error.status : 503 });
}

export function salesDocumentResponse(file: { bytes: Uint8Array; contentType: string; fileName: string }, download = false) {
  const safeInline = ["application/pdf", "image/png", "image/jpeg"].includes(file.contentType);
  return new NextResponse(new Uint8Array(file.bytes), { headers: {
    "Content-Type": file.contentType, "Content-Disposition": `${download || !safeInline ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox"
  } });
}
