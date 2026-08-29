import { CrmNextCustomer360View, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextCommandCenter, getCrmNextCustomer360 } from "@/server/crm-next/read-model";

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
  return (
    <CrmNextCustomer360View
      customer={getCrmNextCustomer360(user, customerId)}
      model={getCrmNextCommandCenter(user)}
    />
  );
}

