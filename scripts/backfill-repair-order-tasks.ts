import { prisma } from "../src/server/db/client";
import { reconcileRepairJobTask, reconcileRepairOrderOwnerTask } from "../src/server/repair-order/task-bridge";

async function main() {
  const orders = await prisma.repairOrder.findMany({
    where: { closedAt: null },
    select: { id: true, organizationId: true, ownerUserId: true }
  });
  let ownerTasksCreated = 0;
  for (const order of orders) {
    const result = await reconcileRepairOrderOwnerTask(order.organizationId, order.id, order.ownerUserId);
    if (result?.created) ownerTasksCreated += 1;
  }

  const dispatches = await prisma.repairJobDispatch.findMany({
    where: { status: { in: ["ACTIVE", "STAGED"] } },
    distinct: ["repairJobId"],
    orderBy: { createdAt: "desc" },
    select: { assignedByUserId: true, organizationId: true, repairJobId: true }
  });
  let jobTasksCreated = 0;
  for (const dispatch of dispatches) {
    const result = await reconcileRepairJobTask(dispatch.organizationId, dispatch.repairJobId, dispatch.assignedByUserId);
    if (result?.created) jobTasksCreated += 1;
  }

  console.log(JSON.stringify({
    activeRepairOrders: orders.length,
    activeRepairJobDispatches: dispatches.length,
    ownerTasksCreated,
    jobTasksCreated
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
