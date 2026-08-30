import { CrmNextUnavailable, CrmNextWorkCustomerView } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { previewCrmNextActionToTaskBridge } from "@/server/crm-next/action-bridge";
import { getCrmNextAttentionItem, getCrmNextOperationalCommandCenter } from "@/server/crm-next/read-model";

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
  const model = await getCrmNextOperationalCommandCenter(user);
  const item = model.attention.find((item) => item.id === itemId) ?? getCrmNextAttentionItem(user, itemId);
  const bridgePreview = previewCrmNextActionToTaskBridge(user, { attentionItemId: item.id });

  return (
    <CrmNextWorkCustomerView
      bridgePreview={bridgePreview}
      item={item}
      model={model}
    />
  );
}

