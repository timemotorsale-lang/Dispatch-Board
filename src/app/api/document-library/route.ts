import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  DOCUMENT_LIBRARY_ERROR_CONTRACT_VERSION,
  DocumentLibraryError,
  type DocumentLibraryFailureCode
} from "@/server/document-library/domain";
import { getDocumentLibrary } from "@/server/document-library/service";

const TYPED_CODES = new Set<DocumentLibraryFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "DOCUMENT_LIBRARY_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "DOCUMENT_LIBRARY_NOT_AUTHORIZED") return 403;
  return 500;
}

export async function GET() {
  try {
    return NextResponse.json(await getDocumentLibrary(await getCurrentUser()));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as DocumentLibraryFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: DOCUMENT_LIBRARY_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "Document Library is temporarily unavailable.",
      retryable: error instanceof DocumentLibraryError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
