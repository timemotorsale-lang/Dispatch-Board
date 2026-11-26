import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { createUnifiedCrmCustomerReadRepository } from "@/server/repositories/unified-crm-customer-read-repository";
import { CUSTOMER_WISHLIST_COMMAND, CUSTOMER_WISHLIST_PREFIX } from "@/server/services/unified-crm-customer-note-service";

export async function resolveCustomerToolsOrganization(actor: AuthenticatedUser, customerId: string) {
  const scope = requireUnifiedCrmCustomerReadPolicy(actor);
  const organizations = await createUnifiedCrmCustomerReadRepository().listActiveOrganizationIds(actor.id, new Date());
  if (organizations.length !== 1) throw new Error("Customer scope is not available.");
  const [organizationId] = organizations;
  const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId, archivedAt: null, mergedIntoCustomerId: null,
    ...(scope.kind === "OWNER" ? { ownerUserId: scope.ownerUserId } : {}) }, select: { id: true } });
  if (!customer) return null;
  return organizationId;
}

export async function readCustomerWishlist(actor: AuthenticatedUser, customerId: string) {
  const organizationId = await resolveCustomerToolsOrganization(actor, customerId);
  if (!organizationId) throw new Error("Customer scope is not available.");
  const ledger = await prisma.enterpriseCommandLedger.findFirst({
    where: { organizationId, domain: "UNIFIED_CRM", subjectType: "CUSTOMER", subjectId: customerId, commandType: CUSTOMER_WISHLIST_COMMAND, status: "SUCCEEDED" },
    orderBy: [{ resultingVersion: "desc" }, { id: "desc" }], select: { resultSnapshot: true }
  });
  if (!ledger) return { body: "", noteId: null };
  const result = ledger.resultSnapshot;
  if (!result || typeof result !== "object" || Array.isArray(result) || typeof result.noteId !== "string") throw new Error("Wishlist record is unavailable.");
  const note = await prisma.customerNote.findFirst({ where: { id: result.noteId, customerId, visibility: "INTERNAL" }, select: { body: true } });
  if (!note?.body.startsWith(CUSTOMER_WISHLIST_PREFIX)) throw new Error("Wishlist record is unavailable.");
  return { body: note.body.slice(CUSTOMER_WISHLIST_PREFIX.length), noteId: result.noteId };
}
