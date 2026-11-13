export function waitingJobPartsReady(job: {
  partsRequired?: boolean;
  executionBlockerReason?: string | null;
  partDemands?: { status: string; quantityRequired: number; quantityReserved: number }[];
}) {
  const demands = job.partDemands ?? [];
  return job.partsRequired === true && !job.executionBlockerReason && demands.length > 0 && demands.every(
    demand => !["CANCELLED", "RELEASED"].includes(demand.status) && demand.quantityReserved === demand.quantityRequired
  );
}
