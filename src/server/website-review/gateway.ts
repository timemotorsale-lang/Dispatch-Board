import type { AuthenticatedUser } from "@/server/auth/store";
import { canOpenWebsiteConsole } from "@/features/website-console/policy";

type Environment = Record<string, string | undefined>;

export function reviewAccessStatus(user: AuthenticatedUser | null, environment: Environment) {
  if (!user) return 401;
  if (!canOpenWebsiteConsole(user)) return 403;
  if (environment.DEALERSHIP_HOSTED_REVIEW_ENABLED !== "true" || (environment.DEALERSHIP_REVIEW_KEY?.length ?? 0) < 32 || !environment.DEALERSHIP_REVIEW_ORIGIN) return 503;
  return 200;
}

export function reviewRequestAllowed(request: Request, environment: Environment) {
  try {
    const origin = new URL(environment.DEALERSHIP_REVIEW_ORIGIN ?? "");
    if (origin.protocol !== "https:" || origin.origin !== environment.DEALERSHIP_REVIEW_ORIGIN) return false;
    if (request.headers.get("host") !== origin.host) return false;
    return ["GET", "HEAD"].includes(request.method) || request.headers.get("origin") === origin.origin;
  } catch {
    return false;
  }
}

export function reviewForwardHeaders(request: Request, key: string) {
  const headers = new Headers();
  for (const name of ["accept", "content-type", "origin", "rsc", "next-router-state-tree", "next-router-prefetch", "next-url"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const token = request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => /^tms-preview=[a-zA-Z0-9_-]{1,128}$/.test(value));
  if (token) headers.set("cookie", token);
  headers.set("x-tms-review-key", key);
  return headers;
}
