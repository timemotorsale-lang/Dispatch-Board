import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  DOCUMENT_LIBRARY_ERROR_CONTRACT_VERSION,
  DocumentLibraryError,
  type DocumentLibraryFailureCode
} from "@/server/document-library/domain";
import { getDocumentObjectAccess } from "@/server/document-library/service";

const TYPED_CODES = new Set<DocumentLibraryFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "DOCUMENT_LIBRARY_NOT_AUTHORIZED",
  "DOCUMENT_LIBRARY_NOT_FOUND"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "DOCUMENT_LIBRARY_NOT_AUTHORIZED") return 403;
  if (code === "DOCUMENT_LIBRARY_NOT_FOUND") return 404;
  return 500;
}

export async function GET(request: Request, context: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await context.params;
  const url = new URL(request.url);
  const purpose = url.searchParams.get("purpose")?.toUpperCase() === "DOWNLOAD" ? "DOWNLOAD" : "PREVIEW";
  try {
    const access = await getDocumentObjectAccess(await getCurrentUser(), {
      documentId,
      linkedRecordAccess: url.searchParams.get("linkedRecordAccess") !== "false",
      purpose
    });
    return NextResponse.json(access, { status: access.objectAccess.allowed ? 200 : 403 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as DocumentLibraryFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: DOCUMENT_LIBRARY_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "Document object access is temporarily unavailable.",
      retryable: error instanceof DocumentLibraryError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
