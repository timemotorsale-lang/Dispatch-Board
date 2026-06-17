import type { Prisma, PrismaClient } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roles: string[];
  duties: {
    direct: string[];
    roleDefaults: string[];
    all: string[];
  };
};

export type AuthUserRecord = AuthenticatedUser & {
  passwordHash: string;
};

export type AuthSessionRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  user: AuthenticatedUser;
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
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
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
    roles: uniqueSorted(user.userRoles.map((assignment) => assignment.role.name)),
    duties: {
      direct: directDuties,
      roleDefaults,
      all: uniqueSorted([...directDuties, ...roleDefaults])
    }
  };
}

export function createPrismaAuthStore(prisma: PrismaClient): AuthStore {
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

      return {
        ...toAuthenticatedUser(user),
        passwordHash: user.passwordHash
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

      return sessionToAuthSessionRecord(session);
    },
    async deleteSessionByTokenHash(tokenHash) {
      await prisma.session.deleteMany({
        where: {
          tokenHash
        }
      });
    }
  };
}

function sessionToAuthSessionRecord(session: SessionWithUser): AuthSessionRecord {
  return {
    id: session.id,
    tokenHash: session.tokenHash,
    userId: session.userId,
    expiresAt: session.expiresAt,
    user: toAuthenticatedUser(session.user)
  };
}
