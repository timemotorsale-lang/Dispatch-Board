import { getCustomerCollectionsCard } from "@/features/collections/server/customer-card";
import { CrmNextCustomer360View, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextOperationalCustomer360 } from "@/server/crm-next/read-model";

type CrmNextCustomerPageProps = {
  params: Promise<{ customerId: string }>;
};

export default async function CrmNextCustomerPage({ params }: CrmNextCustomerPageProps) {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const { customerId } = await params;
  const [{ customer, model }, collections] = await Promise.all([
    getCrmNextOperationalCustomer360(user, customerId),
    // Read-only; empty unless Collections is on for this person and the customer has an account.
    getCustomerCollectionsCard(user, customerId).catch(() => [])
  ]);
  return (
    <CrmNextCustomer360View
      customer={customer}
      model={model}
      collections={collections}
    />
  );
}

