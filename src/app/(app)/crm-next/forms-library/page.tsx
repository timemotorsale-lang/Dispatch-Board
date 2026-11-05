import { CrmNextFrame, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { FormsLibraryWorkspace } from "@/features/crm-next/forms-library-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";

export default async function FormsLibraryPage() {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);
  if (!access.allowed) return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  return <CrmNextFrame active="forms" userName={user.name}><FormsLibraryWorkspace /></CrmNextFrame>;
}
