export const technicianCommentJobStatuses = [
  "AUTHORIZED", "WAITING_PARTS", "READY_FOR_REPAIR", "DISPATCHED", "IN_PROGRESS", "PAUSED", "READY_FOR_QC",
] as const;

export const technicianCommentAssignments = [
  { status: "ACTIVE", position: "CURRENT" },
  { status: "STAGED", position: "NEXT" },
] as const;
