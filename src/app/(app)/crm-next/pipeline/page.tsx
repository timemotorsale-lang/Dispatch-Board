import { CrmNextPipelineView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextCommandCenter } from "@/server/crm-next/read-model";

export default async function CrmNextPipelinePage({ searchParams }: { searchParams?: Promise<{ opportunity?: string; customerId?: string; intake?: string }> } = {}) {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const query = await searchParams;
  return <CrmNextPipelineView model={getCrmNextCommandCenter(user)}
    initialOpportunityId={typeof query?.opportunity === "string" ? query.opportunity : undefined}
    intakeCustomerId={query?.intake === "1" && typeof query.customerId === "string" ? query.customerId : undefined} />;
}
