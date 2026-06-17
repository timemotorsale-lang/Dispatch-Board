import type { AuthStore, AuthenticatedUser } from "./store";
import { verifyPassword } from "./password";
import { createSessionExpiry, createSessionToken, hashSessionToken } from "./session";

export const AUTH_FAILURE_MESSAGE = "Unable to sign in with the provided credentials.";

export type LoginResult =
  | {
      ok: true;
      sessionToken: string;
      expiresAt: Date;
      user: AuthenticatedUser;
    }
  | {
      ok: false;
      reason: "invalid_credentials" | "inactive_user";
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

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    return {
      ok: false,
      reason: "invalid_credentials",
      message: AUTH_FAILURE_MESSAGE
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

  await store.createSession({
    tokenHash: hashSessionToken(sessionToken),
    userId: user.id,
    expiresAt
  });

  const safeUser: AuthenticatedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    roles: user.roles,
    duties: user.duties
  };

  return {
    ok: true,
    sessionToken,
    expiresAt,
    user: safeUser
  };
}

export async function logoutWithSessionToken(store: AuthStore, sessionToken: string | null | undefined) {
  if (!sessionToken) {
    return;
  }

  await store.deleteSessionByTokenHash(hashSessionToken(sessionToken));
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
