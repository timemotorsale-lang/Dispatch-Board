import { CrmNextDealStartView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextOperationalCommandCenter } from "@/server/crm-next/read-model";

type CrmNextDealStartPageProps = {
  searchParams?: Promise<{ customerId?: string; pathway?: string }>;
};

export default async function CrmNextDealStartPage({ searchParams }: CrmNextDealStartPageProps = {}) {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const resolvedSearchParams = await searchParams;
  return <CrmNextDealStartView initialCustomerId={resolvedSearchParams?.customerId} initialWorkflowId={resolvedSearchParams?.pathway} model={await getCrmNextOperationalCommandCenter(user)} />;
}
