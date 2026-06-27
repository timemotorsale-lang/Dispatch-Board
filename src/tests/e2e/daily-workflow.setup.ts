import { execFileSync } from "node:child_process";

import { prisma } from "@/server/db/client";

export async function resetDailyWorkflowState() {
  execFileSync("cmd.exe", ["/c", "npx", "prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    stdio: "inherit"
  });

  await prisma.activityEvent.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.generationRun.deleteMany();
  await prisma.boardDay.deleteMany();
  await prisma.session.deleteMany();

  execFileSync("cmd.exe", ["/c", "npm", "run", "db:seed"], {
    cwd: process.cwd(),
    stdio: "inherit"
  });
}

export async function disconnectDailyWorkflowDatabase() {
  await prisma.$disconnect();
}
