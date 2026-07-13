import { average } from "./math";

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

export type VehicleKpiRecord = {
  activeHours: number;
  daysHeld: number;
  daysToFrontline: number | null;
  delivered: boolean;
  gross: number | null;
  idleHours: number;
  reconActualCost: number | null;
  reconEstimatedCost: number | null;
  sold: boolean;
  waitingHours: number;
};

export function calculateVehicleKpis(records: VehicleKpiRecord[]) {
  const sold = records.filter((record) => record.sold);
  const frontline = records.flatMap((record) => record.daysToFrontline === null ? [] : [record.daysToFrontline]);
  const grossPerDay = sold.flatMap((record) => record.gross === null || record.daysHeld <= 0 ? [] : [record.gross / record.daysHeld]);
  const reconWithEstimates = records.filter((record) => record.reconActualCost !== null && record.reconEstimatedCost !== null && record.reconEstimatedCost > 0);
  const totalTrackedHours = records.reduce((sum, record) => sum + record.activeHours + record.waitingHours + record.idleHours, 0);
  return {
    averageDaysHeld: average(records.map((record) => record.daysHeld)),
    averageDaysToFrontline: average(frontline),
    averageGrossPerDay: average(grossPerDay),
    deliveryCompletionRate: ratio(records.filter((record) => record.delivered).length, sold.length),
    idleTimeShare: ratio(records.reduce((sum, record) => sum + record.idleHours, 0), totalTrackedHours),
    reconEstimateVarianceRate: average(reconWithEstimates.map((record) => Math.abs((record.reconActualCost ?? 0) - (record.reconEstimatedCost ?? 0)) / Math.max(1, record.reconEstimatedCost ?? 1))),
    soldCount: sold.length,
    waitingTimeShare: ratio(records.reduce((sum, record) => sum + record.waitingHours, 0), totalTrackedHours)
  };
}

export type PartKpiRecord = {
  demandQuantity: number;
  emergencyOrder: boolean;
  filledQuantity: number;
  inventoryAccurate: boolean;
  obsoleteValue: number;
  orderedOnTime: boolean;
  partCorrectFirstTime: boolean;
  recoverableCredit: number;
  recoveredCredit: number;
  stockout: boolean;
};

export function calculatePartKpis(records: PartKpiRecord[]) {
  const totalDemand = records.reduce((sum, record) => sum + record.demandQuantity, 0);
  const recoverableCredit = records.reduce((sum, record) => sum + record.recoverableCredit, 0);
  return {
    creditRecoveryRate: ratio(records.reduce((sum, record) => sum + record.recoveredCredit, 0), recoverableCredit),
    emergencyOrderRate: ratio(records.filter((record) => record.emergencyOrder).length, records.length),
    fillRate: ratio(records.reduce((sum, record) => sum + record.filledQuantity, 0), totalDemand),
    firstTimeAccuracyRate: ratio(records.filter((record) => record.partCorrectFirstTime).length, records.length),
    inventoryAccuracyRate: ratio(records.filter((record) => record.inventoryAccurate).length, records.length),
    obsoleteInventoryValue: records.reduce((sum, record) => sum + record.obsoleteValue, 0),
    supplierOnTimeRate: ratio(records.filter((record) => record.orderedOnTime).length, records.length),
    stockoutRate: ratio(records.filter((record) => record.stockout).length, records.length)
  };
}

export type CommandKpiRecord = {
  accepted: boolean;
  alertUseful: boolean | null;
  blockerResolutionHours: number | null;
  duplicateTask: boolean;
  expectedCompletionErrorHours: number | null;
  missingData: boolean;
  overridden: boolean;
  unownedException: boolean;
};

export function calculateCommandKpis(records: CommandKpiRecord[]) {
  const alerts = records.filter((record) => record.alertUseful !== null);
  const blockerHours = records.flatMap((record) => record.blockerResolutionHours === null ? [] : [record.blockerResolutionHours]);
  const completionErrors = records.flatMap((record) => record.expectedCompletionErrorHours === null ? [] : [Math.abs(record.expectedCompletionErrorHours)]);
  return {
    acceptanceRate: ratio(records.filter((record) => record.accepted).length, records.length),
    alertUsefulnessRate: ratio(alerts.filter((record) => record.alertUseful).length, alerts.length),
    averageBlockerResolutionHours: average(blockerHours),
    averageCompletionErrorHours: average(completionErrors),
    duplicateTaskRate: ratio(records.filter((record) => record.duplicateTask).length, records.length),
    missingDataRate: ratio(records.filter((record) => record.missingData).length, records.length),
    overrideRate: ratio(records.filter((record) => record.overridden).length, records.length),
    unownedExceptionRate: ratio(records.filter((record) => record.unownedException).length, records.length)
  };
}

export function evaluateCalibrationGate(input: {
  minimumOutcomeCount: number;
  observedOutcomeCount: number;
  overrideRate: number;
  recommendationErrorRate: number;
  safetyViolationCount: number;
}) {
  const reasonCodes: string[] = [];
  if (input.observedOutcomeCount < input.minimumOutcomeCount) reasonCodes.push("CALIBRATION_SAMPLE_TOO_SMALL");
  if (input.overrideRate > 0.4) reasonCodes.push("CALIBRATION_OVERRIDE_RATE_HIGH");
  if (input.recommendationErrorRate > 0.25) reasonCodes.push("CALIBRATION_ERROR_RATE_HIGH");
  if (input.safetyViolationCount > 0) reasonCodes.push("CALIBRATION_SAFETY_VIOLATION");
  return { eligibleForWeightReview: reasonCodes.length === 0, reasonCodes };
}

