export type WopPlanType = "Retail recon" | "Safety first" | "Fast frontline" | "Exception";
export type WopRecommendation = "Ready for estimating" | "Ready for sequencing" | "Ready for authorization" | "Ready for recon dispatch" | "Exception" | "Hold";

export type WopWorkOrderInput = {
  acceptedFindingsMapped: boolean;
  contingencyCaptured: boolean;
  criticalPathSequenced: boolean;
  diagnosisJobsCreated: boolean;
  estimatedTotalDollars: number;
  estimateVersionLocked: boolean;
  laborHoursConfirmed: boolean;
  managerApprovalReceived: boolean;
  nextStageTargetConfirmed: boolean;
  outsideCapacityConfirmed: boolean;
  partsAvailabilityConfirmed: boolean;
  planType: WopPlanType;
  readinessRisksAssigned: boolean;
  repairJobsCreated: boolean;
  subletAndFeesConfirmed: boolean;
  technicianOrVendorAssigned: boolean;
  totalBudgetApproved: boolean;
  workDependenciesLinked: boolean;
};

export type WopWorkOrderResult = {
  assignmentComplete: boolean;
  authorizationComplete: boolean;
  blockerCount: number;
  blockers: string[];
  confidence: "Low" | "Medium" | "High";
  estimateComplete: boolean;
  explanation: string;
  jobsComplete: boolean;
  positiveDrivers: string[];
  readinessComplete: boolean;
  readinessScore: number;
  recommendation: WopRecommendation;
  sequencingComplete: boolean;
};

export function evaluateWopWorkOrder(input: WopWorkOrderInput): WopWorkOrderResult {
  const jobsComplete = input.acceptedFindingsMapped && input.diagnosisJobsCreated && input.repairJobsCreated;
  const estimateComplete = input.laborHoursConfirmed && input.subletAndFeesConfirmed && input.contingencyCaptured && input.estimateVersionLocked;
  const sequencingComplete = input.workDependenciesLinked && input.criticalPathSequenced;
  const assignmentComplete = input.technicianOrVendorAssigned && input.nextStageTargetConfirmed;
  const readinessComplete = input.partsAvailabilityConfirmed && input.outsideCapacityConfirmed && input.readinessRisksAssigned;
  const managerApprovalRequired = input.estimatedTotalDollars > 500;
  const authorizationComplete = input.totalBudgetApproved
    && input.estimateVersionLocked
    && (!managerApprovalRequired || input.managerApprovalReceived);

  const blockers = [
    ...(!jobsComplete ? ["Accepted findings still need to be mapped into controlled jobs"] : []),
    ...(!estimateComplete ? ["Estimate version still needs labor, fees, contingency, or lock controls"] : []),
    ...(!sequencingComplete ? ["Dependencies and critical path still need to be sequenced"] : []),
    ...(!assignmentComplete ? ["Technician or vendor assignment still needs a target owner and date"] : []),
    ...(!readinessComplete ? ["Parts, outside capacity, or readiness risks are still unresolved"] : []),
    ...(input.estimatedTotalDollars <= 0 ? ["Estimated total budget must be recorded before approval"] : []),
    ...(managerApprovalRequired && !input.managerApprovalReceived ? ["Estimated total is above $500. Manager approval is still required"] : []),
    ...(!authorizationComplete && !(managerApprovalRequired && !input.managerApprovalReceived) ? ["Budget approval is still required before recon dispatch"] : []),
    ...(input.planType === "Exception" ? ["Exception plan selected; manual review remains required"] : []),
  ];

  let readinessScore = 0;
  if (jobsComplete) readinessScore += 18;
  if (estimateComplete) readinessScore += 18;
  if (sequencingComplete) readinessScore += 16;
  if (assignmentComplete) readinessScore += 16;
  if (readinessComplete) readinessScore += 16;
  if (authorizationComplete) readinessScore += 16;

  let recommendation: WopRecommendation = "Hold";
  if (input.planType === "Exception") recommendation = "Exception";
  else if (jobsComplete && !estimateComplete) recommendation = "Ready for estimating";
  else if (jobsComplete && estimateComplete && !sequencingComplete) recommendation = "Ready for sequencing";
  else if (jobsComplete && estimateComplete && sequencingComplete && assignmentComplete && readinessComplete && !authorizationComplete) recommendation = "Ready for authorization";
  else if (jobsComplete && estimateComplete && sequencingComplete && assignmentComplete && readinessComplete && authorizationComplete) recommendation = "Ready for recon dispatch";

  const positiveDrivers = [
    ...(jobsComplete ? ["Accepted findings are mapped into governed work-order jobs"] : []),
    ...(estimateComplete ? [`Labor, parts, fees, and contingency are locked in the current estimate version (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.estimatedTotalDollars)})`] : []),
    ...(sequencingComplete ? ["Dependencies and critical path are visible to recon dispatch"] : []),
    ...(assignmentComplete ? ["Assignments and completion targets are already set"] : []),
    ...(readinessComplete ? ["Parts and outside capacity are ready for execution planning"] : []),
    ...(authorizationComplete ? [managerApprovalRequired ? "Manager authority has approved this exact work-order version above $500" : "Budget authority has approved this exact work-order version within the $500 shop limit"] : []),
  ];

  const confidence = blockers.length <= 1 ? "High" : blockers.length <= 3 ? "Medium" : "Low";
  const explanation = recommendation === "Ready for recon dispatch"
    ? "Work-order planning is complete and the unit can move into recon execution."
    : recommendation === "Ready for authorization"
      ? "The plan is built and ready for final budget approval."
      : recommendation === "Ready for sequencing"
        ? "The estimate is ready. Sequence dependencies before dispatch."
        : recommendation === "Ready for estimating"
          ? "Controlled jobs exist and now need labor, cost, and estimate versioning."
          : recommendation === "Exception"
            ? "This work order needs manual review before recon dispatch."
            : "Work-order planning cannot release until jobs, estimate, readiness, and authority are controlled.";

  return {
    assignmentComplete,
    authorizationComplete,
    blockerCount: blockers.length,
    blockers,
    confidence,
    estimateComplete,
    explanation,
    jobsComplete,
    positiveDrivers,
    readinessComplete,
    readinessScore,
    recommendation,
    sequencingComplete,
  };
}
