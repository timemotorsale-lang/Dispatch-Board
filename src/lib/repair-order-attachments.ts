export const repairOrderAttachmentSubject = "REPAIR_ORDER_ATTACHMENT";
export const repairOrderAttachmentTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const repairOrderAttachmentMaxBytes = 9 * 1024 * 1024;

export function repairOrderAttachmentsEndpoint(repairOrderId: string) {
  return `/api/repair-orders/${encodeURIComponent(repairOrderId)}/attachments`;
}
