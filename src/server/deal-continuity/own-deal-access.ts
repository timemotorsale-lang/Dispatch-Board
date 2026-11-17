import type { AuthenticatedUser } from "@/server/auth/store";
import { canUseOwnDeals } from "@/server/policies/access";
import { SalesDocumentsError } from "@/server/sales-documents/domain";

export function requireOwnDealUser(actor: AuthenticatedUser | null) {
  if (!actor?.isActive) throw new SalesDocumentsError("Sign in to access Deals.", 401);
  if (!canUseOwnDeals(actor)) throw new SalesDocumentsError("Deals access is restricted for your account. Contact the General Manager.", 403);
  return actor;
}
