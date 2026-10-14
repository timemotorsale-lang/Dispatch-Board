import { CrmNextTimelineView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextOperationalCommandCenter, getCrmNextOperationalCustomer360 } from "@/server/crm-next/read-model";

type CrmNextTimelinePageProps = {
  searchParams: Promise<{ customerId?: string }>;
};

export default async function CrmNextTimelinePage({ searchParams }: CrmNextTimelinePageProps) {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const model = await getCrmNextOperationalCommandCenter(user);
  const query = await searchParams;
  const selectedCustomerId = query?.customerId ?? model.customers[0]?.id;
  if (!selectedCustomerId) {
    return <CrmNextTimelineView model={model} />;
  }
  const hydrated = await getCrmNextOperationalCustomer360(user, selectedCustomerId);
  return <CrmNextTimelineView model={hydrated.model} />;
}
