import { randomUUID } from "node:crypto";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply") || process.env.APPLY === "true";
const now = new Date();
const reason = "Pilot/demo record retired because the dealership is now using real task volume.";

type CleanupResult = {
  pilotTasks: number;
  pilotTasksRetired: number;
  pilotRepairOrders: number;
  pilotRepairOrdersRetired: number;
  pilotLifecycles: number;
  pilotLifecyclesRetired: number;
  pilotInventoryUnits: number;
  pilotInventoryUnitsRetired: number;
  pilotCustomers: number;
  pilotVehicles: number;
  taskSamples: string[];
  repairOrderSamples: string[];
};

function containsPilotText(value: string | null | undefined) {
  if (!value) return false;
  const normalized = value.toUpperCase();
  return normalized.includes("PILOT-") || normalized.includes("JORDAN PILOT") || normalized.includes("SHOP_RECON_PILOT");
}

async function findPilotTasks() {
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { title: { contains: "PILOT-", mode: "insensitive" } },
        { title: { contains: "Jordan Pilot", mode: "insensitive" } },
        { description: { contains: "PILOT-", mode: "insensitive" } },
        { description: { contains: "Jordan Pilot", mode: "insensitive" } },
        { vehicleReference: { contains: "PILOT-", mode: "insensitive" } },
        { customerReference: { contains: "PILOT-", mode: "insensitive" } },
        { customerReference: { contains: "Jordan Pilot", mode: "insensitive" } },
        { customer: { is: { OR: [{ customerNumber: { startsWith: "PILOT-" } }, { displayName: { contains: "Jordan Pilot", mode: "insensitive" } }, { sourceCode: "SHOP_RECON_PILOT" }] } } },
        { vehicle: { is: { OR: [{ vehicleNumber: { startsWith: "PILOT-" } }, { stockNumber: { startsWith: "PILOT-" } }, { externalReference: { startsWith: "SHOP_RECON_PILOT" } }] } } }
      ]
    },
    select: {
      assignedUserId: true,
      boardDayId: true,
      completedAt: true,
      description: true,
      id: true,
      status: true,
      title: true,
      vehicleReference: true,
      customerReference: true
    }
  });

  return tasks;
}

