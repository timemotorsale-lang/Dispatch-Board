import { salesConsoleM10ReadOnlySourceWiring } from "./sales-console-m10-read-only-source-wiring";
import { salesConsoleM11ReadOnlyFeatureFlags } from "./sales-console-m11-read-only-feature-flags";
import { salesConsoleMvpExecution } from "./sales-console-mvp-execution";

export const salesConsoleM13ReleaseObservability = {
  healthSignals: [
    { label: "/sales route loads", status: "ready" },
    { label: "role mapping status", status: "ready" },
    { label: "source fallback count", status: "review" },
    { label: "unavailable source count", status: "review" },
    { label: "disabled action coverage", status: "ready" },
    { label: "planned-control clarity", status: "ready" },
    { label: "known blocker count", status: "review" }
  ],
  knownBlockers: [
    "Finance visibility remains planned/disabled.",
    "Marketing and office visibility roles should wait.",
    "Source links must be checked in the target environment before broad dogfood."
  ],
  sourceFallbackCount: salesConsoleM10ReadOnlySourceWiring.filter((source) => source.status === "fallback").length,
  unavailableSourceCount: salesConsoleM10ReadOnlySourceWiring.filter((source) => source.status === "unavailable").length
} as const;

export function salesConsoleM13ObservabilityHasCoreHealthSignals() {
  return salesConsoleM13ReleaseObservability.healthSignals.length >= 7;
}

export function salesConsoleM13ObservabilityCountsFallbacksAndUnavailableSources() {
  return salesConsoleM13ReleaseObservability.sourceFallbackCount >= 1 &&
    salesConsoleM13ReleaseObservability.unavailableSourceCount >= 1;
}

export function salesConsoleM13ObservabilityConfirmsDisabledActionCoverage() {
  return salesConsoleM11ReadOnlyFeatureFlags.every((flag) => flag.blockedWriteWorkflows.length >= 6) &&
    salesConsoleMvpExecution.readOnlyGuardrails.length >= 5;
}
