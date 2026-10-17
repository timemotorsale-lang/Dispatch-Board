import { BRAKE_BASELINE_VERSION, brakeOperationForId, brakeScopeConflict } from "./brake-baseline";
import { STEERING_BASELINE_VERSION, steeringOperationForId, steeringScopeConflict } from "./steering-baseline";
import { LIGHT_DUTY_CATALOG_VERSION, lightDutyOperationForId, lightDutyScopeConflict } from "./light-duty-baseline";

export function repairBaselineForId(id: string) {
  const brake = brakeOperationForId(id);
  if (brake) return { system: "brakes", version: BRAKE_BASELINE_VERSION, operation: brake };
  const steering = steeringOperationForId(id);
  if (steering) return { system: "steering", version: STEERING_BASELINE_VERSION, operation: steering };
  const expanded = lightDutyOperationForId(id);
  return expanded ? { system: expanded.systemId, version: LIGHT_DUTY_CATALOG_VERSION, operation: expanded } : null;
}

export function repairScopeConflict(leftId: string, rightId: string) {
  return brakeScopeConflict(leftId, rightId) || steeringScopeConflict(leftId, rightId) || lightDutyScopeConflict(leftId, rightId);
}
