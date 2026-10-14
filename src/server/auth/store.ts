import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  roles: string[];
  duties: {
    direct: string[];
    roleDefaults: string[];
    all: string[];
  };
};

export type AuthUserRecord = AuthenticatedUser & {
  passwordHash: string;
  failedLoginCount: number;
  lockedUntil: Date | null;
};

export type AuthSessionRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  user: AuthenticatedUser;
};

export type AuthSessionSummary = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
};

export type CreateSessionInput = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
};

export interface AuthStore {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  findSessionByTokenHash(tokenHash: string, now: Date): Promise<AuthSessionRecord | null>;
  listUserSessions(userId: string, currentTokenHash: string | null, now: Date): Promise<AuthSessionSummary[]>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
  deleteOtherUserSessions(userId: string, currentTokenHash: string): Promise<number>;
  recordFailedLogin(userId: string, failedLoginCount: number, lockedUntil: Date | null): Promise<void>;
  recordSuccessfulLogin(userId: string, now: Date): Promise<void>;
  updateUserPassword(userId: string, passwordHash: string, now: Date): Promise<void>;
}

type UserWithAssignments = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            roleDuties: {
              include: {
                duty: true;
              };
            };
          };
        };
      };
    };
    userDuties: {
      include: {
        duty: true;
      };
    };
  };
}>;

type SessionWithUser = Prisma.SessionGetPayload<{
  include: {
    user: {
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                roleDuties: {
                  include: {
                    duty: true;
                  };
                };
              };
            };
          };
        };
        userDuties: {
          include: {
            duty: true;
          };
        };
      };
    };
  };
}>;

type AuthSecurityRow = {
  mustChangePassword: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
};

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function toAuthenticatedUser(user: UserWithAssignments): AuthenticatedUser {
  const directDuties = uniqueSorted(user.userDuties.map((assignment) => assignment.duty.name));
  const roleDefaults = uniqueSorted(
    user.userRoles.flatMap((assignment) =>
      assignment.role.roleDuties.map((roleDuty) => roleDuty.duty.name)
    )
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    mustChangePassword: false,
    roles: uniqueSorted(user.userRoles.map((assignment) => assignment.role.name)),
    duties: {
      direct: directDuties,
      roleDefaults,
      all: uniqueSorted([...directDuties, ...roleDefaults])
    }
  };
}

export function createPrismaAuthStore(prisma: PrismaClient): AuthStore {
  async function readSecurityState(userId: string): Promise<AuthSecurityRow> {
    const rows = await prisma.$queryRaw<AuthSecurityRow[]>(PrismaNamespace.sql`
      SELECT
        "mustChangePassword" AS "mustChangePassword",
        "failedLoginCount" AS "failedLoginCount",
        "lockedUntil" AS "lockedUntil"
      FROM "User"
      WHERE "id" = ${userId}
      LIMIT 1
    `);

    return rows[0] ?? {
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null
    };
  }

  return {
    async findUserByEmail(email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  roleDuties: {
                    include: {
                      duty: true
                    }
                  }
                }
              }
            }
          },
          userDuties: {
            include: {
              duty: true
            }
          }
        }
      });

      if (!user) {
        return null;
      }

      const securityState = await readSecurityState(user.id);

      return {
        ...toAuthenticatedUser(user),
        mustChangePassword: securityState.mustChangePassword,
        passwordHash: user.passwordHash,
        failedLoginCount: securityState.failedLoginCount,
        lockedUntil: securityState.lockedUntil
      };
    },
    async createSession(input) {
      await prisma.session.create({
        data: input
      });
    },
    async findSessionByTokenHash(tokenHash, now) {
      const session = await prisma.session.findFirst({
        where: {
          tokenHash,
          expiresAt: {
            gt: now
          }
        },
        include: {
          user: {
            include: {
              userRoles: {
                include: {
                  role: {
                    include: {
                      roleDuties: {
                        include: {
                          duty: true
                        }
                      }
                    }
                  }
                }
              },
              userDuties: {
                include: {
                  duty: true
                }
              }
            }
          }
        }
      });

      if (!session) {
        return null;
      }

      const securityState = await readSecurityState(session.user.id);

      return sessionToAuthSessionRecord(session, securityState.mustChangePassword);
    },
    async listUserSessions(userId, currentTokenHash, now) {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          expiresAt: {
            gt: now
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          tokenHash: true,
          createdAt: true,
          expiresAt: true
        }
      });

      return sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isCurrent: currentTokenHash ? session.tokenHash === currentTokenHash : false
      }));
    },
    async deleteSessionByTokenHash(tokenHash) {
      await prisma.session.deleteMany({
        where: {
          tokenHash
        }
      });
    },
    async deleteOtherUserSessions(userId, currentTokenHash) {
      const result = await prisma.session.deleteMany({
        where: {
          userId,
          tokenHash: {
            not: currentTokenHash
          }
        }
      });

      return result.count;
    },
    async recordFailedLogin(userId, failedLoginCount, lockedUntil) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "failedLoginCount" = ${failedLoginCount},
            "lockedUntil" = ${lockedUntil}
        WHERE "id" = ${userId}
      `;
    },
    async recordSuccessfulLogin(userId, now) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "failedLoginCount" = 0,
            "lockedUntil" = null,
            "lastLoginAt" = ${now}
        WHERE "id" = ${userId}
      `;
    },
    async updateUserPassword(userId, passwordHash, now) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "passwordHash" = ${passwordHash},
            "mustChangePassword" = false,
            "passwordChangedAt" = ${now},
            "failedLoginCount" = 0,
            "lockedUntil" = null
        WHERE "id" = ${userId}
      `;
    }
  };
}

function sessionToAuthSessionRecord(session: SessionWithUser, mustChangePassword = false): AuthSessionRecord {
  return {
    id: session.id,
    tokenHash: session.tokenHash,
    userId: session.userId,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    user: {
      ...toAuthenticatedUser(session.user),
      mustChangePassword
    }
  };
}
