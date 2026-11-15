export function diagnosticsPartsDraftKey(userId: string, repairOrderId?: string) {
  return repairOrderId ? `diagnostics-parts-draft:v1:${JSON.stringify([userId, repairOrderId])}` : undefined;
}
