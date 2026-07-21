import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

import type { DiagnosticRepairOperation } from "./repair-handoff-domain";

export const DIAGNOSTIC_LABOR_GUIDE_VERSION = "DGN-039/LABOR-GUIDE-FOUNDATION/1.0.0";

export const DIAGNOSTIC_LABOR_REPAIR_DOMAINS = ["MECHANICAL", "AUTOBODY"] as const;
export type DiagnosticLaborRepairDomain = (typeof DIAGNOSTIC_LABOR_REPAIR_DOMAINS)[number];

export const DIAGNOSTIC_LABOR_OPERATION_TYPES = [
  "DIAGNOSIS",
  "MECHANICAL_R_AND_R",
  "MECHANICAL_REPAIR",
  "BODY_REPAIR",
  "BODY_REPLACE",
  "REFINISH",
  "BLEND",
  "R_AND_I",
  "R_AND_R",
  "SECTION",
  "FRAME_STRUCTURAL",
  "ADAS_CALIBRATION",
  "PRE_SCAN",
  "POST_SCAN",
  "MATERIALS",
  "SUBLET"
] as const;
export type DiagnosticLaborOperationType = (typeof DIAGNOSTIC_LABOR_OPERATION_TYPES)[number];

export const DIAGNOSTIC_LABOR_COMPLEXITY_TIERS = ["LOW", "MEDIUM", "HIGH"] as const;
export type DiagnosticLaborComplexityTier = (typeof DIAGNOSTIC_LABOR_COMPLEXITY_TIERS)[number];

export const DIAGNOSTIC_LABOR_SOURCE_CLASSES = ["INTERNAL_AUTHORED", "LICENSED_REFERENCE", "SHOP_HISTORY_DERIVED", "MANAGER_APPROVED_OVERRIDE", "PILOT_EXPERIMENTAL"] as const;
export type DiagnosticLaborSourceClass = (typeof DIAGNOSTIC_LABOR_SOURCE_CLASSES)[number];

export type DiagnosticLaborGuideOperation = {
  operationKey: string;
  domain: DiagnosticLaborRepairDomain;
  operationType: DiagnosticLaborOperationType;
  title: string;
  customerSafeTitle: string;
  aliases: string[];
  repairFamilies: string[];
  includedWork: string[];
  excludedWork: string[];
  durationMinutes: { minimum: number; likely: number; maximum: number };
  defaultComplexityTier: DiagnosticLaborComplexityTier;
  requiredSkills: string[];
  requiredCertifications: string[];
  toolRequirements: string[];
  bayRequirements: string[];
  safetyNotes: string[];
  verificationExpectations: string[];
  source: { sourceClass: DiagnosticLaborSourceClass; sourceKey: string; version: string; rightsStatus: "AUTHORIZED" | "PLANNED" | "BLOCKED" };
  reviewRules: string[];
};

export type DiagnosticLaborGuideRecommendation = {
  sourceOperationKey: string;
  matchedCatalogOperationKey: string | null;
  domain: DiagnosticLaborRepairDomain;
  operationType: DiagnosticLaborOperationType;
  complexityTier: DiagnosticLaborComplexityTier;
  durationMinutes: { minimum: number; likely: number; maximum: number };
  requiredSkills: string[];
  requiredCertifications: string[];
  toolRequirements: string[];
  bayRequirements: string[];
  explanationCodes: string[];
  warningCodes: string[];
  authorityBoundary: {
    advisoryOnly: true;
    customerEstimateProhibited: true;
    partsMutationProhibited: true;
    dispatchMutationProhibited: true;
  };
  recommendationChecksum: string;
};

const authorityBoundary = {
  advisoryOnly: true,
  customerEstimateProhibited: true,
  partsMutationProhibited: true,
  dispatchMutationProhibited: true
} as const;

const canonical = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

