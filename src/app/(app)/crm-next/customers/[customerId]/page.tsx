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
  const { customer, model } = await getCrmNextOperationalCustomer360(user, customerId);
  return (
    <CrmNextCustomer360View
      customer={customer}
      model={model}
    />
  );
}

