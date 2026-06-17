import type { AuthStore, AuthUserRecord, CreateSessionInput } from "@/server/auth/store";
import {
  dayOneRoleDefinitions,
  developmentUserDefinitions
} from "@/server/auth/dev-seed-data";
import { hashPassword } from "@/server/auth/password";
import { normalizeEmail } from "@/server/auth/service";

type StoredSession = CreateSessionInput;

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function buildSeedUserRecord(definition: (typeof developmentUserDefinitions)[number], passwordHash: string): AuthUserRecord {
  const roleDefinitions = definition.roleNames
    .map((roleName) => dayOneRoleDefinitions.find((roleDefinition) => roleDefinition.name === roleName))
    .filter((value): value is (typeof dayOneRoleDefinitions)[number] => Boolean(value));

  const directDuties = uniqueSorted([...definition.directDutyNames]);
  const roleDefaults = uniqueSorted(
    roleDefinitions.flatMap((roleDefinition) => [...roleDefinition.defaultDutyNames])
  );

  return {
    id: `user-${definition.email}`,
    name: definition.name,
    email: definition.email,
    passwordHash,
    isActive: definition.isActive,
    roles: uniqueSorted([...definition.roleNames]),
    duties: {
      direct: directDuties,
      roleDefaults,
      all: uniqueSorted([...directDuties, ...roleDefaults])
    }
  };
}

export async function createTestAuthStore() {
  const usersByEmail = new Map<string, AuthUserRecord>();
  const sessionsByTokenHash = new Map<string, StoredSession>();

  for (const definition of developmentUserDefinitions) {
    const passwordHash = await hashPassword(definition.password);
    const userRecord = buildSeedUserRecord(definition, passwordHash);

    usersByEmail.set(normalizeEmail(userRecord.email), userRecord);
  }

  const store: AuthStore = {
    async findUserByEmail(email) {
      return usersByEmail.get(normalizeEmail(email)) ?? null;
    },
    async createSession(input) {
      sessionsByTokenHash.set(input.tokenHash, input);
    },
    async findSessionByTokenHash(tokenHash, now) {
      const session = sessionsByTokenHash.get(tokenHash);

      if (!session || session.expiresAt <= now) {
        return null;
      }

      const user = [...usersByEmail.values()].find((candidateUser) => candidateUser.id === session.userId);

      if (!user) {
        return null;
      }

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        roles: user.roles,
        duties: user.duties
      };

      return {
        id: `session-${session.userId}`,
        tokenHash: session.tokenHash,
        userId: session.userId,
        expiresAt: session.expiresAt,
        user: safeUser
      };
    },
    async deleteSessionByTokenHash(tokenHash) {
      sessionsByTokenHash.delete(tokenHash);
    }
  };

  return {
    store,
    usersByEmail,
    sessionsByTokenHash
  };
}