export const DIAGNOSTIC_LABOR_GUIDE_SEED_CATALOG: DiagnosticLaborGuideOperation[] = [
  {
    operationKey: "MECH_ALTERNATOR_R_AND_R",
    domain: "MECHANICAL",
    operationType: "MECHANICAL_R_AND_R",
    title: "Replace alternator assembly",
    customerSafeTitle: "Replace alternator assembly",
    aliases: ["ALTERNATOR", "CHARGING SYSTEM", "GENERATOR"],
    repairFamilies: ["ELECTRICAL", "CHARGING_SYSTEM"],
    includedWork: ["battery safe work", "alternator remove and replace", "basic charging verification"],
    excludedWork: ["battery replacement", "wiring harness repair", "module programming"],
    durationMinutes: { minimum: 90, likely: 125, maximum: 160 },
    defaultComplexityTier: "HIGH",
    requiredSkills: ["ELECTRICAL_DIAGNOSTIC_REPAIR"],
    requiredCertifications: [],
    toolRequirements: ["HAND_TOOLS", "TORQUE_WRENCH", "DVOM"],
    bayRequirements: ["SERVICE_BAY"],
    safetyNotes: ["Battery disconnect and charging-system safe-work procedure required."],
    verificationExpectations: ["Verify charging output and warning indicator status."],
    source: { sourceClass: "INTERNAL_AUTHORED", sourceKey: "TMS_DIAGNOSTIC_LABOR_GUIDE", version: "2026.07.21", rightsStatus: "AUTHORIZED" },
    reviewRules: ["Advisor must review included/excluded work before customer presentation."]
  },
  {
    operationKey: "MECH_FRONT_BRAKE_PADS_ROTORS",
    domain: "MECHANICAL",
    operationType: "MECHANICAL_R_AND_R",
    title: "Replace front brake pads and rotors",
    customerSafeTitle: "Replace front brake pads and rotors",
    aliases: ["FRONT BRAKES", "PADS ROTORS", "BRAKE PAD ROTOR"],
    repairFamilies: ["BRAKES", "FRICTION_BRAKE"],
    includedWork: ["front wheel remove and install", "front pad replacement", "front rotor replacement", "brake road-test verification"],
    excludedWork: ["caliper replacement", "brake hose replacement", "ABS diagnosis"],
    durationMinutes: { minimum: 90, likely: 126, maximum: 150 },
    defaultComplexityTier: "MEDIUM",
    requiredSkills: ["BRAKE_REPAIR"],
    requiredCertifications: [],
    toolRequirements: ["HAND_TOOLS", "TORQUE_WRENCH"],
    bayRequirements: ["LIFT_OR_SERVICE_BAY"],
    safetyNotes: ["Brake system safety inspection required before release."],
    verificationExpectations: ["Verify pedal feel, stopping performance, and no abnormal noise."],
    source: { sourceClass: "INTERNAL_AUTHORED", sourceKey: "TMS_DIAGNOSTIC_LABOR_GUIDE", version: "2026.07.21", rightsStatus: "AUTHORIZED" },
    reviewRules: ["Rotor/caliper condition may change scope and require advisor review."]
  },
  {
    operationKey: "BODY_FRONT_BUMPER_COVER_REPLACE",
    domain: "AUTOBODY",
    operationType: "BODY_REPLACE",
    title: "Replace front bumper cover",
    customerSafeTitle: "Replace front bumper cover",
    aliases: ["BUMPER COVER", "FRONT BUMPER", "FASCIA"],
    repairFamilies: ["COLLISION", "FRONT_IMPACT", "BUMPER"],
    includedWork: ["bumper cover R&R planning", "visible damage review", "fastener/clip demand signal"],
    excludedWork: ["paint/refinish", "radar calibration", "hidden reinforcement damage", "insurance submission"],
    durationMinutes: { minimum: 90, likely: 108, maximum: 150 },
    defaultComplexityTier: "MEDIUM",
    requiredSkills: ["BODY_TECHNICIAN"],
    requiredCertifications: [],
    toolRequirements: ["BODY_HAND_TOOLS"],
    bayRequirements: ["BODY_REPAIR_BAY"],
    safetyNotes: ["Inspect for ADAS sensors, absorber, reinforcement, and hidden damage."],
    verificationExpectations: ["Verify fitment, gaps, fasteners, and sensor openings before refinish/reassembly."],
    source: { sourceClass: "INTERNAL_AUTHORED", sourceKey: "TMS_AUTOBODY_LABOR_GUIDE", version: "2026.07.21", rightsStatus: "AUTHORIZED" },
    reviewRules: ["Estimator review required for hidden damage and supplement risk."]
  },
  {
    operationKey: "BODY_TRI_COAT_REFINISH_BLEND",
    domain: "AUTOBODY",
    operationType: "REFINISH",
    title: "Refinish and blend tri-coat adjacent panels",
    customerSafeTitle: "Refinish and blend adjacent panels",
    aliases: ["TRI COAT", "REFINISH", "BLEND", "PAINT MATERIALS"],
    repairFamilies: ["COLLISION", "REFINISH", "PAINT"],
    includedWork: ["refinish planning", "blend requirement flag", "paint material demand signal"],
    excludedWork: ["final paint material billing", "paint booth scheduling", "insurance submission"],
    durationMinutes: { minimum: 150, likely: 210, maximum: 300 },
    defaultComplexityTier: "HIGH",
    requiredSkills: ["PAINTER", "REFINISH_TECHNICIAN"],
    requiredCertifications: [],
    toolRequirements: ["PAINT_SYSTEM", "SPRAY_OUT_CARD"],
    bayRequirements: ["PAINT_BOOTH"],
    safetyNotes: ["Paint material and hazmat policy must be visible and reviewed."],
    verificationExpectations: ["Verify color match, blend quality, finish texture, and post-refinish inspection."],
    source: { sourceClass: "INTERNAL_AUTHORED", sourceKey: "TMS_AUTOBODY_LABOR_GUIDE", version: "2026.07.21", rightsStatus: "AUTHORIZED" },
    reviewRules: ["Manager review required when material charge is removed or discounted."]
  },
  {
    operationKey: "BODY_ADAS_PRE_POST_SCAN_CALIBRATION",
    domain: "AUTOBODY",
    operationType: "ADAS_CALIBRATION",
    title: "Pre/post scan and ADAS calibration gate",
    customerSafeTitle: "Scan and calibrate safety systems",
    aliases: ["ADAS", "CALIBRATION", "RADAR", "CAMERA", "PRE SCAN", "POST SCAN"],
    repairFamilies: ["COLLISION", "ADAS", "SAFETY_SYSTEMS"],
    includedWork: ["pre-scan requirement", "post-scan requirement", "calibration evidence gate"],
    excludedWork: ["final calibration vendor invoice", "alignment labor", "module replacement"],
    durationMinutes: { minimum: 60, likely: 90, maximum: 180 },
    defaultComplexityTier: "HIGH",
    requiredSkills: ["ADAS_CALIBRATION"],
    requiredCertifications: ["ADAS_QUALIFIED_REVIEW"],
    toolRequirements: ["SCAN_TOOL", "CALIBRATION_TARGETS"],
    bayRequirements: ["CALIBRATION_SPACE"],
    safetyNotes: ["Delivery must be blocked until required calibration evidence is attached."],
    verificationExpectations: ["Verify no scan faults, calibration completion, and road-test requirements when applicable."],
    source: { sourceClass: "INTERNAL_AUTHORED", sourceKey: "TMS_AUTOBODY_LABOR_GUIDE", version: "2026.07.21", rightsStatus: "AUTHORIZED" },
    reviewRules: ["Fail closed when ADAS evidence or OEM procedure basis is missing."]
  }
];

