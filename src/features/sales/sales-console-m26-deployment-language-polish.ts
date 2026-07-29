export const salesConsoleM26DeploymentLanguagePolish = {
  milestone: "Milestone 26 — Deployment Language Cleanup + Staff-Facing Console Polish",
  staffPosture: "deployable-mvp",
  staffFacingTermsRemoved: ["dogfood", "prototype", "placeholder-only", "Manager Review disabled"],
  replacements: [
    { before: "dogfood", after: "internal rollout" },
    { before: "planned", after: "unavailable in MVP / handled in source system" },
    { before: "placeholder", after: "fallback/source-shaped" },
    { before: "disabled Manager Review", after: "live Manager Review Request" }
  ],
  archivedEvidencePanels: [
    "Staff role model for read-only dogfooding",
    "Read-only dogfood feature flags",
    "M12 admin dogfood landing readiness summary",
    "M13 dogfood readiness panel",
    "M13 dogfood go no-go gates",
    "M16 disabled manager review request preview",
    "M17 release gate",
    "M17 audit safe submit placeholder",
    "M17 validation and permissions",
    "M17 request state model"
  ],
  staffFacingCopy: [
    "Sales Console is ready for internal MVP rollout review.",
    "Manager Review Request is the only live Sales Console submit workflow.",
    "Quotes, discounts, finance decisions, vehicle holds, and customer messaging stay in source systems or later approved releases.",
    "Older planning evidence is archived from daily staff flow."
  ]
} as const;

export function salesConsoleM26StaffPostureIsDeployableMvp() {
  return salesConsoleM26DeploymentLanguagePolish.staffPosture === "deployable-mvp";
}

export function salesConsoleM26ArchivesPlanningEvidence() {
  return salesConsoleM26DeploymentLanguagePolish.archivedEvidencePanels.includes("M17 release gate");
}

export function salesConsoleM26NamesOnlyLiveSubmitWorkflow() {
  return salesConsoleM26DeploymentLanguagePolish.staffFacingCopy.some((copy) =>
    copy.includes("Manager Review Request is the only live Sales Console submit workflow")
  );
}
