import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";

export function canOpenWebsiteConsole(user: AuthenticatedUser | null) {
  return Boolean(user?.isActive && isManager(user));
}
