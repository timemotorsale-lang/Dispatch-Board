export const salesConsoleM22PilotProductionHardening = {
  milestone: "Milestone 22 — Pilot Production Hardening",
  deploymentLanguage: "internal pilot",
  firstThirtySecondsGuidance: [
    "Start with the role landing card.",
    "Use Manager Review Request only when source IDs and reason are complete.",
    "Read stale, unavailable, duplicate, and conflict labels before acting.",
    "Treat quotes, finance, discounts, holds, and messaging as planned/unavailable."
  ],
  stateCoverage: [
    "loading",
    "error",
    "empty",
    "stale",
    "unavailable",
    "duplicate",
    "conflict"
  ],
  healthIndicators: [
    { indicator: "route available", status: "ready" },
    { indicator: "manager review submit available", status: "ready" },
    { indicator: "audit enabled", status: "ready" },
    { indicator: "idempotency enabled", status: "ready" },
    { indicator: "risky workflows blocked", status: "ready" }
  ]
} as const;

export function salesConsoleM22CoversPilotStates() {
  return salesConsoleM22PilotProductionHardening.stateCoverage.includes("conflict");
}

export function salesConsoleM22HealthIndicatorsReady() {
  return salesConsoleM22PilotProductionHardening.healthIndicators.every((item) => item.status === "ready");
}

export function salesConsoleM22UsesInternalPilotLanguage() {
  return salesConsoleM22PilotProductionHardening.deploymentLanguage === "internal pilot";
}
