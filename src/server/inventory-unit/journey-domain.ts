export type JourneyAccess = { inventory: boolean; costs: boolean; pricing: boolean; repair: boolean; evidence: boolean };
export type JourneyStep = { id: string; label: string; status: string; detail: string; href: string | null };
export function vehicleJourneySteps(input: { vehicleId: string; unitId: string | null; blocked: boolean; hasPurchase: boolean; costCount: number; receiptStatus: string | null; pricing: "missing" | "saved" | "stale" | "below"; access: JourneyAccess }) {
  const id = encodeURIComponent(input.vehicleId), journey = `/vehicles/${id}/journey`;
  const scoped = (path: string, values: Record<string, string> = {}) => `${path}?${new URLSearchParams({ ...values, returnTo: journey })}`;
  const unit = input.unitId ? scoped("/vehicles/inventory/units", { inventoryUnitId: input.unitId }) : scoped("/vehicles/acquisition-appraisal", { vehicleId: input.vehicleId });
  const step = (id: string, label: string, allowed: boolean, status: string, detail: string, href: string | null): JourneyStep => ({ id, label, status: allowed ? status : "Restricted", detail: allowed ? detail : "Available to authorized staff", href: allowed ? href : null });
  return [
    step("identity", "Vehicle identity", true, "Recorded", "Canonical vehicle record", scoped(`/vehicles/360/${id}`)),
    step("acquisition", "Acquisition & inventory cycle", input.access.inventory, input.unitId ? "Recorded" : "Not started", "Inventory capture is not purchase approval", unit),
    step("receiving", "Receiving & inspection", input.access.inventory, input.receiptStatus ? "Record available" : "Not recorded", input.receiptStatus?.replaceAll("_", " ") ?? "Receipt and condition review needed", input.unitId ? scoped(`/vehicles/${id}/inventory-planning`) : null),
    step("costs", "Purchase & added costs", input.access.costs, !input.unitId ? "Not started" : input.hasPurchase ? "Recorded" : "Needs purchase cost", `${input.costCount} active cost records; Shop/Parts reconciliation still required`, input.unitId ? scoped(`/vehicles/${id}/costs`) : null),
    step("pricing", "Pricing & margin", input.access.pricing, input.pricing === "missing" ? "Not recorded" : input.pricing === "saved" ? "Proposal saved" : "Needs review", input.pricing === "stale" ? "Inventory changed since this proposal" : input.pricing === "below" ? "Current costs no longer meet the selected threshold" : "Proposal only; no price publication", input.unitId ? scoped(`/vehicles/${id}/pricing`) : null),
    step("recon", "Shop & Parts", input.access.repair, "Source review required", "Review current work and charges; no automatic completion", scoped("/vehicles/repair-workbench", { vehicleId: input.vehicleId })),
    step("evidence", "Photos & documents", input.access.evidence, "Source review required", "Evidence capture is not public-use approval", scoped(`/vehicles/360/${id}`)),
    step("readiness", "Readiness & title", input.access.inventory, input.blocked ? "Blocked" : "Review required", "Current safety, QC, title and cost sources must be reviewed", input.unitId ? scoped(`/vehicles/${id}/inventory-planning`) : null),
    { id: "release", label: "Final release", status: "Unavailable", detail: "Publication and final-release requirements remain gated", href: null }
  ];
}

export function nextJourneyStep(steps: JourneyStep[], blocked: boolean) {
  const available = (id: string) => steps.find(step => step.id === id && step.href);
  if (blocked) return available("acquisition") ?? available("readiness") ?? null;
  return steps.find(step => step.href && ["Not started", "Needs purchase cost", "Not recorded", "Needs review"].includes(step.status)) ?? available("readiness") ?? null;
}
