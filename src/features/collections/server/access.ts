/**
 * Server-side access for every Collections action: checks the switch, the permission,
 * and finds the user's one organization (from their active location access, the same
 * way Money & Resources does). Every query must use the returned organizationId.
 */
import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { assertCollectionsPermission, CollectionsError, resolveCollectionsRole, type CollectionsPermission } from "../config/permissions";

type Db = Prisma.TransactionClient;

export type CollectionsAccess = {
  actor: AuthenticatedUser;
  organizationId: string;
  role: "ADMIN" | "COLLECTOR";
};

export async function collectionsAccess(actor: AuthenticatedUser | null, permission: CollectionsPermission, db: Db = prisma): Promise<CollectionsAccess> {
  const user = assertCollectionsPermission(actor, permission);
  const now = new Date();
  const grants = await db.userLocationAccess.findMany({
    where: { userId: user.id, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: now } }] },
    select: { location: { select: { organizationId: true } } }
  });
  const organizations = [...new Set(grants.map(grant => grant.location.organizationId))];
  if (organizations.length === 0) {
    throw new CollectionsError("Your staff account isn't assigned to a company location. Ask the General Manager to review Staff company access in Settings.", 403);
  }
  if (organizations.length > 1) {
    throw new CollectionsError("Your staff account has access to more than one company. Ask the General Manager to review your company assignments before using Collections.", 403);
  }
  return { actor: user, organizationId: organizations[0], role: resolveCollectionsRole(user) === "ADMIN" ? "ADMIN" : "COLLECTOR" };
}

/** Append-only audit record (spec section 17). */
export async function recordAccountEvent(
  db: Db,
  input: { organizationId: string; accountId?: string | null; type: string; userId?: string | null; reason?: string; before?: unknown; after?: unknown }
) {
  return db.collectionAccountEvent.create({
    data: {
      organizationId: input.organizationId,
      accountId: input.accountId ?? null,
      type: input.type,
      userId: input.userId ?? null,
      reason: input.reason ?? "",
      before: input.before === undefined ? undefined : (JSON.parse(JSON.stringify(input.before)) as Prisma.InputJsonValue),
      after: input.after === undefined ? undefined : (JSON.parse(JSON.stringify(input.after)) as Prisma.InputJsonValue)
    }
  });
}
