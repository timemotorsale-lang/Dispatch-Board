import { OPERATIONAL_VALIDATION_GATES, PROGRAM_JOURNEYS, PROGRAM_RELEASES } from "./catalog";

export type RepositoryInventory = { paths: ReadonlySet<string>; schema: string; navigationSources: Readonly<Record<string, string>> };
export type ValidationCheck = { code: string; title: string; disposition: "PASS" | "BLOCKED" | "EXTERNAL_REQUIRED"; details: readonly string[] };

const routePath = (route: string) => `src/app/(app)${route}/page.tsx`.replace("(app)//", "(app)/");
const apiPath = (route: string) => `src/app${route}/route.ts`;
const count = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].length;

function dependencyBlockers() {
  const releases = new Map<string, (typeof PROGRAM_RELEASES)[number]>(PROGRAM_RELEASES.map((release) => [release.release, release]));
  const blockers = PROGRAM_RELEASES.flatMap((release) => release.dependsOn.filter((dependency) => !releases.has(dependency)).map((dependency) => `${release.release} references missing ${dependency}.`));
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (release: string, path: string[]): void => {
    if (visiting.has(release)) { blockers.push(`Dependency cycle: ${[...path, release].join(" -> ")}.`); return; }
    if (visited.has(release)) return;
    visiting.add(release); for (const dependency of releases.get(release)?.dependsOn ?? []) visit(dependency, [...path, release]); visiting.delete(release); visited.add(release);
  };
  for (const release of releases.keys()) visit(release, []);
  return blockers;
}

const NAVIGATION_CONTRACTS = [
  { source: "src/features/inventory/inventory-console-home.tsx", targets: ["/vehicles/inventory", "/vehicles/control-tower", "/vehicles/parts-operations", "/vehicles/disposition-wholesale"] },
  { source: "src/app/(app)/vehicles/inventory/page.tsx", targets: ["/vehicles/control-tower"] },
  { source: "src/features/inventory/inventory-lifecycle-landing.tsx", targets: ["/vehicles/acquisition-appraisal", "/vehicles/inventory-to-frontline", "/vehicles/retail-completion", "/vehicles/disposition-wholesale", "/vehicles/workflows"] },
  { source: "src/features/inventory/shop-recon-landing.tsx", targets: ["/vehicles/parts-operations", "/vehicles/repair-orders", "/vehicles/control-tower", "/manager-review"] },
  { source: "src/features/inventory/governance-administration-workspace.tsx", targets: ["/administration/enterprise-readiness"] },
  { source: "src/features/inventory/integration-ecosystem-workspace.tsx", targets: ["/integrations"] }
] as const;

