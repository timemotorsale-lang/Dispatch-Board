import { readFile } from "node:fs/promises";
import { normalize, resolve, sep } from "node:path";

import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { CollectionsError } from "@/features/collections/config/permissions";
import { collectionsAccess } from "@/features/collections/server/access";
import { findAccount } from "@/features/collections/server/account-service";
import { assertModuleOn, collectionsErrorResponse } from "@/features/collections/server/http";

const VIEWABLE = new Set(["application/pdf", "image/png", "image/jpeg"]);

/** Opens a private Collections document (insurance proof, letter, bankruptcy paper) for staff who can see the account. */
export async function GET(_request: Request, context: { params: Promise<{ accountId: string; documentId: string }> }) {
  try {
    assertModuleOn();
    const access = await collectionsAccess(await getCurrentUser(), "VIEW");
    const { accountId, documentId } = await context.params;
    await findAccount(prisma, access, accountId);
    const document = await prisma.documentLibraryDocument.findFirst({ where: { id: documentId, organizationId: access.organizationId, ownerType: "COLLECTION_ACCOUNT", ownerId: accountId } });
    if (!document) throw new CollectionsError("This document isn't on the account.", 404);
    const runtime = resolveDocumentStorageRuntimeFromEnv();
    const key = document.storageReference.startsWith("local-private://") ? document.storageReference.slice("local-private://".length) : "";
    if (!runtime.localPrivateRoot || !key) throw new CollectionsError("This file is stored where the app can't preview it. Open it from the Document Library.", 409);
    const root = resolve(runtime.localPrivateRoot);
    const path = resolve(root, normalize(key));
    if (!path.startsWith(root + sep)) throw new CollectionsError("This document can't be opened.", 400);
    const bytes = await readFile(path);
    const type = VIEWABLE.has(document.contentType ?? "") ? document.contentType! : "application/octet-stream";
    const name = document.fileName.replace(/["\r\n]/g, "_");
    return new Response(new Uint8Array(bytes), { headers: {
      "cache-control": "private, no-store", "content-type": type, "x-content-type-options": "nosniff",
      "content-disposition": `${type === "application/octet-stream" ? "attachment" : "inline"}; filename="${name}"`, "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
    } });
  } catch (error) { return collectionsErrorResponse(error); }
}
