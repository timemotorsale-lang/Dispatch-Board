export type ProgramRelease = {
  release: `R${number}`;
  milestone: `M${number}`;
  title: string;
  slices: readonly string[];
  dependsOn: readonly `R${number}`[];
  routes: readonly string[];
  apiRoutes: readonly string[];
  evidenceDocument: string;
  repositoryState: "AUTHORIZED" | "IMPLEMENTED" | "CONTROL_PLANE_IMPLEMENTED";
  operationalExit: "NOT_APPLICABLE" | "EVIDENCE_REQUIRED";
};

const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, offset) => `IC-${String(start + offset).padStart(3, "0")}`);

export const PROGRAM_RELEASES: readonly ProgramRelease[] = [
  { release: "R0", milestone: "M0", title: "Implementation readiness", slices: range(0, 5), dependsOn: [], routes: [], apiRoutes: [], evidenceDocument: "docs/inventory/r0-readiness/README.md", repositoryState: "AUTHORIZED", operationalExit: "NOT_APPLICABLE" },
  { release: "R1", milestone: "M1", title: "Enterprise foundations", slices: range(10, 17), dependsOn: ["R0"], routes: [], apiRoutes: [], evidenceDocument: "docs/inventory/R1_FOUNDATION_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R2", milestone: "M2", title: "Shell and Console Home", slices: range(20, 28), dependsOn: ["R1"], routes: ["/vehicles", "/vehicles/workflows"], apiRoutes: ["/api/vehicle-discovery/search"], evidenceDocument: "docs/inventory/R2_SHELL_HOME_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R3", milestone: "M3", title: "Lifecycle and Control Tower", slices: range(30, 39), dependsOn: ["R2"], routes: ["/vehicles/inventory", "/vehicles/control-tower", "/vehicles/inventory/units"], apiRoutes: ["/api/inventory-control-tower", "/api/inventory-units"], evidenceDocument: "docs/inventory/R3_LIFECYCLE_CONTROL_TOWER_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R4", milestone: "M4", title: "Acquisition and appraisal", slices: range(40, 48), dependsOn: ["R3"], routes: ["/vehicles/acquisition-appraisal"], apiRoutes: ["/api/acquisition-cases"], evidenceDocument: "docs/inventory/R4_ACQUISITION_APPRAISAL_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R5", milestone: "M5", title: "Inventory to frontline", slices: range(50, 59), dependsOn: ["R3", "R4", "R7", "R8"], routes: ["/vehicles/inventory-to-frontline"], apiRoutes: ["/api/frontline-workflows"], evidenceDocument: "docs/inventory/R5_INVENTORY_TO_FRONTLINE_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R6", milestone: "M6", title: "Retail completion", slices: range(60, 68), dependsOn: ["R5"], routes: ["/vehicles/retail-completion"], apiRoutes: ["/api/retail-completions"], evidenceDocument: "docs/inventory/R6_RETAIL_COMPLETION_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R7", milestone: "M7", title: "Shop and Recon", slices: range(70, 79), dependsOn: ["R2", "R3"], routes: ["/vehicles/shop-recon", "/vehicles/repair-orders", "/vehicles/shop-planning", "/vehicles/shop-dispatch", "/vehicles/quality-control"], apiRoutes: ["/api/shop-recon", "/api/repair-orders", "/api/shop-planning", "/api/shop-execution"], evidenceDocument: "docs/inventory/R7_SHOP_RECON_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R8", milestone: "M8", title: "Parts Operations", slices: range(80, 89), dependsOn: ["R1", "R7"], routes: ["/vehicles/parts-operations", "/vehicles/parts-counter"], apiRoutes: ["/api/parts-operations", "/api/parts/ledger"], evidenceDocument: "docs/inventory/R8_PARTS_OPERATIONS_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R9", milestone: "M9", title: "Disposition and wholesale", slices: range(90, 99), dependsOn: ["R3", "R4"], routes: ["/vehicles/disposition-wholesale"], apiRoutes: ["/api/disposition-wholesale"], evidenceDocument: "docs/inventory/R9_DISPOSITION_WHOLESALE_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R10", milestone: "M10", title: "Governance, reporting, and administration", slices: range(100, 109), dependsOn: ["R5", "R6", "R7", "R8", "R9"], routes: ["/manager-review", "/reports", "/administration"], apiRoutes: ["/api/inventory-governance"], evidenceDocument: "docs/inventory/R10_GOVERNANCE_REPORTING_ADMIN_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R11", milestone: "M11", title: "Integration ecosystem", slices: range(110, 119), dependsOn: ["R10"], routes: ["/integrations"], apiRoutes: ["/api/integrations"], evidenceDocument: "docs/inventory/R11_INTEGRATION_ECOSYSTEM_IMPLEMENTATION.md", repositoryState: "IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" },
  { release: "R12", milestone: "M12", title: "Enterprise readiness and pilot", slices: range(120, 129), dependsOn: ["R11"], routes: ["/administration/enterprise-readiness"], apiRoutes: ["/api/admin/enterprise-readiness"], evidenceDocument: "docs/inventory/R12_ENTERPRISE_READINESS_PILOT_IMPLEMENTATION.md", repositoryState: "CONTROL_PLANE_IMPLEMENTED", operationalExit: "EVIDENCE_REQUIRED" }
] as const;

