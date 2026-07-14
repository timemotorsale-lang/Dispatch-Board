export type InventoryAlgorithmRegistration = {
  algorithmVersion: string;
  deterministic: boolean;
  hasHardRules: boolean;
  name: string;
  objective: string;
  outcomeMetric: string;
  prohibitedUses: string[];
  reasonCodeFamily: string;
  requiredInputs: string[];
};

export const INVENTORY_ALGORITHM_CATALOG: InventoryAlgorithmRegistration[] = [
  ["Inventory Lifecycle Age", "inventory-lifecycle-age/1.0.0", "Measure stage, waiting, active, and idle time", "AGE", "days-to-frontline"],
  ["Frontline Readiness", "frontline-readiness/1.0.0", "Gate retail readiness using evidence", "READINESS", "frontline-ready-within-target"],
  ["Recon Priority", "recon-priority/1.0.0", "Rank ready recon work", "RECON", "recon-cycle-time"],
  ["Shop Work Priority", "shop-work-priority/1.0.0", "Rank customer repair and inventory recon work", "SHOP", "shop-cycle-time"],
  ["Shop Lane and Queue Control", "shop-lane-queue-control/1.0.0", "Route work and keep one eligible next job staged", "SHOP", "rack-idle-time"],
  ["Quality Release", "quality-release/1.0.0", "Prevent release until applicable evidence gates pass", "SHOP", "first-pass-yield"],
  ["Vehicle Velocity Policy", "vehicle-velocity-policy/1.0.0", "Apply configurable lifecycle review gates", "VELOCITY", "gross-per-day"],
  ["Parts Control", "parts-control/1.0.0", "Prioritize count and disposition controls", "PART", "inventory-accuracy"],
  ["Next Best Action", "inventory-next-best-action/1.0.0", "Recommend the highest-value valid action", "NBA", "action-resolution-time"],
  ["Acquisition Opportunity", "acquisition-opportunity/1.0.0", "Rank valid acquisition opportunities", "ACQUISITION", "gross-per-day"]
].map(([name, algorithmVersion, objective, reasonCodeFamily, outcomeMetric]) => ({
  algorithmVersion,
  deterministic: true,
  hasHardRules: true,
  name,
  objective,
  outcomeMetric,
  prohibitedUses: ["autonomous financial commitment", "bypass safety or compliance", "employee discipline"],
  reasonCodeFamily,
  requiredInputs: ["subjectId", "evaluatedAt", "policyVersion"]
}));

export function validateAlgorithmRegistration(registration: InventoryAlgorithmRegistration) {
  const failures: string[] = [];
  if (!registration.name.trim()) failures.push("name");
  if (!/^.+\/\d+\.\d+\.\d+$/.test(registration.algorithmVersion)) failures.push("algorithmVersion");
  if (!registration.objective.trim()) failures.push("objective");
  if (!registration.deterministic) failures.push("deterministic");
  if (!registration.hasHardRules) failures.push("hardRules");
  if (!registration.reasonCodeFamily.trim()) failures.push("reasonCodeFamily");
  if (registration.requiredInputs.length === 0) failures.push("requiredInputs");
  if (registration.prohibitedUses.length === 0) failures.push("prohibitedUses");
  if (!registration.outcomeMetric.trim()) failures.push("outcomeMetric");
  return { failures, ready: failures.length === 0 };
}

export function evaluateInventoryFoundationAcceptance() {
  const results = INVENTORY_ALGORITHM_CATALOG.map((registration) => ({
    name: registration.name,
    ...validateAlgorithmRegistration(registration)
  }));
  return { ready: results.every((result) => result.ready), results };
}
