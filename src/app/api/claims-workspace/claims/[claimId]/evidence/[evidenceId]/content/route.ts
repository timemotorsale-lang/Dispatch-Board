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

export async function GET(_: Request, context: { params: Promise<{ claimId: string; evidenceId: string }> }) {
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
    const localRoot = process.env.DOCUMENT_LIBRARY_LOCAL_STORAGE_ROOT?.trim();
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
        const objectKey = buildDocumentObjectKey({
          documentId: evidence.documentLibraryId,
          fileName: evidence.fileName,
          organizationId: runtime.organizationId,
          owner: {
            id: aggregate.claim.id,
            label: aggregate.claim.claimNumber ? `Claim #${aggregate.claim.claimNumber}` : aggregate.claim.customerName,
            type: "CLAIM"
          },
          version: 1
        });
        document = {
          contentType: inferContentType(evidence.fileName),
          fileName: evidence.fileName,
          storageProvider: "INTERNAL",
          storageReference: `local-private://${objectKey}`
        };
      }
      if (!document) throw caught;
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
    return NextResponse.json({
      code: error instanceof ClaimsWorkspaceError ? error.code : undefined,
      contractVersion: CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION,
      error: error instanceof Error ? error.message : "Claim evidence content could not be opened.",
      retryable: false
    }, { status });
  }
}
