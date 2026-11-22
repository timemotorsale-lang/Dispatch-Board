export const FINAL_REPAIR_QC_TEMPLATE = "FINAL_REPAIR_CHECKLIST";

export const FINAL_REPAIR_QC_RECOMMENDATION_LABEL = "Reviewed · recommendation";
export const FINAL_REPAIR_QC_FINDING_MAX = 200;
export const FINAL_REPAIR_QC_NOTE_MIN = 10;
export const FINAL_REPAIR_QC_NOTE_MAX = 1000;

export type FinalRepairQcRecommendation = { finding: string; note: string };

export function readFinalRepairQcRecommendation(
  inspection: { disposition: string; templateSnapshot?: unknown } | null | undefined
): FinalRepairQcRecommendation | null {
  if (inspection?.disposition !== "PASSED") return null;
  const snapshot = inspection.templateSnapshot;
  if (!snapshot || typeof snapshot !== "object" || !("templateCode" in snapshot) ||
    snapshot.templateCode !== FINAL_REPAIR_QC_TEMPLATE || !("recommendation" in snapshot)) return null;

  const recommendation = snapshot.recommendation;
  if (!recommendation || typeof recommendation !== "object" ||
    !("finding" in recommendation) || typeof recommendation.finding !== "string" ||
    !("note" in recommendation) || typeof recommendation.note !== "string") return null;

  const finding = recommendation.finding.trim();
  const note = recommendation.note.trim();
  return finding && finding.length <= FINAL_REPAIR_QC_FINDING_MAX &&
    note.length >= FINAL_REPAIR_QC_NOTE_MIN && note.length <= FINAL_REPAIR_QC_NOTE_MAX
    ? { finding, note } : null;
}

export const finalRepairChecks = [
  { code: "REPAIR_COMPLETE", category: "COMPLETION", label: "Approved work is complete" },
  { code: "CONCERN_RESOLVED", category: "COMPLETION", label: "Concern covered by this job was addressed" },
  { code: "FINAL_SAFETY_CHECK", category: "SAFETY", label: "Safety and function verified" },
  { code: "FIT_FINISH", category: "OTHER", label: "Fit and finish acceptable" }
] as const;

export function repairChecklistItems(procedureRules: unknown) {
  const rules = Array.isArray(procedureRules)
    ? procedureRules.filter((rule): rule is string => typeof rule === "string" && Boolean(rule.trim()))
    : [];
  return [
    ...finalRepairChecks,
    ...rules.map((label, index) => ({ code: `PROCEDURE_${index + 1}`, category: "OTHER" as const, label: label.trim().slice(0, 200) }))
  ];
}

export function needsRepairRoadTest(job: { description: string; plannedCorrection: string }) {
  return /\b(?:brakes?|braking|steering|suspension|road test|drivability|vibrations?|alignment|engine|transmission|control arms?|stabilizer links?|sway bar links?)\b/i.test(
    `${job.description} ${job.plannedCorrection}`
  );
}
