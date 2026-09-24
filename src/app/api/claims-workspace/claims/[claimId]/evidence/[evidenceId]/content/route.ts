import { readFile } from "node:fs/promises";
import { basename, normalize, resolve } from "node:path";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/server/auth/current-user";
import { claimsWorkspaceDependencies } from "@/server/claims-workspace/repository-factory";
import { CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION, ClaimsWorkspaceError } from "@/server/claims-workspace/service";
import { prisma } from "@/server/db/client";
import { buildDocumentObjectKey } from "@/server/document-library/storage-adapter";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";

function safeName(value: string | null | undefined) {
  return (value || "claim-evidence").replace(/["\r\n]/g, "_");
}

function contentType(value: string | null | undefined) {
  return value?.trim() || "application/octet-stream";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wantsHtml(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html") && !accept.includes("application/json");
}

function unavailableDocumentPage(message: string, status: number) {
  const title = status === 404 ? "Claim evidence was not found" : "Original document is not available";
  return new NextResponse(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; font-family: Arial, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f7fb; color: #172033; }
      main { width: min(560px, calc(100vw - 32px)); padding: 28px; background: #fff; border: 1px solid #dbe4ef; border-radius: 12px; box-shadow: 0 18px 48px rgba(15, 23, 42, .12); }
      h1 { margin: 0 0 10px; font-size: 24px; }
      p { margin: 0 0 16px; color: #52647c; line-height: 1.55; }
      button { min-height: 40px; padding: 0 16px; border: 0; border-radius: 8px; background: #4054d6; color: white; font-weight: 700; cursor: pointer; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <p>The claim evidence summary is still saved in the workspace. Re-upload the file after document storage is available to open the original here.</p>
      <button type="button" onclick="window.close()">Close tab</button>
    </main>
  </body>
</html>`, {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff"
    },
    status
  });
}

function localObjectKey(reference: string) {
  return reference.startsWith("local-private://") ? reference.slice("local-private://".length) : "";
}

function inferContentType(fileName: string | null | undefined) {
  const normalized = (fileName ?? "").toLowerCase();
  if (normalized.endsWith(".pdf")) return "application/pdf";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
  if (normalized.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function resolveInsideRoot(rootDir: string, objectKey: string) {
  const root = resolve(rootDir);
  const target = resolve(root, normalize(objectKey));
  if (target !== root && !target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
    throw new ClaimsWorkspaceError("CLAIM_INVALID", "Stored claim evidence resolved outside the configured document root.");
  }
  return target;
}

function fallbackLocalDocument(input: {
  claim: { claimNumber?: string; customerName: string; id: string };
  contentType: string;
  documentLibraryId: string;
  fileName: string;
  organizationId: string;
}) {
  const objectKey = buildDocumentObjectKey({
    documentId: input.documentLibraryId,
    fileName: input.fileName,
    organizationId: input.organizationId,
    owner: {
      id: input.claim.id,
      label: input.claim.claimNumber ? `Claim #${input.claim.claimNumber}` : input.claim.customerName,
      type: "CLAIM"
    },
    version: 1
  });
  return {
    contentType: input.contentType,
    fileName: input.fileName,
    storageProvider: "INTERNAL",
    storageReference: `local-private://${objectKey}`
  };
}

export async function GET(request: Request, context: { params: Promise<{ claimId: string; evidenceId: string }> }) {
  const { claimId, evidenceId } = await context.params;
  try {
    await getCurrentUser();
    const dependencies = await claimsWorkspaceDependencies();
    const aggregate = await dependencies.repository.findClaimById(claimId);
    const evidence = aggregate?.evidence.find((item) => item.id === evidenceId);
    if (!aggregate || !evidence) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Claim evidence was not found.");
    if (!evidence.documentLibraryId) {
      throw new ClaimsWorkspaceError("CLAIM_INVALID", "This evidence only has metadata. Re-upload the file to open the original document.");
    }

    const runtime = resolveDocumentStorageRuntimeFromEnv();
    const localRoot = runtime.localPrivateRoot;
    let document: { contentType: string | null; fileName: string; storageProvider: string; storageReference: string } | null = null;
    try {
      document = await prisma.documentLibraryDocument.findFirst({
        select: {
          contentType: true,
          fileName: true,
          storageProvider: true,
          storageReference: true
        },
        where: {
          id: evidence.documentLibraryId,
          ownerId: aggregate.claim.id,
          ownerType: "CLAIM"
        }
      });
    } catch (caught) {
      if (
        caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === "P2021" ||
        caught instanceof Error && caught.message.includes("DocumentLibraryDocument")
      ) {
        if (!localRoot || runtime.readiness.mode !== "LOCAL_PRIVATE" || !evidence.fileName) {
          throw new ClaimsWorkspaceError("CLAIM_INVALID", "Original document storage is not available in this database yet. Re-upload after document storage migrations are applied.");
        }
        document = fallbackLocalDocument({
          claim: aggregate.claim,
          contentType: inferContentType(evidence.fileName),
          documentLibraryId: evidence.documentLibraryId,
          fileName: evidence.fileName,
          organizationId: runtime.organizationId
        });
      }
      if (!document) throw caught;
    }
    if (!document && localRoot && runtime.readiness.mode === "LOCAL_PRIVATE" && evidence.fileName) {
      document = fallbackLocalDocument({
        claim: aggregate.claim,
        contentType: inferContentType(evidence.fileName),
        documentLibraryId: evidence.documentLibraryId,
        fileName: evidence.fileName,
        organizationId: runtime.organizationId
      });
    }
    if (!document) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Stored document was not found.");

    const objectKey = localObjectKey(document.storageReference);
    if (document.storageProvider !== "INTERNAL" && document.storageProvider !== "PROVIDER") {
      throw new ClaimsWorkspaceError("CLAIM_INVALID", "This document storage provider is not available for in-app preview.");
    }
    if (!localRoot || !objectKey || runtime.readiness.mode !== "LOCAL_PRIVATE") {
      throw new ClaimsWorkspaceError("CLAIM_INVALID", "Original document preview requires configured local private document storage.");
    }

    const bytes = await readFile(resolveInsideRoot(localRoot, objectKey));
    const fileName = safeName(document.fileName || evidence.fileName || basename(objectKey));
    return new NextResponse(bytes, {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="${fileName}"`,
        "content-length": String(bytes.byteLength),
        "content-type": contentType(document.contentType),
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    const status = error instanceof ClaimsWorkspaceError
      ? error.code === "CLAIM_NOT_FOUND" ? 404 : error.code === "AUTHENTICATION_REQUIRED" ? 401 : 409
      : 500;
    const message = error instanceof Error ? error.message : "Claim evidence content could not be opened.";
    if (wantsHtml(request)) {
      return unavailableDocumentPage(message, status);
    }
    return NextResponse.json({
      code: error instanceof ClaimsWorkspaceError ? error.code : undefined,
      contractVersion: CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION,
      error: message,
      retryable: false
    }, { status });
  }
}
