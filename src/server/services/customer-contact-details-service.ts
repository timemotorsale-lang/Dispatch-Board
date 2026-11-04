import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { createUnifiedCrmCustomerReadRepository } from "@/server/repositories/unified-crm-customer-read-repository";
import { requireUnifiedCrmCustomer360Access, type UnifiedCrmCustomer360AccessOptions } from "@/server/unified-crm/customer-360-access";
import { UnifiedCrmCustomer360Error } from "@/server/unified-crm/customer-360-contract";

export async function getCustomerContactDetails(actor: AuthenticatedUser | null, customerId: string, options: UnifiedCrmCustomer360AccessOptions = {}) {
  const { recordScope } = requireUnifiedCrmCustomer360Access(actor, options);
  if (!customerId.trim() || customerId.length > 200) throw new UnifiedCrmCustomer360Error("INVALID_CUSTOMER_ID", "Choose a valid customer.");
  const organizations = await createUnifiedCrmCustomerReadRepository().listActiveOrganizationIds(actor!.id, new Date());
  if (organizations.length !== 1) throw new UnifiedCrmCustomer360Error(organizations.length ? "ORGANIZATION_SCOPE_AMBIGUOUS" : "ORGANIZATION_SCOPE_UNAVAILABLE", "Your customer organization access needs to be reviewed.");
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: organizations[0], archivedAt: null, mergedIntoCustomerId: null, status: { in: ["ACTIVE", "INACTIVE", "RETIRED"] }, ...(recordScope.kind === "OWNER" ? { ownerUserId: recordScope.ownerUserId } : {}) },
    select: { phoneNumber: true, email: true, contactPoints: { where: { type: { in: ["PHONE", "EMAIL"] } }, select: { type: true, value: true }, orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }, { id: "asc" }] } }
  });
  if (!customer) throw new UnifiedCrmCustomer360Error("CUSTOMER_NOT_AVAILABLE", "This customer is not available within your access.");
  const contacts: Array<{type: "PHONE" | "EMAIL"; value: string}> = [];
  const add = (type: "PHONE" | "EMAIL", value: string | null) => {
    const text = value?.trim();
    if (text && !contacts.some(item => item.type === type && item.value.toLowerCase() === text.toLowerCase())) contacts.push({type,value:text});
  };
  for (const point of customer.contactPoints) if (point.type === "PHONE" || point.type === "EMAIL") add(point.type,point.value);
  if (!contacts.some(item => item.type === "PHONE")) add("PHONE",customer.phoneNumber);
  if (!contacts.some(item => item.type === "EMAIL")) add("EMAIL",customer.email);
  return {customerId,contacts};
}
