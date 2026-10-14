import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

import { getCurrentUser } from "@/server/auth/current-user";
import { matchesClaimPhotoBytes, validateClaimPhoto } from "@/lib/claim-photo-upload";
import { CLAIM_PERMISSION_CATEGORIES, validateClaimAuthorizationUpload } from "@/lib/claim-customer-authorization";
import { claimsWorkspaceDependencies } from "@/server/claims-workspace/repository-factory";
import {
  attachClaimEvidence,
  getClaimWorkspaceReadModel,
  CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION,
  ClaimsWorkspaceError
} from "@/server/claims-workspace/service";
import { DocumentLibraryError } from "@/server/document-library/domain";
import { executeDocumentLibraryAction } from "@/server/document-library/service";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { extractDocumentText } from "@/server/document-library/text-extraction";
import { stageDocumentLibraryUpload } from "@/server/document-library/upload-service";

function statusForCode(code: string | undefined) {
  if (code === "AUTHENTICATION_REQUIRED") return 401;
  if (code === "CLAIM_NOT_FOUND") return 404;
  if (code === "CLAIM_INVALID") return 400;
  if (code === "DOCUMENT_LIBRARY_INVALID_ACTION") return 400;
  if (code === "DOCUMENT_LIBRARY_NOT_AUTHORIZED") return 403;
  if (code === "DOCUMENT_LIBRARY_STORAGE_UNAVAILABLE") return 503;
  return 500;
}

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function relationshipTargets(value: string) {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : ["CLAIM", "CUSTOMER", "VEHICLE"];
}

