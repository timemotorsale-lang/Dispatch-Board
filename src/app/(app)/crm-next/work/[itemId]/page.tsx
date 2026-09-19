import { CrmNextUnavailable, CrmNextWorkCustomerView } from "@/features/crm-next/crm-next-shell";
import { normalizeCrmWorkPathId } from "@/features/crm-next/crm-next-work-paths";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { previewCrmNextActionToTaskBridge } from "@/server/crm-next/action-bridge";
import {
  getCrmNextAttentionItem,
  getCrmNextOperationalCommandCenter,
  getCrmNextOperationalCustomer360,
  type CrmNextAttentionItem,
  type CrmNextCustomer360
} from "@/server/crm-next/read-model";

type CrmNextWorkPageProps = {
  params: Promise<{ itemId: string }>;
  searchParams?: Promise<{ workPath?: string }>;
};

function attentionItemFromCustomer(customer: CrmNextCustomer360, itemId: string): CrmNextAttentionItem {
  return {
    age: "Current",
    area: "Sales",
    customerHref: `/crm-next/customers/${encodeURIComponent(customer.id)}`,
    customerId: customer.id,
    customerName: customer.name,
    id: itemId,
    level: customer.riskLevel,
    nextAction: customer.nextAction,
    owner: "Unassigned",
    reason: customer.nextAction || "Review customer record",
    workHref: `/crm-next/work/${encodeURIComponent(itemId)}`
  };
}

export default async function CrmNextWorkPage({ params, searchParams }: CrmNextWorkPageProps) {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const { itemId } = await params;
  const query = searchParams ? await searchParams : {};
  const initialWorkPath = normalizeCrmWorkPathId(query.workPath);
  let model = await getCrmNextOperationalCommandCenter(user);
  let item = model.attention.find((attentionItem) => attentionItem.id === itemId);

  if (!item && itemId.startsWith("customer-read-")) {
    const customerId = decodeURIComponent(itemId.slice("customer-read-".length));
    const hydrated = await getCrmNextOperationalCustomer360(user, customerId);
    const { customer } = hydrated;
    model = hydrated.model;
    item = attentionItemFromCustomer(customer, itemId);
  }

  item ??= getCrmNextAttentionItem(user, itemId);
  if (item.customerId && !itemId.startsWith("customer-read-")) {
    try {
      model = (await getCrmNextOperationalCustomer360(user, item.customerId)).model;
    } catch {
      // Keep the command-center model if the live customer timeline source is unavailable.
    }
  }
  const bridgePreview = previewCrmNextActionToTaskBridge(user, { attentionItemId: item.id, itemOverride: item });

  return (
    <CrmNextWorkCustomerView
      bridgePreview={bridgePreview}
      initialWorkPath={initialWorkPath ?? undefined}
      item={item}
      model={model}
    />
  );
}

