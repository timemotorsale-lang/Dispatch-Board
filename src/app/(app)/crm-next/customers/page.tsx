import { CrmNextCustomersListView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getCrmNextOperationalCommandCenter } from "@/server/crm-next/read-model";

export default async function CrmNextCustomersPage() {
  const user = await requireCurrentUser();
  let model: Awaited<ReturnType<typeof getCrmNextOperationalCommandCenter>>;

  try {
    model = await getCrmNextOperationalCommandCenter(user);
  } catch (error) {
    const reason = typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: "CRM_NEXT_OFF" | "WORKSPACE_NOT_ELIGIBLE" }).code
      : "WORKSPACE_NOT_ELIGIBLE";
    return <CrmNextUnavailable fallbackHref="/customers" reason={reason} />;
  }

  return <CrmNextCustomersListView model={model} />;
}