export async function POST(request: Request, context: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await context.params;
  try {
    const user = await getCurrentUser();
    if (!user) throw new ClaimsWorkspaceError("AUTHENTICATION_REQUIRED", "Sign in before uploading claim evidence.");
    const dependencies = await claimsWorkspaceDependencies();
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new ClaimsWorkspaceError("CLAIM_INVALID", "Claim evidence upload requires a file.");
      const category = text(form.get("category")).toUpperCase() || "ESTIMATE";
      const isPermission = CLAIM_PERMISSION_CATEGORIES.some((item) => item === category);
      let permission: ReturnType<typeof validateClaimAuthorizationUpload> | null = null;
      if (isPermission) {
        if (category !== "CLAIM_COMMUNICATION" || file.type !== "application/pdf" || file.size > 25 * 1024 * 1024 || file.size === 0) throw new ClaimsWorkspaceError("CLAIM_INVALID", "Upload the signed authorization as a PDF, up to 25 MB.");
        try { permission = validateClaimAuthorizationUpload(form); } catch (error) { throw new ClaimsWorkspaceError("CLAIM_INVALID", (error as Error).message); }
      }
      const isPhoto = ["DAMAGE_PHOTO", "ODOMETER_PHOTO", "VIN_PHOTO"].includes(category);
      if (isPhoto) {
        const invalid = validateClaimPhoto(file);
        if (invalid) throw new ClaimsWorkspaceError("CLAIM_INVALID", invalid);
      }
      const aggregate = await dependencies.repository.findClaimById(claimId);
      if (!aggregate) throw new ClaimsWorkspaceError("CLAIM_NOT_FOUND", "Insurance claim was not found.");
      if (isPermission && aggregate.claim.status !== "OPEN") throw new ClaimsWorkspaceError("CLAIM_INVALID", "Closed claim permissions cannot be changed.");
      if (isPermission) await getClaimWorkspaceReadModel(user, claimId, dependencies);
      const buffer = Buffer.from(await file.arrayBuffer());
      const bytes = new Uint8Array(buffer);
      if (isPermission && buffer.subarray(0, 5).toString() !== "%PDF-") throw new ClaimsWorkspaceError("CLAIM_INVALID", "This file is not a valid PDF.");
      if (isPermission) {
        try { await PDFDocument.load(bytes); } catch { throw new ClaimsWorkspaceError("CLAIM_INVALID", "The signed PDF could not be opened. Upload a readable, unencrypted PDF."); }
      }
      if (isPhoto && !matchesClaimPhotoBytes(file.type, bytes)) throw new ClaimsWorkspaceError("CLAIM_INVALID", "This file is not a valid JPEG or PNG photo.");
      const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
      const title = text(form.get("title")) || file.name;
      const reason = text(form.get("reason")) || text(form.get("notes")) || `Claim evidence uploaded for ${title}.`;
      const extracted = isPhoto ? { text: "", warnings: [] as string[] } : await extractDocumentText({
        bytes,
        contentType: file.type || "application/pdf",
        fileName: file.name
      });
      const notes = permission ? JSON.stringify({ ...permission, verifiedByUserId: user.id, verifiedAt: new Date().toISOString(), claimVersion: aggregate.claim.version }) : [
        reason,
        ...extracted.warnings.map((warning) => `Extraction note: ${warning}`)
      ].join("\n");
      const storageRuntime = resolveDocumentStorageRuntimeFromEnv();
      if (!storageRuntime.adapter || !storageRuntime.readiness.readyForByteStorage) {
        throw new DocumentLibraryError(
          "DOCUMENT_LIBRARY_STORAGE_UNAVAILABLE",
          "Document storage is temporarily unavailable. The file was not accepted; try the upload again after storage is restored.",
          true
        );
      }
      const claimIdentity = createHash("sha256").update(claimId).digest("hex").slice(0, 10);
      const uploadIdentity = isPhoto ? createHash("sha256").update(`${category}:${file.name}:${checksumSha256}`).digest("hex") : checksumSha256;
      const documentId = `doc-claim-${claimIdentity}-${uploadIdentity.slice(0, 12)}`;
      if (isPhoto && aggregate.evidence.some((item) => item.documentLibraryId === documentId && item.category === category)) {
        return NextResponse.json(await getClaimWorkspaceReadModel(user, claimId, dependencies), { status: 201 });
      }
      const staged = await stageDocumentLibraryUpload(user, {
        bytes,
        checksumSha256,
        contentType: file.type || "application/pdf",
        context: {
          console: "CLAIMS_WORKSPACE",
          ownerId: aggregate.claim.id,
          ownerLabel: aggregate.claim.claimNumber ? `Claim #${aggregate.claim.claimNumber}` : aggregate.claim.customerName,
          ownerType: "CLAIM",
          purpose: `Insurance claim ${category} ${title}`,
          reason
        },
        fileName: file.name,
        sizeBytes: file.size
      }, {
        documentIdFactory: () => documentId,
        organizationId: storageRuntime.organizationId,
        storageAdapter: storageRuntime.adapter
      });
      const createdDocument = await executeDocumentLibraryAction(user, {
        action: "CREATE_DOCUMENT",
        contentType: staged.storageDraft.contentType,
        documentId,
        documentType: staged.storagePolicy.classification.documentType,
        fileName: staged.storageDraft.fileName,
        idempotencyKey: `claim-evidence:${claimId}:${uploadIdentity}`,
        owner: staged.storagePolicy.owner,
        packetId: text(form.get("packetId")) || undefined,
        reason,
        sensitivity: staged.storagePolicy.classification.sensitivity,
        source: staged.storagePolicy.classification.source,
        storage: {
          provider: staged.storageDraft.provider,
          reference: staged.storageDraft.reference,
          version: staged.storageDraft.version
        }
      });
      const commandResult = "command" in createdDocument ? createdDocument.command : undefined;
      const createdDocumentId = commandResult?.document?.id;
      if (!createdDocumentId || !staged.storedObject) {
        throw new DocumentLibraryError(
          "DOCUMENT_LIBRARY_STORAGE_UNAVAILABLE",
          "The original document could not be confirmed in storage. The claim evidence was not attached; try the upload again.",
          true
        );
      }
      const result = await attachClaimEvidence(user, claimId, {
          category,
          documentLibraryId: createdDocumentId,
          extractedText: extracted.text,
          fileName: file.name,
          notes,
          relationshipTargets: relationshipTargets(text(form.get("relationshipTargets"))) as Array<"CLAIM" | "CUSTOMER" | "VEHICLE" | "REPAIR_ORDER">,
          status: isPermission ? "RECEIVED" : text(form.get("status")) || "RECEIVED",
          title
        }, dependencies);
      return NextResponse.json(result, { status: 201 });
    }
    const payload = await request.json().catch(() => null);
    if (CLAIM_PERMISSION_CATEGORIES.some((item) => item === String(payload?.category ?? "").trim().toUpperCase())) throw new ClaimsWorkspaceError("CLAIM_INVALID", "Claim permissions require a verified signed PDF upload.");
    return NextResponse.json(
      await attachClaimEvidence(user, claimId, payload ?? {}, dependencies),
      { status: 201 }
    );
  } catch (error) {
    const code = error instanceof ClaimsWorkspaceError || error instanceof DocumentLibraryError ? error.code : undefined;
    return NextResponse.json({
      code,
      contractVersion: CLAIMS_WORKSPACE_ERROR_CONTRACT_VERSION,
      error: error instanceof ClaimsWorkspaceError || error instanceof DocumentLibraryError ? error.message : "Claim evidence could not be attached right now.",
      retryable: error instanceof ClaimsWorkspaceError || error instanceof DocumentLibraryError ? error.retryable : false
    }, { status: statusForCode(code) });
  }
}