async function main() {
  const [tasks, repairOrders, lifecycles, inventoryUnits, customers, vehicles] = await Promise.all([
    findPilotTasks(),
    prisma.repairOrder.findMany({
      where: {
        OR: [
          { repairOrderNumber: { startsWith: "PILOT-" } },
          { externalSystemCode: "SHOP_RECON_PILOT" },
          { externalReference: { startsWith: "shop-recon-pilot" } },
          { serviceVisit: { is: { OR: [{ keyTag: { startsWith: "PILOT-" } }, { intakeNotes: { contains: "shop-recon-pilot", mode: "insensitive" } }] } } }
        ]
      },
      select: { closedAt: true, id: true, locationId: true, nextAction: true, operatingState: true, organizationId: true, ownerUserId: true, repairOrderNumber: true, stage: true, targetAt: true, version: true }
    }),
    prisma.shopReconLifecycle.findMany({
      where: {
        repairOrder: {
          OR: [
            { repairOrderNumber: { startsWith: "PILOT-" } },
            { externalSystemCode: "SHOP_RECON_PILOT" },
            { externalReference: { startsWith: "shop-recon-pilot" } }
          ]
        }
      },
      select: { id: true, operatingState: true, repairOrder: { select: { repairOrderNumber: true } } }
    }),
    prisma.inventoryUnit.findMany({
      where: { inventoryNumber: { startsWith: "PILOT-" } },
      select: { closedAt: true, id: true, inventoryNumber: true, operatingState: true }
    }),
    prisma.customer.findMany({
      where: { OR: [{ customerNumber: { startsWith: "PILOT-" } }, { displayName: { contains: "Jordan Pilot", mode: "insensitive" } }, { sourceCode: "SHOP_RECON_PILOT" }] },
      select: { id: true, customerNumber: true, displayName: true, status: true }
    }),
    prisma.vehicle.findMany({
      where: { OR: [{ vehicleNumber: { startsWith: "PILOT-" } }, { stockNumber: { startsWith: "PILOT-" } }, { externalReference: { startsWith: "SHOP_RECON_PILOT" } }] },
      select: { id: true, vehicleNumber: true, stockNumber: true, status: true }
    })
  ]);

  const activeTasks = tasks.filter((task) => task.status !== "COMPLETED");
  const activeRepairOrders = repairOrders.filter((order) => order.operatingState !== "CLOSED" || !order.closedAt);
  const activeLifecycles = lifecycles.filter((lifecycle) => lifecycle.operatingState !== "CLOSED" && lifecycle.operatingState !== "CANCELLED");
  const activeInventoryUnits = inventoryUnits.filter((unit) => unit.operatingState !== "CLOSED" || !unit.closedAt);

  const result: CleanupResult = {
    pilotTasks: tasks.length,
    pilotTasksRetired: apply ? activeTasks.length : 0,
    pilotRepairOrders: repairOrders.length,
    pilotRepairOrdersRetired: apply ? activeRepairOrders.length : 0,
    pilotLifecycles: lifecycles.length,
    pilotLifecyclesRetired: apply ? activeLifecycles.length : 0,
    pilotInventoryUnits: inventoryUnits.length,
    pilotInventoryUnitsRetired: apply ? activeInventoryUnits.length : 0,
    pilotCustomers: customers.length,
    pilotVehicles: vehicles.length,
    taskSamples: tasks.slice(0, 10).map((task) => `${task.id}: ${task.title}`),
    repairOrderSamples: repairOrders.slice(0, 10).map((order) => `${order.repairOrderNumber}: ${order.operatingState}`)
  };

  if (apply) {
    await prisma.$transaction(async (tx) => {
      for (const task of activeTasks) {
        await tx.task.update({
          where: { id: task.id },
          data: {
            blockerReason: null,
            completedAt: task.completedAt ?? now,
            status: "COMPLETED"
          }
        });
        await tx.taskComment.create({
          data: {
            authorUserId: task.assignedUserId,
            body: reason,
            taskId: task.id
          }
        });
        await tx.activityEvent.create({
          data: {
            actorUserId: task.assignedUserId,
            boardDayId: task.boardDayId,
            eventType: "task.pilot_demo_retired",
            message: "Pilot/demo task retired from active work.",
            metadata: { cleanupVersion: "pilot-cleanup/v1", reason },
            taskId: task.id
          }
        });
      }

      for (const order of activeRepairOrders) {
        const correlationId = randomUUID();
        const nextVersion = order.version + 1;
        await tx.repairOrder.update({
          where: { id: order.id },
          data: {
            closedAt: now,
            nextAction: "Pilot/demo record retired from active work.",
            operatingState: "CLOSED",
            stage: "CANCELLED",
            stageStartedAt: now,
            stateReason: reason,
            version: nextVersion
          }
        });
        await tx.repairOrderStateEvent.create({
          data: {
            actorUserId: order.ownerUserId,
            correlationId,
            fromOperatingState: order.operatingState,
            fromStage: order.stage,
            locationId: order.locationId,
            nextAction: "Pilot/demo record retired from active work.",
            occurredAt: now,
            organizationId: order.organizationId,
            ownerUserId: order.ownerUserId,
            reason,
            repairOrderId: order.id,
            targetAt: order.targetAt,
            toOperatingState: "CLOSED",
            toStage: "CANCELLED",
            version: nextVersion
          }
        });
        await tx.enterpriseAggregateVersion.updateMany({
          where: { organizationId: order.organizationId, domain: "SHOP_OPERATIONS", subjectType: "REPAIR_ORDER", subjectId: order.id },
          data: { version: nextVersion }
        });
        await tx.enterpriseAuditEvent.create({
          data: {
            actorUserId: order.ownerUserId,
            correlationId,
            domain: "SHOP_OPERATIONS",
            eventType: "PILOT_DEMO_REPAIR_ORDER_RETIRED",
            locationId: order.locationId,
            metadata: { cleanupVersion: "pilot-cleanup/v1", repairOrderNumber: order.repairOrderNumber },
            newValue: { closedAt: now.toISOString(), operatingState: "CLOSED", stage: "CANCELLED" },
            organizationId: order.organizationId,
            priorValue: JSON.parse(JSON.stringify(order)) as Prisma.InputJsonValue,
            reason,
            subjectId: order.id,
            subjectType: "REPAIR_ORDER"
          }
        });
      }

      await tx.shopReconLifecycle.updateMany({
        where: { id: { in: activeLifecycles.map((lifecycle) => lifecycle.id) } },
        data: {
          lastSavedAt: now,
          nextAction: "Pilot/demo lifecycle retired from active work.",
          operatingState: "CLOSED",
          stageStartedAt: now,
          version: { increment: 1 }
        }
      });

      await tx.inventoryUnit.updateMany({
        where: { id: { in: activeInventoryUnits.map((unit) => unit.id) } },
        data: {
          nextAction: "Pilot/demo inventory unit retired from active work.",
          closedAt: now,
          operatingState: "CLOSED",
          stageStartedAt: now,
          stateReason: reason,
          version: { increment: 1 }
        }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  console.log(JSON.stringify({ apply, result }, null, 2));
  if (!apply) {
    console.log("Dry run only. Run npm run db:cleanup-pilot-data -- --apply to retire these records.");
  }
}

main().catch((error) => {
  console.error("Pilot cleanup failed.", error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
