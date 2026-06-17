import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "dispatch-board-session";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(sessionToken: string) {
  return createHash("sha256").update(sessionToken).digest("hex");
}

export function createSessionExpiry(now = new Date()) {
  return new Date(now.getTime() + SESSION_DURATION_MS);
}

export function buildSessionCookie(sessionToken: string, expiresAt: Date) {
  return {
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt
    }
  };
}

export function buildExpiredSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0)
    }
  };
}