function inferDomain(operation: DiagnosticRepairOperation): DiagnosticLaborRepairDomain {
  const text = `${operation.key} ${operation.description} ${operation.workTypeCode} ${operation.requiredSkills.join(" ")} ${operation.bayRequirements.join(" ")} ${operation.toolRequirements.join(" ")}`.toUpperCase();
  return /BODY|BUMPER|FENDER|REFINISH|PAINT|BLEND|FRAME|ADAS|CALIBR|COLLISION|PANEL|R&I|R_AND_I|R&R|R_AND_R/.test(text) ? "AUTOBODY" : "MECHANICAL";
}

function inferOperationType(operation: DiagnosticRepairOperation, domain: DiagnosticLaborRepairDomain): DiagnosticLaborOperationType {
  const text = `${operation.key} ${operation.description} ${operation.workTypeCode}`.toUpperCase();
  if (/ADAS|CALIBR/.test(text)) return "ADAS_CALIBRATION";
  if (/POST.?SCAN/.test(text)) return "POST_SCAN";
  if (/PRE.?SCAN|SCAN/.test(text)) return "PRE_SCAN";
  if (/REFINISH|PAINT/.test(text)) return "REFINISH";
  if (/BLEND/.test(text)) return "BLEND";
  if (/SECTION/.test(text)) return "SECTION";
  if (/FRAME|STRUCTURAL|PULL/.test(text)) return "FRAME_STRUCTURAL";
  if (/R&I|R_AND_I|REMOVE.*INSTALL/.test(text)) return "R_AND_I";
  if (/R&R|R_AND_R|REPLACE|R AND R/.test(text)) return domain === "AUTOBODY" ? "BODY_REPLACE" : "MECHANICAL_R_AND_R";
  if (domain === "AUTOBODY") return /REPAIR/.test(text) ? "BODY_REPAIR" : "BODY_REPLACE";
  return /DIAGNOS/.test(text) ? "DIAGNOSIS" : "MECHANICAL_REPAIR";
}

function inferComplexity(operation: DiagnosticRepairOperation, domain: DiagnosticLaborRepairDomain, operationType: DiagnosticLaborOperationType): DiagnosticLaborComplexityTier {
  const signals = [
    operation.durationMinutes.likely >= 120,
    operation.requiredCertifications.length > 0,
    operation.toolRequirements.length > 1,
    operation.hazards.length > 0,
    /DIAGNOSTIC|ELECTRICAL|PROGRAM|CALIBR|ADAS|FRAME|STRUCTURAL|REFINISH/i.test(`${operation.workTypeCode} ${operation.requiredSkills.join(" ")} ${operation.description}`),
    domain === "AUTOBODY" && ["FRAME_STRUCTURAL", "ADAS_CALIBRATION", "REFINISH", "SECTION"].includes(operationType)
  ].filter(Boolean).length;
  if (signals >= 2) return "HIGH";
  if (signals === 1 || operation.durationMinutes.likely >= 60) return "MEDIUM";
  return "LOW";
}

