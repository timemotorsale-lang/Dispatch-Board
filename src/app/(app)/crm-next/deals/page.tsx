import { CrmNextDealsView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextCommandCenter } from "@/server/crm-next/read-model";
import { canUseOwnDeals } from "@/server/policies/access";

export default async function CrmNextDealsPage() {
  const user = await requireCurrentUser();
  if (!canUseOwnDeals(user)) return <p role="alert">Deals access is restricted for your account. Contact the General Manager.</p>;
  const access = resolveCrmNextAccess(user, { ownDeals: true });

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  return <CrmNextDealsView model={getCrmNextCommandCenter(user)} />;
}
