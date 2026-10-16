import { BRAKE_BASELINE_VERSION, brakeOperationForId, brakeScopeConflict } from "./brake-baseline";
import { STEERING_BASELINE_VERSION, steeringOperationForId, steeringScopeConflict } from "./steering-baseline";

export function repairBaselineForId(id: string) {
  const brake = brakeOperationForId(id);
  if (brake) return { system: "brakes", version: BRAKE_BASELINE_VERSION, operation: brake };
  const steering = steeringOperationForId(id);
  return steering ? { system: "steering", version: STEERING_BASELINE_VERSION, operation: steering } : null;
}

export function repairScopeConflict(leftId: string, rightId: string) {
  return brakeScopeConflict(leftId, rightId) || steeringScopeConflict(leftId, rightId);
}