export type ProgramJourney = { code: string; title: string; releases: readonly string[]; routes: readonly string[]; authorityBoundary: string; externalBoundary: string };
export const PROGRAM_JOURNEYS: readonly ProgramJourney[] = [
  { code: "J-01", title: "Acquisition to frontline", releases: ["R3", "R4", "R5", "R7", "R8"], routes: ["/vehicles/acquisition-appraisal", "/vehicles/inventory-to-frontline", "/vehicles/repair-orders", "/vehicles/parts-operations", "/vehicles/control-tower"], authorityBoundary: "Purchase and frontline release require exact-version independent approval.", externalBoundary: "External acknowledgements never replace internal custody, quality, title, or release evidence." },
  { code: "J-02", title: "Acquisition to wholesale", releases: ["R3", "R4", "R9"], routes: ["/vehicles/acquisition-appraisal", "/vehicles/disposition-wholesale", "/vehicles/control-tower"], authorityBoundary: "Disposition channel, price, reserve, sale, and settlement remain separately governed.", externalBoundary: "Auction/listing status cannot define internal completion without acknowledgement and reconciliation." },
  { code: "J-03", title: "Frontline to retail completion", releases: ["R3", "R5", "R6", "R10", "R11"], routes: ["/vehicles/inventory-to-frontline", "/vehicles/retail-completion", "/manager-review", "/integrations"], authorityBoundary: "Sale and delivery bind to exact approved versions and observed custody evidence.", externalBoundary: "DMS/payment/listing responses are evidence, not the retail aggregate." },
  { code: "J-04", title: "Recon, Parts, quality, and release", releases: ["R7", "R8", "R10"], routes: ["/vehicles/repair-orders", "/vehicles/shop-planning", "/vehicles/parts-operations", "/vehicles/quality-control", "/manager-review"], authorityBoundary: "Repair authorization, parts custody, QC, and release use different governed decisions.", externalBoundary: "Vendor and provider acknowledgements do not prove physical receipt or repair completion." },
  { code: "J-05", title: "Wholesale offer to settlement", releases: ["R9", "R10", "R11"], routes: ["/vehicles/disposition-wholesale", "/manager-review", "/integrations"], authorityBoundary: "Reserve, offer acceptance, release, and settlement require versioned evidence.", externalBoundary: "External sale and financial acknowledgement must reconcile before completion." },
  { code: "J-06", title: "Cross-domain review and approval", releases: ["R4", "R5", "R6", "R8", "R9", "R10"], routes: ["/manager-review", "/reports", "/administration"], authorityBoundary: "The global queue composes domain decisions; it never becomes a generic mutation endpoint.", externalBoundary: "Provider state is contextual evidence only." },
  { code: "J-07", title: "Integration outage, replay, and reconciliation", releases: ["R1", "R10", "R11", "R12"], routes: ["/integrations", "/administration", "/administration/enterprise-readiness"], authorityBoundary: "Retry and replay are separately authorized, idempotent operations.", externalBoundary: "Circuit break, dead letter, conflict, replay, and independent reconciliation evidence are required." },
  { code: "J-08", title: "Pilot pause, rollback, recovery, and decision", releases: ["R1", "R10", "R11", "R12"], routes: ["/administration/enterprise-readiness", "/administration", "/integrations"], authorityBoundary: "Activation, pause, rollback, resume, and expansion remain distinct decisions.", externalBoundary: "Commands and adapters can be stopped independently while reads and evidence remain available." }
] as const;

export const OPERATIONAL_VALIDATION_GATES = [
  "Named pilot scope, owners, volume, duration, thresholds, and support model",
  "Deployed migrations reconciled against approved source and target totals",
  "Real security/privacy and tenant-isolation assessment",
  "Keyboard, screen-reader, responsive, zoom/reflow, contrast, and reduced-motion evidence",
  "Production-representative performance, concurrency, lag, and long-running-job evidence",
  "Backup/restore, replay, RPO/RTO, disaster-recovery, pause, and rollback exercise",
  "Provider-specific sandbox round trips, outage, retry, mismatch, and reconciliation evidence",
  "Limited pilot outcomes and eight explicit expansion/GA sign-offs"
] as const;
