import type {
  ResourceCapacityMode,
  ResourceConflictPolicy,
  ResourceVisibilityClass,
  SchedulableResourceKind
} from "@/server/appointments/appointment-resource-domain";

export type InitialResourceTypeDefinition = {
  id: string;
  code: string;
  name: string;
  kind: SchedulableResourceKind;
  defaultCapacityMode: ResourceCapacityMode;
  defaultCapacity: number;
  defaultConflictPolicy: ResourceConflictPolicy;
  visibilityClass: ResourceVisibilityClass;
  isActive: boolean;
};

export const INITIAL_RESOURCE_TYPE_DEFINITIONS: readonly InitialResourceTypeDefinition[] = [
  {
    id: "resource-type-staff",
    code: "STAFF",
    name: "Staff Member",
    kind: "STAFF",
    defaultCapacityMode: "CAPACITY",
    defaultCapacity: 1,
    defaultConflictPolicy: "WARNING",
    visibilityClass: "OPERATIONAL",
    isActive: true
  },
  {
    id: "resource-type-vehicle",
    code: "VEHICLE",
    name: "Vehicle",
    kind: "VEHICLE",
    defaultCapacityMode: "EXCLUSIVE",
    defaultCapacity: 1,
    defaultConflictPolicy: "HARD_BLOCK",
    visibilityClass: "LIMITED",
    isActive: true
  },
  {
    id: "resource-type-service-bay",
    code: "SERVICE_BAY",
    name: "Service Bay",
    kind: "SERVICE_BAY",
    defaultCapacityMode: "EXCLUSIVE",
    defaultCapacity: 1,
    defaultConflictPolicy: "HARD_BLOCK",
    visibilityClass: "OPERATIONAL",
    isActive: true
  },
  {
    id: "resource-type-room",
    code: "ROOM",
    name: "Room",
    kind: "ROOM",
    defaultCapacityMode: "EXCLUSIVE",
    defaultCapacity: 1,
    defaultConflictPolicy: "HARD_BLOCK",
    visibilityClass: "OPERATIONAL",
    isActive: true
  },
  {
    id: "resource-type-equipment",
    code: "EQUIPMENT",
    name: "Equipment",
    kind: "EQUIPMENT",
    defaultCapacityMode: "EXCLUSIVE",
    defaultCapacity: 1,
    defaultConflictPolicy: "HARD_BLOCK",
    visibilityClass: "OPERATIONAL",
    isActive: true
  },
  {
    id: "resource-type-pool",
    code: "POOL",
    name: "Resource Pool",
    kind: "POOL",
    defaultCapacityMode: "CAPACITY",
    defaultCapacity: 1,
    defaultConflictPolicy: "HARD_BLOCK",
    visibilityClass: "OPERATIONAL",
    isActive: true
  },
  {
    id: "resource-type-location",
    code: "LOCATION",
    name: "Location Capacity",
    kind: "LOCATION",
    defaultCapacityMode: "CAPACITY",
    defaultCapacity: 1,
    defaultConflictPolicy: "HARD_BLOCK",
    visibilityClass: "OPERATIONAL",
    isActive: true
  },
  {
    id: "resource-type-other",
    code: "OTHER",
    name: "Other Configured Resource",
    kind: "OTHER",
    defaultCapacityMode: "EXCLUSIVE",
    defaultCapacity: 1,
    defaultConflictPolicy: "HARD_BLOCK",
    visibilityClass: "OPERATIONAL",
    isActive: true
  }
] as const;

export function getInitialResourceTypeDefinitions() {
  return INITIAL_RESOURCE_TYPE_DEFINITIONS.map((definition) => ({ ...definition }));
}
