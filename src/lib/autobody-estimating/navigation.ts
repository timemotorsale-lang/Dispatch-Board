import type { BodyDraft } from "./domain";

export function isAutobodyReturn(href?: string) { return href?.split(/[?#]/)[0] === "/prototype/autobody-estimate"; }
export function autobodyReturnHref(repairOrderId?: string | null, draftId?: string | null) { const query = new URLSearchParams(); if (repairOrderId) query.set("repairOrderId", repairOrderId); if (draftId) query.set("draftId", draftId); return `/prototype/autobody-estimate${query.size ? `?${query}` : ""}`; }
export function autobodyIntakeHref(vehicleId: string | null, internal: boolean, returnTo: string) { const query = new URLSearchParams({ intakeSource: internal ? "INVENTORY_RECON" : "WALK_IN", returnTo }); if (vehicleId) query.set("vehicleId", vehicleId); return `/vehicles/repair-orders?${query}`; }
export function resumeBodyScope(content: BodyDraft, context: { repairOrderId: string; vehicleId: string; payer: BodyDraft["payer"]; estimates: { id: string }[] }) {
  if ((content.vehicleId && content.vehicleId !== context.vehicleId) || (content.repairOrderId && content.repairOrderId !== context.repairOrderId)) throw new Error("This saved scope belongs to a different vehicle or repair order. Open its original saved workspace instead.");
  if (content.repairOrderId === context.repairOrderId) return { content, fork: false };
  return { fork: true, content: { ...content, vehicleId: context.vehicleId, repairOrderId: context.repairOrderId, payer: context.payer, priorEstimateId: context.estimates[0]?.id ?? null, supplementReason: "", lines: content.lines.map(line => content.vehicleId ? line : { ...line, applicability: "" }) } };
}
