import { canOpenDocumentLibrary } from "@/server/document-library/permission-policy";
import { CaptureArchiveError, resolveCaptureTarget } from "@/server/document-library/capture-archive";
import { getCustomerCollectionsCard } from "@/features/collections/server/customer-card";
import { CrmNextCustomer360View, CrmNextCustomerRecordUnavailable, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
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
  if (!model.operationalRead.sources.some(source => source.id === "customer-360" && source.state === "LIVE_READ")) {
    return <CrmNextCustomerRecordUnavailable userName={model.userName} />;
  }
  const captureEnabled = canOpenDocumentLibrary(user) && await resolveCaptureTarget(user, { type: "CUSTOMER", id: customer.id })
    .then(Boolean).catch(error => {
      if (!(error instanceof CaptureArchiveError && error.status === 403)) {
        console.error("Customer capture access lookup failed", error instanceof Error ? error.name : "Unknown");
      }
      return false;
    });
  return (
    <CrmNextCustomer360View
      captureEnabled={captureEnabled}
      customer={customer}
      model={model}
      collections={collections}
    />
  );
}

