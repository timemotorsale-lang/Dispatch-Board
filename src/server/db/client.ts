import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function assertSupportedDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const usesSupportedNodeDriverProtocol =
    databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://");
  const usesSupportedPrismaProxyProtocol =
    databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://");

  if (usesSupportedNodeDriverProtocol || usesSupportedPrismaProxyProtocol) {
    if (usesSupportedNodeDriverProtocol) {
      let parsedDatabaseUrl: URL;

      try {
        parsedDatabaseUrl = new URL(databaseUrl);
      } catch {
        throw new Error("DATABASE_URL is not a valid PostgreSQL connection string.");
      }

      if (!parsedDatabaseUrl.pathname || parsedDatabaseUrl.pathname === "/") {
        throw new Error(
          "DATABASE_URL must include a database name, for example postgresql://user:pass@host:5432/dispatch_board?schema=public."
        );
      }
    }

    return;
  }

  throw new Error(
    "DATABASE_URL must start with postgresql://, postgres://, prisma://, or prisma+postgres://."
  );
}

function hasCurrentPrismaModels(client: PrismaClient | undefined) {
  return Boolean(
    client &&
      "userLocationAccess" in client &&
      "inventoryWorkPacket" in client &&
      "inventoryWorkSession" in client
  );
}

assertSupportedDatabaseUrl();

export const prisma = hasCurrentPrismaModels(globalForPrisma.prisma)
  ? globalForPrisma.prisma!
  : new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

