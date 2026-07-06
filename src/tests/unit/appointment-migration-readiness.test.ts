import { describe, expect, it } from "vitest";

import {
  APPOINTMENT_MIGRATION_READINESS_STRATEGY,
  validateAppointmentMigrationReadinessStrategy
} from "@/server/appointments/migration-readiness";

describe("appointment migration readiness strategy", () => {
  it("requires expand-and-contract migrations with no destructive rollback", () => {
    expect(validateAppointmentMigrationReadinessStrategy()).toBe(
      APPOINTMENT_MIGRATION_READINESS_STRATEGY
    );
    expect(APPOINTMENT_MIGRATION_READINESS_STRATEGY).toMatchObject({
      migrationMode: "EXPAND_AND_CONTRACT",
      destructiveRollbackAllowed: false,
      requiresBackupBeforeDeploy: true,
      requiresRestoreDrillBeforeRelease: true
    });
  });

  it("defines fresh install and production upgrade verification commands", () => {
    expect(APPOINTMENT_MIGRATION_READINESS_STRATEGY.freshInstallCommands).toEqual([
      "npm run db:migrate:deploy",
      "npm run db:generate",
      "npm run db:seed",
      "npm run db:validate",
      "npm run lint",
      "npm run typecheck",
      "npm test"
    ]);
    expect(APPOINTMENT_MIGRATION_READINESS_STRATEGY.productionUpgradeCommands).toEqual([
      "npm run db:migrate:deploy",
      "npm run db:generate",
      "npm run db:validate",
      "npm run lint",
      "npm run typecheck",
      "npm test"
    ]);
  });

  it("keeps production seed boundaries non-sensitive and configuration-only", () => {
    expect(APPOINTMENT_MIGRATION_READINESS_STRATEGY).toMatchObject({
      productionSeedContainsSensitiveData: false,
      productionSeedCreatesLoginUsers: false,
      seedBoundaries: {
        localDevelopmentMayCreateDemoUsers: true,
        productionMaySeedConfigurationOnly: true,
        productionConfigurationRequiresApproval: true
      }
    });
    expect(
      APPOINTMENT_MIGRATION_READINESS_STRATEGY.seedBoundaries.productionConfigurationAllowed
    ).toContain("purpose/template catalog defaults");
  });

  it("preserves idempotency, history correlation, and recovery reconciliation targets", () => {
    expect(APPOINTMENT_MIGRATION_READINESS_STRATEGY.compatibilityRules).toContain(
      "Keep command idempotency keys and history correlation identifiers stable across migrations."
    );
    expect(APPOINTMENT_MIGRATION_READINESS_STRATEGY.reconciliationTargets).toEqual([
      "appointments",
      "appointment task links",
      "appointment history events",
      "appointment command ledger",
      "resource requirements",
      "resource reservations",
      "location access grants",
      "reporting counts"
    ]);
  });
});
