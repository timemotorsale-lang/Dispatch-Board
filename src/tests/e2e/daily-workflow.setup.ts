import { execFileSync } from "node:child_process";

import { prisma } from "@/server/db/client";

type ScheduledAppointmentFixtureInput = {
  appointmentNumber: string;
  title: string;
  startsAt: string;
  endsAt: string;
  sourceReference: string;
  customerName: string;
  vehicleLabel: string;
  ownerEmail?: string;
};

export async function resetDailyWorkflowState() {
  execFileSync("cmd.exe", ["/c", "npx", "prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    stdio: "inherit"
  });

  await prisma.reportingReview.deleteMany();
  await prisma.reportingRevision.deleteMany();
  await prisma.reportingSeries.deleteMany();
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

export async function createScheduledAppointmentFixture(input: ScheduledAppointmentFixtureInput) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { code: "TIME_MOTOR_SALES" },
    select: { id: true }
  });
  const location = await prisma.location.findUniqueOrThrow({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: "TMS-MSP-01"
      }
    },
    select: { id: true }
  });
  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: input.ownerEmail ?? "morgan.manager@local.test" },
    select: { id: true }
  });

  return prisma.appointment.create({
    data: {
      appointmentNumber: input.appointmentNumber,
      organizationId: organization.id,
      locationId: location.id,
      ownerUserId: owner.id,
      createdByUserId: owner.id,
      sourceType: "MANUAL",
      sourceReference: input.sourceReference,
      title: input.title,
      schedulingTimezone: "America/Chicago",
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      bookingStatus: "SCHEDULED",
      confirmationStatus: "CONFIRMED",
      attendanceStatus: "EXPECTED",
      executionStatus: "NOT_STARTED",
      confirmedAt: new Date(input.startsAt),
      purposeSnapshot: {
        category: "service",
        categoryLabel: "Service / Repair",
        reason: input.sourceReference
      },
      customerSnapshot: {
        displayName: input.customerName
      },
      vehicleSnapshot: {
        displayName: input.vehicleLabel,
        vehicleNumber: input.vehicleLabel
      }
    },
    select: {
      id: true,
      appointmentNumber: true,
      version: true
    }
  });
}

export async function disconnectDailyWorkflowDatabase() {
  await prisma.$disconnect();
}
