import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { evaluateTimeAttendanceCapability } from "./capabilities";

export type TimeAttendanceHardeningGateId =
  | "TA-050"
  | "TA-051"
  | "TA-052"
  | "TA-053"
  | "TA-054"
  | "TA-055";

export type TimeAttendanceHardeningGateStatus =
  | "SOURCE_READY"
  | "EVIDENCE_REQUIRED"
  | "BLOCKED";

export type TimeAttendanceHardeningGate = {
  id: TimeAttendanceHardeningGateId;
  name: string;
  status: TimeAttendanceHardeningGateStatus;
  summary: string;
  sourceControls: string[];
  requiredEvidence: string[];
  blockers: string[];
};

export type TimeAttendanceHardeningPilotReadiness = {
  generatedAt: string;
  permitted: boolean;
  phase: "TA-G5";
  pilotEligible: boolean;
  productionEligible: boolean;
  totals: {
    blocked: number;
    evidenceRequired: number;
    gates: number;
    sourceReady: number;
  };
  gates: TimeAttendanceHardeningGate[];
};

const gates: TimeAttendanceHardeningGate[] = [
  {
    id: "TA-050",
    name: "Security and privacy review",
    status: "EVIDENCE_REQUIRED",
    summary: "Source boundaries protect manager/payroll actions and restrict protected ESST reason details, but adversarial privacy review is still required.",
    sourceControls: [
      "staff self-service is scoped to the authenticated user unless manager authority is present",
      "manager queue hides ordinary manager review from non-managers",
      "protected ESST reasons are hashed/restricted and ordinary queue detail is redacted",
      "payroll handoff commands require manager authority"
    ],
    requiredEvidence: [
      "least-privilege matrix for employee, manager, payroll, and leave-admin roles",
      "restricted leave-data access review",
      "payroll export access and retention review",
      "abuse-case review for correction, attestation, lock, export, and reopen actions"
    ],
    blockers: [
      "external least-privilege and restricted-leave privacy review has not been accepted",
      "real reviewer assignments and separation-of-duties evidence have not been approved"
    ]
  },
  {
    id: "TA-051",
    name: "Reliability, load, and concurrency proof",
    status: "EVIDENCE_REQUIRED",
    summary: "Idempotent command foundations exist for punches, corrections, attestations, time off, and payroll handoff, but production-like concurrency/load evidence is not yet present.",
    sourceControls: [
      "capture commands use idempotency and expected aggregate versions",
      "correction, attestation, time-off, and payroll command paths reject conflicting retries",
      "readiness gates block unresolved correction and exception states before payroll lock",
      "payroll export/reproduction uses checksums and versioned card references"
    ],
    requiredEvidence: [
      "double-punch and concurrent meal-command stress test",
      "concurrent correction/attestation stale-version test",
      "payroll lock/export retry and timeout simulation",
      "outbox/dead-letter and delayed acknowledgment recovery evidence"
    ],
    blockers: [
      "no production-like load run has been recorded",
      "no production-like concurrency/load run has been recorded"
    ]
  },
  {
    id: "TA-052",
    name: "Backup, restore, and retention proof",
    status: "BLOCKED",
    summary: "Replay/checksum contracts exist, but a migrated-runtime restore drill has not been completed.",
    sourceControls: [
      "time-card replay produces stable checksums",
      "payroll batches store snapshots, lines, and file checksums",
      "correction and manager decision evidence preserves original punch-trail intent",
      "reproduction API reports whether a stored batch can be reproduced"
    ],
    requiredEvidence: [
      "restore drill reconciling attendance events, sessions, cards, approvals, and export lines",
      "retention schedule approval for punch, leave, correction, attestation, approval, and export data",
      "legal hold and deletion exception procedure",
      "checksum reconciliation report after restore"
    ],
    blockers: [
      "a real backup/restore drill and post-restore checksum reconciliation remain pending"
    ]
  },
  {
    id: "TA-053",
    name: "Accessibility and responsive proof",
    status: "EVIDENCE_REQUIRED",
    summary: "The CCC page exposes keyboard-friendly native controls and visible unavailable states, but formal browser/device/accessibility evidence has not been captured.",
    sourceControls: [
      "forms use native input, select, textarea, and button controls",
      "manager-only, empty, loading, failure, and unavailable states are visible",
      "payroll handoff controls are disabled until required reason/batch/readiness conditions are met",
      "responsive CSS stacks primary panels and controls on small screens"
    ],
    requiredEvidence: [
      "keyboard-only employee capture and correction walkthrough",
      "screen-reader review of employee, manager, and payroll panels",
      "mobile capture and manager queue responsive screenshots",
      "browser acceptance evidence for unavailable and retry states"
    ],
    blockers: [
      "no formal accessibility audit artifact is attached",
      "formal assistive-technology and representative device evidence remain pending"
    ]
  },
  {
    id: "TA-054",
    name: "Parallel payroll pilot",
    status: "BLOCKED",
    summary: "The payroll handoff path can preview, lock, acknowledge, reject, reconcile, and reproduce batches, but no representative parallel pay period has been reconciled.",
    sourceControls: [
      "pay-period readiness projection identifies payroll blockers",
      "locked batches bind exact card versions and checksums",
      "export preview produces regular, overtime, and ESST control totals",
      "acknowledgment, rejection, and reconciliation decisions are recorded"
    ],
    requiredEvidence: [
      "one representative full pay period run beside the current authoritative process",
      "employee-level reconciliation for source punches and paid minutes",
      "earning-code reconciliation for regular, overtime, leave, and ESST",
      "documented resolution of every unexplained variance"
    ],
    blockers: [
      "payroll-code/file-format mapping is not formally approved",
      "parallel payroll pilot has not run"
    ]
  },
  {
    id: "TA-055",
    name: "Training, support, and rollback",
    status: "EVIDENCE_REQUIRED",
    summary: "The rollback posture is non-destructive because records are append-only and feature activation is still gated, but runbook ownership and drills remain required.",
    sourceControls: [
      "payroll reopen voids batches instead of deleting history",
      "commands preserve audit/evidence instead of direct database repair",
      "production activation remains blocked by explicit gates",
      "docs define operational ownership areas"
    ],
    requiredEvidence: [
      "employee quick-start instructions",
      "manager/payroll close checklist",
      "support escalation owner and service-level expectation",
      "rollback drill proving feature disablement without data deletion",
      "first-live reconciliation checklist"
    ],
    blockers: [
      "training material and support ownership are not signed off",
      "rollback drill has not been performed"
    ]
  }
];

export function evaluateTimeAttendanceHardeningPilotReadiness(
  actor: AuthenticatedUser | null,
  now = new Date()
): TimeAttendanceHardeningPilotReadiness {
  const user = assertAuthenticatedUser(actor);
  const permitted = evaluateTimeAttendanceCapability({ actor: user, capability: "TIME_PAYROLL_ADMIN" }).allowed;
  const visibleGates = permitted ? gates : [];
  const totals = {
    blocked: visibleGates.filter((gate) => gate.status === "BLOCKED").length,
    evidenceRequired: visibleGates.filter((gate) => gate.status === "EVIDENCE_REQUIRED").length,
    gates: visibleGates.length,
    sourceReady: visibleGates.filter((gate) => gate.status === "SOURCE_READY").length
  };

  return {
    generatedAt: now.toISOString(),
    permitted,
    phase: "TA-G5",
    pilotEligible: permitted && totals.gates > 0 && totals.blocked === 0 && totals.evidenceRequired === 0,
    productionEligible: false,
    totals,
    gates: visibleGates
  };
}
