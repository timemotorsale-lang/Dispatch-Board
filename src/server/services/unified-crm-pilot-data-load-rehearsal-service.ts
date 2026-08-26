import { createHash } from "node:crypto";

import type { AuthenticatedUser } from "@/server/auth/store";
import { isGeneralManager } from "@/server/policies/access";
import {
  createUnifiedCrmPilotDataLoadRehearsalRepository,
  type UnifiedCrmPilotDataLoadRehearsalRepository,
  type UnifiedCrmPilotExistingKeySet
} from "@/server/repositories/unified-crm-pilot-data-load-rehearsal-repository";
import {
  UNIFIED_CRM_PILOT_DATA_LOAD_REHEARSAL_CONTRACT_VERSION,
  UnifiedCrmPilotDataLoadRehearsalError,
  type UnifiedCrmPilotDataLoadInputRow,
  type UnifiedCrmPilotDataLoadMappedRow,
  type UnifiedCrmPilotDataLoadOutcome,
  type UnifiedCrmPilotDataLoadRehearsalReport
} from "@/server/unified-crm/pilot-data-load-rehearsal-contract";

type Dependencies = {
  now?: () => Date;
  repository?: UnifiedCrmPilotDataLoadRehearsalRepository;
};

type NormalizedPayload = {
  rows: UnifiedCrmPilotDataLoadInputRow[];
  sourceSystem: string;
};

const MAX_ROWS = 200;

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UnifiedCrmPilotDataLoadRehearsalError("PILOT_DATA_LOAD_INVALID", "Pilot data load rehearsal payload must be an object.");
  }
  return value as Record<string, unknown>;
}

function optionalText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

function requiredText(value: unknown, label: string, max: number, errors: string[]) {
  const text = optionalText(value, max);
  if (!text) errors.push(`${label} is required.`);
  return text ?? "";
}

function key(value: string | null) {
  return value ? value.toUpperCase() : null;
}

function phoneKey(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 7 ? digits : null;
}

function normalizePayload(value: unknown): NormalizedPayload {
  const raw = object(value);
  const sourceSystem = optionalText(raw.sourceSystem, 80);
  if (!sourceSystem) {
    throw new UnifiedCrmPilotDataLoadRehearsalError("PILOT_DATA_LOAD_INVALID", "Pilot data source system is required.");
  }
  if (!Array.isArray(raw.rows)) {
    throw new UnifiedCrmPilotDataLoadRehearsalError("PILOT_DATA_LOAD_INVALID", "Pilot data rows must be an array.");
  }
  if (raw.rows.length === 0 || raw.rows.length > MAX_ROWS) {
    throw new UnifiedCrmPilotDataLoadRehearsalError("PILOT_DATA_LOAD_INVALID", `Pilot data rehearsal accepts 1 to ${MAX_ROWS} rows.`);
  }
  return { rows: raw.rows as UnifiedCrmPilotDataLoadInputRow[], sourceSystem };
}

function mappedRow(row: UnifiedCrmPilotDataLoadInputRow, rowNumber: number): { errors: string[]; mapped: UnifiedCrmPilotDataLoadMappedRow | null } {
  const errors: string[] = [];
  const mapped: UnifiedCrmPilotDataLoadMappedRow = {
    customerName: requiredText(row.customerName, `Row ${rowNumber} customer name`, 120, errors),
    customerNumber: optionalText(row.customerNumber, 80),
    email: optionalText(row.email, 160)?.toLowerCase() ?? null,
    opportunityTitle: requiredText(row.opportunityTitle, `Row ${rowNumber} opportunity title`, 160, errors),
    phone: optionalText(row.phone, 40),
    sourceReference: requiredText(row.sourceReference, `Row ${rowNumber} source reference`, 100, errors),
    stockNumber: optionalText(row.stockNumber, 80),
    vin: optionalText(row.vin, 32)?.toUpperCase() ?? null
  };
  if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
    errors.push(`Row ${rowNumber} email is invalid.`);
  }
  if (mapped.vin && !/^[A-HJ-NPR-Z0-9]{11,17}$/.test(mapped.vin)) {
    errors.push(`Row ${rowNumber} VIN is invalid.`);
  }
  return { errors, mapped: errors.length ? null : mapped };
}

function duplicateReasons(
  mapped: UnifiedCrmPilotDataLoadMappedRow,
  existing: UnifiedCrmPilotExistingKeySet,
  seen: UnifiedCrmPilotExistingKeySet
) {
  const reasons: string[] = [];
  const checks: Array<[keyof UnifiedCrmPilotExistingKeySet, string | null, string]> = [
    ["customerNumbers", key(mapped.customerNumber), "customer number"],
    ["emails", key(mapped.email), "email"],
    ["phones", phoneKey(mapped.phone), "phone"],
    ["opportunityTitles", key(mapped.opportunityTitle), "opportunity title"],
    ["sourceReferences", key(mapped.sourceReference), "source reference"],
    ["stockNumbers", key(mapped.stockNumber), "stock number"],
    ["vins", key(mapped.vin), "VIN"]
  ];
  for (const [bucket, value, label] of checks) {
    if (!value) continue;
    if (existing[bucket].has(value)) reasons.push(`Existing CRM ${label} match.`);
    if (seen[bucket].has(value)) reasons.push(`Duplicate ${label} inside rehearsal batch.`);
    seen[bucket].add(value);
  }
  return reasons;
}

