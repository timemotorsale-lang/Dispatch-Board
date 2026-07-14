import { ServiceClosePartsWorkspace } from "@/features/inventory/service-close-parts-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getServiceClosePartsWorkspace } from "@/server/service-close-parts/service";

export default async function ServiceClosePartsPage() {
  const user = await requireCurrentUser(), initial = await getServiceClosePartsWorkspace(user);
  return <ServiceClosePartsWorkspace initial={JSON.parse(JSON.stringify(initial))} />;
}
