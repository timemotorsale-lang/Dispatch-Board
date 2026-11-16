import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { CollectionsError } from "@/features/collections/config/permissions";
import { collectionsAccess, recordAccountEvent } from "@/features/collections/server/access";
import { findAccount } from "@/features/collections/server/account-service";
import { readUploadedProof, storeRestrictedDocument } from "@/features/collections/server/documents";
import { assertModuleOn, collectionsErrorResponse, collectionsJson, requireSameOrigin } from "@/features/collections/server/http";

const PURPOSES = {
  BANKRUPTCY_CLEARANCE: "COLLECTIONS_BANKRUPTCY_DOCUMENT",
  INSURANCE_PROOF: "COLLECTIONS_INSURANCE_PROOF",
  OTHER: "COLLECTIONS_ACCOUNT_DOCUMENT"
} as const;

export async function POST(request: Request, context: { params: Promise<{ accountId: string }> }) {
  try {
    assertModuleOn();
    requireSameOrigin(request);
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024) throw new CollectionsError("The file is larger than 10 MB.", 413);
    const access = await collectionsAccess(await getCurrentUser(), "LOG_ACTIVITY");
    const account = await findAccount(prisma, access, (await context.params).accountId);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new CollectionsError("Choose a file to upload.");
    const purpose = String(form.get("purpose") ?? "OTHER");
    const documentType = PURPOSES[purpose as keyof typeof PURPOSES] ?? PURPOSES.OTHER;
    const proof = await readUploadedProof(file);
    const stored = await storeRestrictedDocument({
      organizationId: access.organizationId, actorId: access.actor.id, ownerType: "COLLECTION_ACCOUNT", ownerId: account.id,
      ownerLabel: `Collections · ${account.buyerNameRaw}`, documentType, fileName: proof.fileName, contentType: proof.contentType, bytes: proof.bytes
    });
    await recordAccountEvent(prisma, { organizationId: access.organizationId, accountId: account.id, type: "DOCUMENT_UPLOADED", userId: access.actor.id, after: { documentId: stored.documentId, documentType } });
    return collectionsJson({ documentId: stored.documentId });
  } catch (error) { return collectionsErrorResponse(error); }
}