function collectKeys(rows: UnifiedCrmPilotDataLoadInputRow[]) {
  return rows.flatMap((row) => [
    key(optionalText(row.customerNumber, 80)),
    key(optionalText(row.email, 160)?.toLowerCase() ?? null),
    phoneKey(optionalText(row.phone, 40)),
    key(optionalText(row.opportunityTitle, 160)),
    key(optionalText(row.sourceReference, 100)),
    key(optionalText(row.stockNumber, 80)),
    key(optionalText(row.vin, 32)?.toUpperCase() ?? null)
  ]).filter((value): value is string => Boolean(value));
}

export async function rehearseUnifiedCrmPilotDataLoad(
  actor: AuthenticatedUser | null,
  value: unknown,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmPilotDataLoadRehearsalReport> {
  if (!actor) {
    throw new UnifiedCrmPilotDataLoadRehearsalError("AUTHENTICATION_REQUIRED", "Sign in before rehearsing CRM pilot data load.");
  }
  if (!isGeneralManager(actor)) {
    throw new UnifiedCrmPilotDataLoadRehearsalError("PILOT_DATA_LOAD_NOT_AUTHORIZED", "Administrator access is required for CRM pilot data load rehearsal.");
  }
  const payload = normalizePayload(value);
  const now = dependencies.now?.() ?? new Date();
  const repository = dependencies.repository ?? createUnifiedCrmPilotDataLoadRehearsalRepository();

  try {
    const organizationIds = await repository.listActiveOrganizationIds(actor.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmPilotDataLoadRehearsalError("ORGANIZATION_SCOPE_UNAVAILABLE", "CRM pilot data load rehearsal is not available for this viewer.");
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmPilotDataLoadRehearsalError("ORGANIZATION_SCOPE_AMBIGUOUS", "Select one authorized organization before rehearsing CRM pilot data load.");
    }
    const organizationId = organizationIds[0];
    const existing = await repository.findExistingKeys({ keys: collectKeys(payload.rows), organizationId });
    const seen: UnifiedCrmPilotExistingKeySet = {
      customerNumbers: new Set(),
      emails: new Set(),
      opportunityTitles: new Set(),
      phones: new Set(),
      sourceReferences: new Set(),
      stockNumbers: new Set(),
      vins: new Set()
    };
    const outcomes: UnifiedCrmPilotDataLoadOutcome[] = payload.rows.map((row, index) => {
      const rowNumber = index + 1;
      const normalized = mappedRow(row, rowNumber);
      if (!normalized.mapped) return { duplicateReasons: [], errors: normalized.errors, mapped: null, rowNumber, status: "INVALID" };
      const duplicates = duplicateReasons(normalized.mapped, existing, seen);
      return {
        duplicateReasons: duplicates,
        errors: [],
        mapped: normalized.mapped,
        rowNumber,
        status: duplicates.length ? "DUPLICATE" : "READY"
      };
    });
    const counts = {
      duplicate: outcomes.filter((outcome) => outcome.status === "DUPLICATE").length,
      invalid: outcomes.filter((outcome) => outcome.status === "INVALID").length,
      ready: outcomes.filter((outcome) => outcome.status === "READY").length,
      total: outcomes.length
    };
    const checksum = createHash("sha256").update(JSON.stringify({ outcomes, sourceSystem: payload.sourceSystem })).digest("hex");

    return {
      backupPlan: {
        estimatedBackupMinutes: Math.max(1, Math.ceil(counts.total / 50)),
        estimatedRestoreMinutes: Math.max(2, Math.ceil(counts.total / 40)),
        requiredBeforeLiveLoad: true,
        rollbackAuthority: "ADMINISTRATOR_ASSISTED"
      },
      checksum,
      contractVersion: UNIFIED_CRM_PILOT_DATA_LOAD_REHEARSAL_CONTRACT_VERSION,
      counts,
      dryRun: true,
      generatedAt: now.toISOString(),
      outcomes,
      provenance: {
        actorUserId: actor.id,
        organizationId,
        sourceSystem: payload.sourceSystem
      },
      state: counts.invalid || counts.duplicate ? "BLOCKED" : "READY_FOR_ADMIN_REVIEW"
    };
  } catch (error) {
    if (error instanceof UnifiedCrmPilotDataLoadRehearsalError) throw error;
    throw new UnifiedCrmPilotDataLoadRehearsalError(
      "PILOT_DATA_LOAD_SOURCE_UNAVAILABLE",
      "CRM pilot data load rehearsal is temporarily unavailable.",
      { cause: error }
    );
  }
}
