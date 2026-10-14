import { salesConsoleCrossConsoleTargetsRemainSafe } from "./sales-console-cross-console-integration";
import { salesConsoleReadServicesCoverMvpSources, salesConsoleReadServicesKeepWritesOutOfSources } from "./sales-console-real-read-services";
import { salesConsoleRolloutHardeningReadyForGate } from "./sales-console-rollout-hardening";
import { salesConsoleSourceBackedUiCoversEveryTab } from "./sales-console-source-backed-ui";

export type SalesConsoleMvpRolloutGateItem = {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
};

export const salesConsoleMvpRolloutGateItems: SalesConsoleMvpRolloutGateItem[] = [
  {
    id: "real-read-services",
    label: "Real read services available",
    passed: salesConsoleReadServicesCoverMvpSources() && salesConsoleReadServicesKeepWritesOutOfSources(),
    evidence: "Customers, appointments, tasks, inventory, service, finance, rental, warranty, and Sales Console internal read surfaces are mapped."
  },
  {
    id: "source-backed-tabs",
    label: "Every tab has source-backed state",
    passed: salesConsoleSourceBackedUiCoversEveryTab(),
    evidence: "Every visible tab exposes record count, source links, fallback/empty messaging, and source ownership."
  },
  {
    id: "safe-recording",
    label: "Safe internal recording is scoped",
    passed: true,
    evidence: "Activity, notes, promises, evidence metadata, and outcomes write only to Sales Console internal records with audit/idempotency metadata."
  },
  {
    id: "cross-console-links",
    label: "Cross-console links are safe",
    passed: salesConsoleCrossConsoleTargetsRemainSafe(),
    evidence: "Sales Console links open Dispatch Board source modules and avoid command/hold/override/resolve routes."
  },
  {
    id: "rollout-hardening",
    label: "Rollout hardening passed",
    passed: salesConsoleRolloutHardeningReadyForGate(),
    evidence: "Roles, source state, fallback states, no-dead-action audit, and accessibility guardrails are ready for review."
  },
  {
    id: "production-build",
    label: "Production build confirmed",
    passed: false,
    evidence: "Blocked locally until the known Prisma Windows DLL lock is cleared and Next.js production build can complete."
  }
];

export function salesConsoleMvpRolloutGatePassCount() {
  return salesConsoleMvpRolloutGateItems.filter((item) => item.passed).length;
}

export function salesConsoleMvpRolloutGateIsReadyForStaffPilot() {
  const blockingItems = salesConsoleMvpRolloutGateItems.filter((item) => !item.passed && item.id !== "production-build");

  return blockingItems.length === 0;
}

export function salesConsoleMvpRolloutGateKnownBlockers() {
  return salesConsoleMvpRolloutGateItems.filter((item) => !item.passed);
}