export function validateInventoryConsoleProgram(input: RepositoryInventory) {
  const checks: ValidationCheck[] = [];
  const slices = PROGRAM_RELEASES.flatMap((release) => release.slices), uniqueSlices = new Set(slices);
  const traceability = [
    ...(PROGRAM_RELEASES.length === 13 ? [] : [`Expected 13 releases; found ${PROGRAM_RELEASES.length}.`]),
    ...(new Set(PROGRAM_RELEASES.map((release) => release.milestone)).size === 13 ? [] : ["Milestone mapping is not one-to-one."]),
    ...(slices.length === 121 && uniqueSlices.size === 121 ? [] : [`Expected 121 unique slices; found ${slices.length} total and ${uniqueSlices.size} unique.`]),
    ...dependencyBlockers()
  ];
  checks.push({ code: "PIV-001", title: "R0-R12 release, milestone, slice, and dependency traceability", disposition: traceability.length ? "BLOCKED" : "PASS", details: traceability.length ? traceability : ["13 releases, 13 milestones, and 121 unique slices form an acyclic dependency graph."] });

  const missingDocs = PROGRAM_RELEASES.filter((release) => !input.paths.has(release.evidenceDocument)).map((release) => `${release.release}: ${release.evidenceDocument}`);
  checks.push({ code: "PIV-002", title: "Release evidence documents", disposition: missingDocs.length ? "BLOCKED" : "PASS", details: missingDocs.length ? missingDocs : ["Every release has a repository evidence document."] });

  const missingRoutes = PROGRAM_RELEASES.flatMap((release) => release.routes.filter((route) => !input.paths.has(routePath(route))).map((route) => `${release.release}: ${route} -> ${routePath(route)}`));
  checks.push({ code: "PIV-003", title: "Workspace route integration", disposition: missingRoutes.length ? "BLOCKED" : "PASS", details: missingRoutes.length ? missingRoutes : [`${PROGRAM_RELEASES.flatMap((release) => release.routes).length} required workspace routes resolve.`] });

  const missingApis = PROGRAM_RELEASES.flatMap((release) => release.apiRoutes.filter((route) => !input.paths.has(apiPath(route))).map((route) => `${release.release}: ${route} -> ${apiPath(route)}`));
  checks.push({ code: "PIV-004", title: "API boundary integration", disposition: missingApis.length ? "BLOCKED" : "PASS", details: missingApis.length ? missingApis : [`${PROGRAM_RELEASES.flatMap((release) => release.apiRoutes).length} required API boundaries resolve.`] });

  const canonicalModels = ["Vehicle", "InventoryUnit", "RepairOrder", "Part", "EnterpriseCommandLedger", "EnterpriseDomainEvent", "EnterpriseAuditEvent", "EnterpriseOutboxMessage", "VehicleOperationsFeatureFlag", "InventoryConsolePilot"];
  const modelBlockers = canonicalModels.flatMap((model) => { const occurrences = count(input.schema, new RegExp(`^model ${model} \\{`, "gm")); return occurrences === 1 ? [] : [`${model} occurs ${occurrences} times; expected exactly one canonical model.`]; });
  checks.push({ code: "PIV-005", title: "Canonical aggregate and enterprise-control ownership", disposition: modelBlockers.length ? "BLOCKED" : "PASS", details: modelBlockers.length ? modelBlockers : ["Canonical vehicle, inventory, Shop, Parts, command, event, audit, outbox, rollout, and pilot models are singular."] });

  const requiredMigrations = ["20260714010000_add_enterprise_command_foundation", "20260714020000_add_canonical_vehicle_registry", "20260714030000_add_inventory_unit_foundation", "20260714040000_add_repair_order_core", "20260714050000_add_parts_ledger_readiness", "20260718130000_inventory_console_r4_acquisition_appraisal", "20260718160000_inventory_console_r5_inventory_to_frontline", "20260718173000_inventory_console_r6_retail_completion", "20260718190000_inventory_console_r9_disposition_wholesale", "20260718193000_inventory_console_r11_integration_ecosystem", "20260718210000_inventory_console_r12_enterprise_readiness"];
  const migrationBlockers = requiredMigrations.flatMap((migration, index) => [
    ...(!input.paths.has(`prisma/migrations/${migration}/migration.sql`) ? [`Missing migration ${migration}.`] : []),
    ...(index && migration.localeCompare(requiredMigrations[index - 1]) <= 0 ? [`Migration sequence is not strictly increasing at ${migration}.`] : [])
  ]);
  checks.push({ code: "PIV-006", title: "Schema-first migration dependency sequence", disposition: migrationBlockers.length ? "BLOCKED" : "PASS", details: migrationBlockers.length ? migrationBlockers : [`${requiredMigrations.length} critical foundation and release migrations are present in dependency order.`] });

  const navigationBlockers = NAVIGATION_CONTRACTS.flatMap((contract) => { const source = input.navigationSources[contract.source]; if (!source) return [`Navigation source missing: ${contract.source}.`]; return contract.targets.filter((target) => !source.includes(target)).map((target) => `${contract.source} does not expose ${target}.`); });
  checks.push({ code: "PIV-007", title: "Cross-workspace navigation and handoff discoverability", disposition: navigationBlockers.length ? "BLOCKED" : "PASS", details: navigationBlockers.length ? navigationBlockers : ["Console Home, Lifecycle, Shop, Administration, and Integrations expose their required handoffs."] });

  const knownReleases = new Set(PROGRAM_RELEASES.map((release) => release.release)), knownRoutes = new Set(PROGRAM_RELEASES.flatMap((release) => release.routes));
  const journeyBlockers = PROGRAM_JOURNEYS.flatMap((journey) => [
    ...journey.releases.filter((release) => !knownReleases.has(release as ProgramReleaseCode)).map((release) => `${journey.code} references unknown ${release}.`),
    ...journey.routes.filter((route) => !knownRoutes.has(route)).map((route) => `${journey.code} references an unowned route ${route}.`),
    ...(!journey.authorityBoundary.trim() || !journey.externalBoundary.trim() ? [`${journey.code} lacks an authority or external boundary.`] : [])
  ]);
  checks.push({ code: "PIV-008", title: "End-to-end journey ownership contracts", disposition: journeyBlockers.length ? "BLOCKED" : "PASS", details: journeyBlockers.length ? journeyBlockers : [`${PROGRAM_JOURNEYS.length} cross-release journeys preserve domain and external-authority boundaries.`] });

  checks.push({ code: "PIV-009", title: "Operational, provider, and pilot evidence", disposition: "EXTERNAL_REQUIRED", details: OPERATIONAL_VALIDATION_GATES });
  const blockers = checks.filter((check) => check.disposition === "BLOCKED").flatMap((check) => check.details.map((detail) => `${check.code}: ${detail}`));
  return { contractVersion: "inventory-console-program-validation/v1", generatedAt: new Date().toISOString(), repositoryDisposition: blockers.length ? "BLOCKED" as const : "CONFORMS" as const, operationalDisposition: "EVIDENCE_REQUIRED" as const, blockers, checks, releases: PROGRAM_RELEASES, journeys: PROGRAM_JOURNEYS };
}

type ProgramReleaseCode = typeof PROGRAM_RELEASES[number]["release"];
