import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { evaluateUnifiedCrmCapability } from "@/server/policies/unified-crm-access";

export async function assertQuickUpdateCustomerLink(user: AuthenticatedUser | null, payload: unknown) {
  if (!payload || typeof payload !== "object" || !("relatedCustomerId" in payload)) return;
  const relatedCustomerId = (payload as { relatedCustomerId?: unknown }).relatedCustomerId;
  if (relatedCustomerId === null || relatedCustomerId === undefined || relatedCustomerId === "") return;
  if (typeof relatedCustomerId !== "string") throw new Error("relatedCustomerId must be text.");
  const access = evaluateUnifiedCrmCapability(user, "crm.customer.view");
  if (!access.allowed) throw new Error("CRM permission is required to link this customer.");
  const customer = await prisma.customer.findFirst({
    where: { id: relatedCustomerId.trim(), organizationId: INITIAL_ORGANIZATION.id, status: "ACTIVE", mergedIntoCustomerId: null },
    select: { id: true }
  });
  if (!customer) throw new Error("The selected CRM customer was not found.");
}

export function safeQuickUpdateError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (/prisma\.|unknown argument|invalid invocation|client version/i.test(message)) return fallback;
  return message;
}
