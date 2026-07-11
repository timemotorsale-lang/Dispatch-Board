import type { AuthenticatedUser } from "./store";

export function getProtectedRouteRedirect(user: AuthenticatedUser | null) {
  return user ? null : "/login";
}

export function getLoginRouteRedirect(user: AuthenticatedUser | null) {
  return user ? "/board" : null;
}

export function getSafePostLoginRedirect(returnTo: string | null | undefined) {
  if (
    !returnTo ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.includes("\\")
  ) {
    return "/board";
  }

  return returnTo;
}
