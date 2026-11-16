import { PrismaClient } from "@prisma/client";

import { seedCollectionsForOrganization } from "../src/features/collections/server/seed";

const prisma = new PrismaClient();

async function main() {
  const organizations = await prisma.organization.findMany({ select: { id: true, name: true } });
  if (organizations.length === 0) {
    console.log("No organizations found. Run the main seed first. Nothing was created.");
    return;
  }
  for (const organization of organizations) {
    const result = await seedCollectionsForOrganization(prisma, organization.id);
    console.log(`${organization.name}: ${result.settingsCreated} settings row and ${result.templatesCreated} templates created (existing ones left untouched).`);
  }
}

main()
  .catch(error => {
    console.error("Collections seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