function matchCatalog(operation: DiagnosticRepairOperation) {
  const haystack = canonical(`${operation.key} ${operation.description} ${operation.workTypeCode} ${operation.requiredSkills.join(" ")}`);
  return DIAGNOSTIC_LABOR_GUIDE_SEED_CATALOG.find((catalog) => {
    const candidates = [catalog.operationKey, catalog.title, catalog.customerSafeTitle, ...catalog.aliases, ...catalog.repairFamilies].map(canonical);
    return candidates.some((candidate) => candidate && haystack.includes(candidate));
  }) ?? null;
}

function mergeCatalog(operation: DiagnosticRepairOperation, catalog: DiagnosticLaborGuideOperation | null): DiagnosticLaborGuideRecommendation {
  const domain = catalog?.domain ?? inferDomain(operation);
  const operationType = catalog?.operationType ?? inferOperationType(operation, domain);
  const complexityTier = catalog?.defaultComplexityTier ?? inferComplexity(operation, domain, operationType);
  const durationMinutes = catalog?.durationMinutes ?? operation.durationMinutes;
  const warningCodes = [
    catalog ? "" : "LABOR_GUIDE_CATALOG_MATCH_PENDING",
    catalog && catalog.source.rightsStatus !== "AUTHORIZED" ? "LABOR_GUIDE_SOURCE_NOT_AUTHORIZED" : "",
    domain === "AUTOBODY" && ["ADAS_CALIBRATION", "FRAME_STRUCTURAL"].includes(operationType) ? "LABOR_GUIDE_AUTOBODY_SAFETY_GATE_REQUIRED" : "",
    domain === "AUTOBODY" && ["BODY_REPLACE", "REFINISH", "BLEND"].includes(operationType) ? "LABOR_GUIDE_SUPPLEMENT_REVIEW_RECOMMENDED" : ""
  ];
  const output = {
    sourceOperationKey: operation.key,
    matchedCatalogOperationKey: catalog?.operationKey ?? null,
    domain,
    operationType,
    complexityTier,
    durationMinutes,
    requiredSkills: unique([...(catalog?.requiredSkills ?? []), ...operation.requiredSkills]),
    requiredCertifications: unique([...(catalog?.requiredCertifications ?? []), ...operation.requiredCertifications]),
    toolRequirements: unique([...(catalog?.toolRequirements ?? []), ...operation.toolRequirements]),
    bayRequirements: unique([...(catalog?.bayRequirements ?? []), ...operation.bayRequirements]),
    explanationCodes: unique([
      "LABOR_GUIDE_ADVISORY_ONLY",
      `LABOR_GUIDE_DOMAIN_${domain}`,
      `LABOR_GUIDE_OPERATION_${operationType}`,
      `LABOR_GUIDE_COMPLEXITY_${complexityTier}`,
      catalog ? `LABOR_GUIDE_SOURCE_${catalog.source.sourceClass}` : "LABOR_GUIDE_INFERRED_FROM_REPAIR_HANDOFF"
    ]),
    warningCodes: unique(warningCodes),
    authorityBoundary
  };
  return { ...output, recommendationChecksum: hashEnterpriseCommand({ version: DIAGNOSTIC_LABOR_GUIDE_VERSION, operation, catalog, output }) };
}

export function evaluateDiagnosticLaborGuide(input: { operations: DiagnosticRepairOperation[]; occurredAt: string }) {
  if (!input.operations.length) throw new Error("Labor guide evaluation requires at least one repair operation.");
  const recommendations = input.operations.map((operation) => mergeCatalog(operation, matchCatalog(operation)));
  const summary = {
    mechanicalOperationCount: recommendations.filter((item) => item.domain === "MECHANICAL").length,
    autobodyOperationCount: recommendations.filter((item) => item.domain === "AUTOBODY").length,
    highComplexityCount: recommendations.filter((item) => item.complexityTier === "HIGH").length,
    warningCodes: unique(recommendations.flatMap((item) => item.warningCodes)),
    sourceVersions: unique(DIAGNOSTIC_LABOR_GUIDE_SEED_CATALOG.map((item) => `${item.source.sourceKey}@${item.source.version}`))
  };
  const result = { version: DIAGNOSTIC_LABOR_GUIDE_VERSION, occurredAt: input.occurredAt, recommendations, summary, authorityBoundary };
  return { ...result, resultChecksum: hashEnterpriseCommand({ input, result }) };
}

