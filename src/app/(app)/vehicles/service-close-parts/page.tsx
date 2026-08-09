import { ServiceClosePartsWorkspace } from "@/features/inventory/service-close-parts-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getServiceClosePartsWorkspace } from "@/server/service-close-parts/service";

export default async function ServiceClosePartsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireCurrentUser(), initial = await getServiceClosePartsWorkspace(user);
  const params = await searchParams;
  const value = (key: string) => {
    const input = params?.[key];
    return Array.isArray(input) ? input[0] : input;
  };
  return <ServiceClosePartsWorkspace initial={JSON.parse(JSON.stringify(initial))} initialRepairOrderId={value("repairOrderId")} returnLabel={value("returnLabel")} returnTo={value("returnTo")} />;
}
