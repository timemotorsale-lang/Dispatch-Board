export const APPOINTMENT_MIGRATION_READINESS_STRATEGY = {
  status: "E1_FOUNDATION_DEFINED",
  migrationMode: "EXPAND_AND_CONTRACT",
  destructiveRollbackAllowed: false,
  productionSeedContainsSensitiveData: false,
  productionSeedCreatesLoginUsers: false,
  requiresBackupBeforeDeploy: true,
  requiresRestoreDrillBeforeRelease: true,
  requiresPrismaGenerateAfterSchemaChange: true,
  localFileLockRecoveryDocumented: true,
  freshInstallCommands: [
    "npm run db:migrate:deploy",
    "npm run db:generate",
    "npm run db:seed",
    "npm run db:validate",
    "npm run lint",
    "npm run typecheck",
    "npm test"
  ],
  productionUpgradeCommands: [
    "npm run db:migrate:deploy",
    "npm run db:generate",
    "npm run db:validate",
    "npm run lint",
    "npm run typecheck",
    "npm test"
  ],
  rollbackStrategy: [
    "Stop new appointment command execution when a critical migration defect is detected.",
    "Preserve the failed migration state for evidence and incident review.",
    "Restore from the approved pre-deploy backup when data shape is unsafe.",
    "Prefer a forward corrective migration when the deployed app and database can remain compatible.",
    "Reconcile appointments, task links, history events, resources, and command-ledger evidence after recovery."
  ],
  compatibilityRules: [
    "Add nullable columns or new tables before requiring application writes.",
    "Backfill data before making fields mandatory.",
    "Keep old reads working during the release that introduces a replacement shape.",
    "Do not rename or remove appointment fields in the same release that introduces replacements.",
    "Keep command idempotency keys and history correlation identifiers stable across migrations.",
    "Do not seed production customer, vehicle, or appointment records with real sensitive values."
  ],
  seedBoundaries: {
    localDevelopmentMayCreateDemoUsers: true,
    productionMaySeedConfigurationOnly: true,
    productionConfigurationAllowed: [
      "organization shell",
      "location shell",
      "operating windows",
      "resource type definitions",
      "purpose/template catalog defaults",
      "reason/outcome catalog defaults"
    ],
    productionConfigurationRequiresApproval: true
  },
  reconciliationTargets: [
    "appointments",
    "appointment task links",
    "appointment history events",
    "appointment command ledger",
    "resource requirements",
    "resource reservations",
    "location access grants",
    "reporting counts"
  ]
} as const;

export type AppointmentMigrationReadinessStrategy =
  typeof APPOINTMENT_MIGRATION_READINESS_STRATEGY;

export function validateAppointmentMigrationReadinessStrategy(
  strategy: AppointmentMigrationReadinessStrategy = APPOINTMENT_MIGRATION_READINESS_STRATEGY
) {
  if (strategy.migrationMode !== "EXPAND_AND_CONTRACT") {
    throw new Error("Appointment migrations must use expand-and-contract compatibility.");
  }

  if (strategy.destructiveRollbackAllowed) {
    throw new Error("Destructive appointment rollback is not allowed.");
  }

  if (strategy.productionSeedContainsSensitiveData || strategy.productionSeedCreatesLoginUsers) {
    throw new Error("Production appointment seed must not create sensitive records or login users.");
  }

  if (!strategy.requiresBackupBeforeDeploy || !strategy.requiresRestoreDrillBeforeRelease) {
    throw new Error("Appointment release readiness requires backup and restore evidence.");
  }

  const productionUpgradeCommands: readonly string[] = strategy.productionUpgradeCommands;

  for (const requiredCommand of [
    "npm run db:migrate:deploy",
    "npm run db:generate",
    "npm run db:validate",
    "npm run lint",
    "npm run typecheck",
    "npm test"
  ]) {
    if (!productionUpgradeCommands.includes(requiredCommand)) {
      throw new Error(`Production upgrade strategy is missing ${requiredCommand}.`);
    }
  }

  if (!strategy.rollbackStrategy.some((step) => step.includes("Restore from"))) {
    throw new Error("Appointment rollback strategy must include backup restore.");
  }

  if (!strategy.rollbackStrategy.some((step) => step.includes("forward corrective migration"))) {
    throw new Error("Appointment rollback strategy must allow safe roll-forward correction.");
  }

  if (
    !strategy.compatibilityRules.includes(
      "Keep command idempotency keys and history correlation identifiers stable across migrations."
    )
  ) {
    throw new Error("Appointment compatibility rules must preserve idempotency and correlation.");
  }

  if (!strategy.seedBoundaries.productionMaySeedConfigurationOnly) {
    throw new Error("Production appointment seed must be configuration-only.");
  }

  const reconciliationTargets: readonly string[] = strategy.reconciliationTargets;

  for (const target of [
    "appointments",
    "appointment history events",
    "appointment command ledger",
    "reporting counts"
  ]) {
    if (!reconciliationTargets.includes(target)) {
      throw new Error(`Appointment recovery reconciliation must include ${target}.`);
    }
  }

  return strategy;
}
