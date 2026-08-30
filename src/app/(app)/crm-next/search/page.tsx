import { CrmNextSearchView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextOperationalCommandCenter } from "@/server/crm-next/read-model";

type CrmNextSearchPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function CrmNextSearchPage({ searchParams }: CrmNextSearchPageProps) {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const params = await searchParams;
  return <CrmNextSearchView model={await getCrmNextOperationalCommandCenter(user, { searchQuery: params?.q })} />;
}
