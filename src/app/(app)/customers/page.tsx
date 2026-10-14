import { CustomerConsoleHome } from "@/features/customers/customer-console-home";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getWorkspaceKey } from "@/server/auth/navigation";

export default async function CustomersPage() {
  const user = await requireCurrentUser();
  return <CustomerConsoleHome showAdvisorReturn={getWorkspaceKey(user) === "ADVISOR"} />;
}
