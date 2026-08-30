import { CrmNextCustomersListView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getCrmNextOperationalCommandCenter } from "@/server/crm-next/read-model";

export default async function CrmNextCustomersPage() {
  const user = await requireCurrentUser();

  try {
    const model = await getCrmNextOperationalCommandCenter(user);
    return <CrmNextCustomersListView model={model} />;
  } catch (error) {
    const reason = typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: "CRM_NEXT_OFF" | "WORKSPACE_NOT_ELIGIBLE" }).code
      : "WORKSPACE_NOT_ELIGIBLE";
    return <CrmNextUnavailable fallbackHref="/customers" reason={reason} />;
  }
}
