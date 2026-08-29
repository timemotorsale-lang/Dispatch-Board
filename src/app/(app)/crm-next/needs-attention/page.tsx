import { CrmNextNeedsAttentionView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextCommandCenter } from "@/server/crm-next/read-model";

export default async function CrmNextNeedsAttentionPage() {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  return <CrmNextNeedsAttentionView model={getCrmNextCommandCenter(user)} />;
}

