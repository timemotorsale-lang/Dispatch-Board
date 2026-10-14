import { ReconRepairAdvisorPrototype } from "@/features/advisor/recon-repair-advisor-prototype";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getServiceAdvisorWorkspace } from "@/server/advisor-workspace/service";

export default async function ReconRepairAdvisorPage() {
  const user = await requireCurrentUser();
  const model = await getServiceAdvisorWorkspace(user);
  return <ReconRepairAdvisorPrototype model={JSON.parse(JSON.stringify(model))} />;
}
