import { execFileSync } from "node:child_process";

import { prisma } from "@/server/db/client";

export async function resetDailyWorkflowState() {
  execFileSync("cmd.exe", ["/c", "npx", "prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    stdio: "inherit"
  });

  await prisma.activityEvent.deleteMany();
  await prisma.concernTaskLink.deleteMany();
  await prisma.concernCase.deleteMany();
  await prisma.appointmentHistoryEvent.deleteMany();
  await prisma.appointmentTaskLink.deleteMany();
  await prisma.appointmentResourceReservation.deleteMany();
  await prisma.appointmentResourceRequirement.deleteMany();
  await prisma.appointmentParticipant.deleteMany();
  await prisma.appointmentVehicle.deleteMany();
  await prisma.appointmentCommandLedger.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskSavedView.deleteMany();
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
