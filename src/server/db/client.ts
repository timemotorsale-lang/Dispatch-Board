import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function hasCurrentPrismaAppointmentModels(client: PrismaClient | undefined) {
  return Boolean(client && "userLocationAccess" in client);
}

export const prisma = hasCurrentPrismaAppointmentModels(globalForPrisma.prisma)
  ? globalForPrisma.prisma!
  : new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

