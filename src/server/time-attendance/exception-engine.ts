import type { TimeCalculationException } from "./calculations";
import type { TimeAttendanceNormalizationException } from "./normalization";
import type { TimePolicyResolutionException } from "./policy-resolution";

export type TimeCardExceptionCode =
  | TimeAttendanceNormalizationException["code"]
  | TimePolicyResolutionException["code"]
  | TimeCalculationException["code"]
  | "PLANNED_MEAL_SHORT_USED";

export type TimeCardExceptionProjection = {
  code: TimeCardExceptionCode;
  blocking: boolean;
  message: string;
  sourceIds: string[];
};

export function buildTimeCardExceptions(input: {
  normalizationExceptions: TimeAttendanceNormalizationException[];
  policyExceptions: TimePolicyResolutionException[];
  calculationExceptions: TimeCalculationException[];
  plannedMeal?: {
    expectedMinutes: number;
    actualUnpaidMealMinutes: number;
  } | null;
}) {
  const exceptions: TimeCardExceptionProjection[] = [
    ...input.normalizationExceptions.map((item) => ({
      code: item.code,
      blocking: item.blocking,
      message: item.message,
      sourceIds: item.sourceEventIds
    })),
    ...input.policyExceptions.map((item) => ({
      code: item.code,
      blocking: item.blocking,
      message: item.message,
      sourceIds: item.sourceIds
    })),
    ...input.calculationExceptions.map((item) => ({
      code: item.code,
      blocking: item.blocking,
      message: item.message,
      sourceIds: []
    }))
  ];

  if (
    input.plannedMeal &&
    input.plannedMeal.expectedMinutes > 0 &&
    input.plannedMeal.actualUnpaidMealMinutes < input.plannedMeal.expectedMinutes
  ) {
    exceptions.push({
      code: "PLANNED_MEAL_SHORT_USED",
      blocking: false,
      message: `Actual unpaid meal time was ${input.plannedMeal.actualUnpaidMealMinutes} minutes against a planned ${input.plannedMeal.expectedMinutes} minutes.`,
      sourceIds: []
    });
  }

  return exceptions;
}

export function hasBlockingTimeCardExceptions(exceptions: TimeCardExceptionProjection[]) {
  return exceptions.some((exception) => exception.blocking);
}
