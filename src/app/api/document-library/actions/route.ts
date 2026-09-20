import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  DOCUMENT_LIBRARY_ERROR_CONTRACT_VERSION,
  DocumentLibraryError,
  type DocumentLibraryFailureCode
} from "@/server/document-library/domain";
import { previewDocumentLibraryProviderAction } from "@/server/document-library/service";

const TYPED_CODES = new Set<DocumentLibraryFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "DOCUMENT_LIBRARY_INVALID_ACTION",
  "DOCUMENT_LIBRARY_NOT_AUTHORIZED",
  "DOCUMENT_LIBRARY_NOT_FOUND"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "DOCUMENT_LIBRARY_NOT_AUTHORIZED") return 403;
  if (code === "DOCUMENT_LIBRARY_NOT_FOUND") return 404;
  if (code === "DOCUMENT_LIBRARY_INVALID_ACTION") return 400;
  return 500;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  try {
    return NextResponse.json(await previewDocumentLibraryProviderAction(await getCurrentUser(), payload ?? {}));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as DocumentLibraryFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: DOCUMENT_LIBRARY_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "Document Library action is temporarily unavailable.",
      retryable: error instanceof DocumentLibraryError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
