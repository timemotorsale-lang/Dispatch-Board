import { getVerticalSliceClassificationIndex } from "./vertical-slice-audit";

export type PostGapClosureTrack = {
  code: "WAVE_6_SHARED_EXPERIENCE_AUTHORITY" | "WAVE_7_LIFECYCLE_AUTOMATION_RECOVERY" | "WAVE_8_DOMAIN_RECONCILIATION" | "OPERATIONAL_EVIDENCE";
  branch: string | null;
  execution: "REPOSITORY_THEN_REASSESS" | "EVIDENCE_ONLY";
  ids: readonly string[];
  purpose: string;
};

export const POST_GAP_CLOSURE_TRACKS: readonly PostGapClosureTrack[] = [
  {
    code: "WAVE_6_SHARED_EXPERIENCE_AUTHORITY",
    branch: "codex/inventory-console-gap-closure-wave-6-shared-experience-authority",
    execution: "REPOSITORY_THEN_REASSESS",
    ids: ["IC-002", "IC-014", "IC-022", "IC-024", "IC-026", "IC-027", "IC-106"],
    purpose: "Close traceability, evidence access, cross-domain search/context, launcher, priority-work, approval-action, and authority-administration repository gaps."
  },
  {
    code: "WAVE_7_LIFECYCLE_AUTOMATION_RECOVERY",
    branch: "codex/inventory-console-gap-closure-wave-7-lifecycle-automation-recovery",
    execution: "REPOSITORY_THEN_REASSESS",
    ids: ["IC-015", "IC-028", "IC-047", "IC-050", "IC-051", "IC-052", "IC-053", "IC-054", "IC-055", "IC-056", "IC-057"],
    purpose: "Close rollout inheritance, honest recovery, compensation, escalation, lifecycle automation, and cross-domain execution gaps before external validation."
  },
  {
    code: "WAVE_8_DOMAIN_RECONCILIATION",
    branch: "codex/inventory-console-gap-closure-wave-8-domain-reconciliation",
    execution: "REPOSITORY_THEN_REASSESS",
    ids: ["IC-061", "IC-062", "IC-063", "IC-064", "IC-065", "IC-066", "IC-083", "IC-089", "IC-097"],
    purpose: "Close scheduled retail automation, mismatch operations, Control Tower joins, configurable Parts authority, workspace export/saved-view, and settlement operations."
  },
  {
    code: "OPERATIONAL_EVIDENCE",
    branch: null,
    execution: "EVIDENCE_ONLY",
    ids: ["IC-005", "IC-020", "IC-045", "IC-048", "IC-060", "IC-074", "IC-078", "IC-079", "IC-094", "IC-096", "IC-099"],
    purpose: "Collect approvals, representative table-tops, provider acknowledgements, accessibility/performance, deployment, pilot, and release evidence without inventing repository work."
  }
] as const;

export function reviewPostGapClosureConformance() {
  const audit = getVerticalSliceClassificationIndex(), partialIds = audit.slices.filter(row => row.status === "PARTIAL").map(row => row.id).sort(), plannedIds = POST_GAP_CLOSURE_TRACKS.flatMap(track => track.ids).sort();
  const duplicates = plannedIds.filter((id, index) => plannedIds.indexOf(id) !== index), missing = partialIds.filter(id => !plannedIds.includes(id)), unexpected = plannedIds.filter(id => !partialIds.includes(id));
  const blockers = [...new Set([...duplicates.map(id => `Duplicate review assignment: ${id}.`), ...missing.map(id => `Partial slice is unassigned: ${id}.`), ...unexpected.map(id => `Review assigns a non-partial slice: ${id}.`)])];
  const repositoryTracks = POST_GAP_CLOSURE_TRACKS.filter(track => track.execution === "REPOSITORY_THEN_REASSESS"), evidenceTrack = POST_GAP_CLOSURE_TRACKS.find(track => track.execution === "EVIDENCE_ONLY");
  return {
    contractVersion: "inventory-console-post-gap-closure-review/v1",
    disposition: blockers.length ? "BLOCKED" as const : "REVIEWED" as const,
    completionClaim: "NONE_REVIEW_ONLY" as const,
    blockers,
    baselineCounts: audit.counts,
    partialSlices: partialIds.length,
    repositoryThenReassess: repositoryTracks.reduce((total, track) => total + track.ids.length, 0),
    operationalEvidenceOnly: evidenceTrack?.ids.length ?? 0,
    nextBranch: blockers.length ? null : repositoryTracks[0]?.branch ?? null,
    tracks: POST_GAP_CLOSURE_TRACKS
  };
}
