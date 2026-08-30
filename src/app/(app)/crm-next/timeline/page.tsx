import { CrmNextTimelineView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextOperationalCommandCenter, getCrmNextOperationalCustomer360 } from "@/server/crm-next/read-model";

export default async function CrmNextTimelinePage() {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const model = await getCrmNextOperationalCommandCenter(user);
  const firstCustomerId = model.customers[0]?.id;
  if (!firstCustomerId) {
    return <CrmNextTimelineView model={model} />;
  }
  const hydrated = await getCrmNextOperationalCustomer360(user, firstCustomerId);
  return <CrmNextTimelineView model={hydrated.model} />;
}
