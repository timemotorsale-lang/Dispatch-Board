import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.bootstrapMarker.upsert({
    where: { label: "foundation-seed" },
    update: {},
    create: { label: "foundation-seed" }
  });

  console.log("Baseline seed completed. Domain seed data will be added in later milestones.");
}

main()
  .catch((error) => {
    console.error("Seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

