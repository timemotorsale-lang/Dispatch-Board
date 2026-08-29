import { CrmNextUnavailable, CrmNextWorkCustomerView } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextAttentionItem, getCrmNextCommandCenter } from "@/server/crm-next/read-model";

type CrmNextWorkPageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function CrmNextWorkPage({ params }: CrmNextWorkPageProps) {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const { itemId } = await params;
  return (
    <CrmNextWorkCustomerView
      item={getCrmNextAttentionItem(user, itemId)}
      model={getCrmNextCommandCenter(user)}
    />
  );
}

