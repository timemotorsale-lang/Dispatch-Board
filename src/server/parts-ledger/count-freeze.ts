import type { Prisma } from "@prisma/client";

export async function assertPartStockLocationWritable(tx: Prisma.TransactionClient, organizationId: string, stockLocationId: string, sourceType: string) {
  if (sourceType === "CYCLE_COUNT_ADJUSTMENT") return;
  const frozen = await tx.partCycleCount.findFirst({
    where: { organizationId, stockLocationId, mode: "FREEZE", status: { in: ["COUNTING", "REVIEW_REQUIRED", "APPROVED"] } },
    select: { countNumber: true },
  });
  if (frozen) throw new Error(`Stock location is frozen by cycle count ${frozen.countNumber}.`);
}
