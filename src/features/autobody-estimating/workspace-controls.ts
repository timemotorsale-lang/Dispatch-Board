export function autobodyGenerationBlocker({
  recovering, recoveryPending, repairOrderId, closed, locationId, ready,
}: {
  recovering: boolean;
  recoveryPending: boolean;
  repairOrderId: string | null;
  closed?: boolean;
  locationId: string;
  ready: boolean;
}) {
  if (recoveryPending) return "Restore or discard browser recovery before continuing.";
  if (recovering) return null;
  if (!repairOrderId) return "Check in the vehicle and open its repair order before generating.";
  if (closed) return "Reopen the repair order through the existing workflow before generating.";
  if (!locationId) return "Choose the company location before generating.";
  if (!ready) return "Resolve the scope and amount issues listed in Review before generating.";
  return null;
}
