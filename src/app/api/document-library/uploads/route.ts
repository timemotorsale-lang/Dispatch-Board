import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  DOCUMENT_LIBRARY_ERROR_CONTRACT_VERSION,
  DocumentLibraryError,
  type DocumentLibraryFailureCode
} from "@/server/document-library/domain";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { stageDocumentLibraryUpload } from "@/server/document-library/upload-service";

const TYPED_CODES = new Set<DocumentLibraryFailureCode>([
  "AUTHENTICATION_REQUIRED",
  "DOCUMENT_LIBRARY_INVALID_ACTION",
  "DOCUMENT_LIBRARY_NOT_AUTHORIZED"
]);

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "DOCUMENT_LIBRARY_NOT_AUTHORIZED") return 403;
  if (code === "DOCUMENT_LIBRARY_INVALID_ACTION") return 400;
  return 500;
}

async function payloadFromRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return {};
    const buffer = Buffer.from(await file.arrayBuffer());
    return {
      bytes: new Uint8Array(buffer),
      checksumSha256: createHash("sha256").update(buffer).digest("hex"),
      contentType: file.type,
      context: Object.fromEntries(form.entries().filter(([key]) => key !== "file")),
      fileName: file.name,
      sizeBytes: file.size
    };
  }
  return request.json().catch(() => ({}));
}

export async function POST(request: Request) {
  try {
    const storage = resolveDocumentStorageRuntimeFromEnv();
    return NextResponse.json(await stageDocumentLibraryUpload(await getCurrentUser(), await payloadFromRequest(request), {
      organizationId: storage.organizationId,
      persistSmartIntake: true,
      storageAdapter: storage.adapter
    }));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : undefined;
    const typed = typeof code === "string" && TYPED_CODES.has(code as DocumentLibraryFailureCode);
    return NextResponse.json({
      code: typed ? code : undefined,
      contractVersion: DOCUMENT_LIBRARY_ERROR_CONTRACT_VERSION,
      error: typed && error instanceof Error ? error.message : "Document upload staging is temporarily unavailable.",
      retryable: error instanceof DocumentLibraryError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
