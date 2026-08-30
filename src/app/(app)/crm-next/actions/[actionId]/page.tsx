import { CrmNextActionReadinessView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextOperatingAction, getCrmNextOperationalCommandCenter } from "@/server/crm-next/read-model";

type CrmNextActionPageProps = {
  params: Promise<{ actionId: string }>;
};

export default async function CrmNextActionPage({ params }: CrmNextActionPageProps) {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const { actionId } = await params;
  const model = await getCrmNextOperationalCommandCenter(user);
  return <CrmNextActionReadinessView action={getCrmNextOperatingAction(user, actionId)} model={model} />;
}
