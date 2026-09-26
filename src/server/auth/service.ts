import type { AuthStore, AuthenticatedUser } from "./store";
import { hashPassword, verifyPassword } from "./password";
import { validateStaffPassword } from "./password-policy";
import { createSessionExpiry, createSessionToken, hashSessionToken } from "./session";
import type { AuthSessionSummary } from "./store";

export const AUTH_FAILURE_MESSAGE = "Unable to sign in with the provided credentials.";
export const AUTH_LOCKED_MESSAGE =
  "This account is temporarily locked after several unsuccessful sign-in attempts. Try again later or ask a manager to reset the password.";
export const AUTH_PASSWORD_CHANGE_REQUIRED_ROUTE = "/settings/password";
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

export type LoginResult =
  | {
      ok: true;
      sessionToken: string;
      expiresAt: Date;
      user: AuthenticatedUser;
      requiresPasswordChange: boolean;
    }
  | {
      ok: false;
      reason: "invalid_credentials" | "inactive_user" | "locked_user";
      message: string;
    };

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function loginWithPassword(
  store: AuthStore,
  input: {
    email: string;
    password: string;
  },
  now = new Date()
): Promise<LoginResult> {
  const user = await store.findUserByEmail(normalizeEmail(input.email));

  if (!user) {
    return {
      ok: false,
      reason: "invalid_credentials",
      message: AUTH_FAILURE_MESSAGE
    };
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    return {
      ok: false,
      reason: "locked_user",
      message: AUTH_LOCKED_MESSAGE
    };
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    const nextFailedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      nextFailedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS
        ? new Date(now.getTime() + LOGIN_LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await store.recordFailedLogin(user.id, nextFailedLoginCount, lockedUntil);

    return {
      ok: false,
      reason: lockedUntil ? "locked_user" : "invalid_credentials",
      message: lockedUntil ? AUTH_LOCKED_MESSAGE : AUTH_FAILURE_MESSAGE
    };
  }

  if (!user.isActive) {
    return {
      ok: false,
      reason: "inactive_user",
      message: AUTH_FAILURE_MESSAGE
    };
  }

  const sessionToken = createSessionToken();
  const expiresAt = createSessionExpiry(now);

  await Promise.all([
    store.createSession({
      tokenHash: hashSessionToken(sessionToken),
      userId: user.id,
      expiresAt
    }),
    store.recordSuccessfulLogin(user.id, now)
  ]);

  const safeUser: AuthenticatedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    roles: user.roles,
    duties: user.duties
  };

  return {
    ok: true,
    sessionToken,
    expiresAt,
    user: safeUser,
    requiresPasswordChange: Boolean(user.mustChangePassword)
  };
}

export async function changeOwnPassword(
  store: AuthStore,
  user: AuthenticatedUser | null,
  input: unknown,
  now = new Date()
) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Current password and new password are required.");
  }

  const candidate = input as { currentPassword?: unknown; newPassword?: unknown };

  if (typeof candidate.currentPassword !== "string" || typeof candidate.newPassword !== "string") {
    throw new Error("Current password and new password are required.");
  }

  const currentPassword = candidate.currentPassword;
  const newPassword = candidate.newPassword.trim();

  validateStaffPassword(newPassword);

  const authRecord = await store.findUserByEmail(user.email);

  if (!authRecord || !(await verifyPassword(currentPassword, authRecord.passwordHash))) {
    throw new Error(AUTH_FAILURE_MESSAGE);
  }

  if (await verifyPassword(newPassword, authRecord.passwordHash)) {
    throw new Error("New password must be different from the current password.");
  }

  await store.updateUserPassword(user.id, await hashPassword(newPassword), now);

  return { ok: true, passwordChangedAt: now };
}

export async function logoutWithSessionToken(store: AuthStore, sessionToken: string | null | undefined) {
  if (!sessionToken) {
    return;
  }

  await store.deleteSessionByTokenHash(hashSessionToken(sessionToken));
}

export async function getOwnSessionSecurity(
  store: AuthStore,
  user: AuthenticatedUser | null,
  sessionToken: string | null | undefined,
  now = new Date()
): Promise<{ currentSession: AuthSessionSummary | null; sessions: AuthSessionSummary[] }> {
  if (!user || !sessionToken) {
    throw new Error("Authentication required.");
  }

  const tokenHash = hashSessionToken(sessionToken);
  const sessions = await store.listUserSessions(user.id, tokenHash, now);

  return {
    currentSession: sessions.find((session) => session.isCurrent) ?? null,
    sessions
  };
}

export async function logoutOtherSessions(
  store: AuthStore,
  user: AuthenticatedUser | null,
  sessionToken: string | null | undefined
) {
  if (!user || !sessionToken) {
    throw new Error("Authentication required.");
  }

  const closedCount = await store.deleteOtherUserSessions(user.id, hashSessionToken(sessionToken));

  return {
    ok: true,
    closedCount
  };
}

export async function readAuthenticatedUser(
  store: AuthStore,
  sessionToken: string | null | undefined,
  now = new Date()
) {
  if (!sessionToken) {
    return null;
  }

  const session = await store.findSessionByTokenHash(hashSessionToken(sessionToken), now);

  if (!session?.user.isActive) {
    return null;
  }

  return session.user;
}
