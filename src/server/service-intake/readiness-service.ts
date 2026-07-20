import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";

export const SERVICE_INTAKE_READINESS_CONTRACT = "service-intake/readiness-v1.0.0";
export const SERVICE_INTAKE_READINESS_POLICY = "TMS-SERVICE-ACCEPTANCE-v1";

type CheckStatus = "PASS" | "WARNING" | "REVIEW";
export type ServiceIntakeReadinessCheck = { code: string; label: string; message: string; status: CheckStatus };
export type ServiceIntakeReadinessProjection = {
  appointment: null | {
    appointmentNumber: string;
    attendanceStatus: string;
    endsAt: string | null;
    expectedVersion: number;
    id: string;
    owner: string | null;
    startsAt: string | null;
    timing: "EARLY" | "LATE" | "ON_TIME" | "UNSCHEDULED";
    title: string;
  };
  alternatives: string[];
  canAcceptCustody: true;
  checks: ServiceIntakeReadinessCheck[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  contractVersion: string;
  diagnosisOutlook: "CAPACITY_REVIEW" | "LIKELY_TODAY" | "SCHEDULED_WINDOW";
  expiresAt: string;
  facts: {
    activeBayCapacity: number;
    activeStaffCapacity: number;
    availableBayCapacity: number;
    availableStaffCapacity: number;
    matchedAppointmentCount: number;
    openRepairOrders: number;
    overdueRepairOrders: number;
    reservedBayCapacity: number;
    reservedStaffCapacity: number;
  };
  generatedAt: string;
  policyVersion: string;
  promiseConfidence: "CONDITIONAL" | "DO_NOT_PROMISE" | "HIGH";
  recommendation: string;
  snapshotId: string;
  status: "ACCEPT_WITH_CONSTRAINTS" | "MANAGER_REVIEW" | "READY";
};

type Input = { arrivedAt?: unknown; customerId?: unknown; locationId?: unknown; vehicleId?: unknown };
type Repository = {
  createSnapshot(value: {
    appointmentId: string | null;
    checks: ServiceIntakeReadinessCheck[];
    confidence: ServiceIntakeReadinessProjection["confidence"];
    contractVersion: string;
    customerId: string;
    diagnosisOutlook: ServiceIntakeReadinessProjection["diagnosisOutlook"];
    evaluatedByUserId: string;
    expiresAt: Date;
    facts: ServiceIntakeReadinessProjection["facts"];
    generatedAt: Date;
    id: string;
    locationId: string;
    organizationId: string;
    policyVersion: string;
    promiseConfidence: ServiceIntakeReadinessProjection["promiseConfidence"];
    recommendation: string;
    status: ServiceIntakeReadinessProjection["status"];
    vehicleId: string;
  }): Promise<{ id: string }>;
  readFacts(input: { arrivedAt: Date; customerId: string; locationId: string; organizationId: string; vehicleId: string }): Promise<ReadinessFacts>;
};

type ReadinessFacts = {
  appointments: Array<{
    appointmentNumber: string;
    attendanceStatus: string;
    endsAt: Date | null;
    id: string;
    ownerUser: { name: string } | null;
    resourceRequirements: Array<{
      assignmentTiming: string;
      hardBlockIfUnfulfilled: boolean;
      isMandatory: boolean;
      requirementCode: string;
      reservations: Array<{ resource: { resourceType: { kind: string } }; status: string }>;
    }>;
    startsAt: Date | null;
    title: string;
    version: number;
  }>;
  identity: { customer: boolean; location: boolean; vehicle: boolean };
  openRepairOrders: number;
  overdueRepairOrders: number;
  resources: Array<{
    capacity: number;
    kind: string;
    reservations: Array<{ appointmentId: string; capacityUnits: number }>;
    unavailability: Array<{ capacityReduction: number | null; type: string }>;
  }>;
};

type Dependencies = { foundationRepository?: EnterpriseCommandRepository; now?: () => Date; organizationId?: string; repository?: Repository };

function required(value: unknown, label: string) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function arrival(value: unknown, now: Date) {
  const result = value ? new Date(String(value)) : now;
  if (Number.isNaN(result.getTime())) throw new Error("Arrival time must be valid.");
  if (result.getTime() > now.getTime() + 5 * 60_000) throw new Error("Arrival time cannot be in the future.");
  return result;
}

function capacity(resources: ReadinessFacts["resources"], kind: "SERVICE_BAY" | "STAFF", appointmentId: string | null) {
  const matching = resources.filter((resource) => resource.kind === kind);
  const active = matching.reduce((sum, resource) => sum + resource.capacity, 0);
  const unavailable = matching.reduce((sum, resource) => sum + Math.min(resource.capacity, resource.unavailability.reduce((total, item) => total + (item.capacityReduction ?? resource.capacity), 0)), 0);
  const reserved = matching.reduce((sum, resource) => sum + resource.reservations.filter((item) => item.appointmentId !== appointmentId).reduce((total, item) => total + item.capacityUnits, 0), 0);
  return { active, available: Math.max(0, active - unavailable - reserved), reserved, unavailable };
}

function timing(startsAt: Date | null, arrivedAt: Date) {
  if (!startsAt) return "UNSCHEDULED" as const;
  const deltaMinutes = (arrivedAt.getTime() - startsAt.getTime()) / 60_000;
  if (deltaMinutes < -45) return "EARLY" as const;
  if (deltaMinutes > 45) return "LATE" as const;
  return "ON_TIME" as const;
}

export function buildServiceIntakeReadiness(facts: ReadinessFacts, arrivedAt: Date, generatedAt: Date): Omit<ServiceIntakeReadinessProjection, "expiresAt" | "snapshotId"> {
  if (!facts.identity.customer) throw new Error("Customer is not active in this organization.");
  if (!facts.identity.vehicle) throw new Error("Vehicle is not active in this organization.");
  if (!facts.identity.location) throw new Error("Location is not available to this organization.");
  const matched = facts.appointments[0] ?? null;
  const appointmentTiming = timing(matched?.startsAt ?? null, arrivedAt);
  const mandatory = matched?.resourceRequirements.filter((item) => item.isMandatory && item.assignmentTiming !== "OPTIONAL") ?? [];
  const missingMandatory = mandatory.filter((item) => !item.reservations.some((reservation) => ["HELD", "COMMITTED"].includes(reservation.status)));
  const appointmentStaffReserved = mandatory.some((item) => item.reservations.some((reservation) => reservation.resource.resourceType.kind === "STAFF" && ["HELD", "COMMITTED"].includes(reservation.status)));
  const appointmentBayReserved = mandatory.some((item) => item.reservations.some((reservation) => reservation.resource.resourceType.kind === "SERVICE_BAY" && ["HELD", "COMMITTED"].includes(reservation.status)));
  const staff = capacity(facts.resources, "STAFF", matched?.id ?? null);
  const bays = capacity(facts.resources, "SERVICE_BAY", matched?.id ?? null);
  const effectiveStaff = staff.available + Number(appointmentStaffReserved);
  const effectiveBays = bays.available + Number(appointmentBayReserved);
  const loadPerStaff = facts.openRepairOrders / Math.max(1, staff.active);
  const overdueRate = facts.openRepairOrders ? facts.overdueRepairOrders / facts.openRepairOrders : 0;
  const checks: ServiceIntakeReadinessCheck[] = [
    matched
      ? { code: "APPOINTMENT_MATCH", label: "Appointment", status: "PASS", message: `${matched.appointmentNumber} matched this customer and vehicle.` }
      : { code: "APPOINTMENT_MATCH", label: "Appointment", status: "WARNING", message: "No eligible appointment matched; evaluate this vehicle as a walk-in." },
    matched && appointmentTiming === "ON_TIME"
      ? { code: "ARRIVAL_WINDOW", label: "Arrival window", status: "PASS", message: "Arrival is within the scheduled check-in window." }
      : matched
        ? { code: "ARRIVAL_WINDOW", label: "Arrival window", status: "WARNING", message: `Customer is ${appointmentTiming.toLocaleLowerCase()} for the scheduled window.` }
        : { code: "ARRIVAL_WINDOW", label: "Arrival window", status: "WARNING", message: "No scheduled arrival window is available." },
    missingMandatory.some((item) => item.hardBlockIfUnfulfilled)
      ? { code: "RESOURCES", label: "Reserved resources", status: "REVIEW", message: `${missingMandatory.length} mandatory appointment resource requirement(s) are not held or committed.` }
      : mandatory.length
        ? { code: "RESOURCES", label: "Reserved resources", status: missingMandatory.length ? "WARNING" : "PASS", message: missingMandatory.length ? "Some appointment resources remain unconfirmed." : "Mandatory appointment resources are held or committed." }
        : { code: "RESOURCES", label: "Reserved resources", status: "WARNING", message: "No appointment resource plan is attached." },
    effectiveStaff > 0
      ? { code: "STAFF_CAPACITY", label: "Staff capacity", status: "PASS", message: `${effectiveStaff} configured staff capacity unit(s) remain available or reserved for this visit.` }
      : { code: "STAFF_CAPACITY", label: "Staff capacity", status: "REVIEW", message: "No configured staff capacity is currently available or reserved." },
    effectiveBays > 0
      ? { code: "BAY_CAPACITY", label: "Bay capacity", status: "PASS", message: `${effectiveBays} service-bay capacity unit(s) remain available or reserved for this visit.` }
      : { code: "BAY_CAPACITY", label: "Bay capacity", status: bays.active ? "REVIEW" : "WARNING", message: bays.active ? "No service-bay capacity is currently available or reserved." : "Service-bay capacity is not configured." },
    loadPerStaff <= 4
      ? { code: "SHOP_LOAD", label: "Current shop load", status: "PASS", message: `${facts.openRepairOrders} open repair order(s) across ${staff.active} configured staff capacity unit(s).` }
      : { code: "SHOP_LOAD", label: "Current shop load", status: loadPerStaff > 6 ? "REVIEW" : "WARNING", message: "Current open repair-order load may delay diagnosis or completion." },
    overdueRate <= 0.2
      ? { code: "PROMISE_RISK", label: "Promise risk", status: "PASS", message: `${facts.overdueRepairOrders} open repair order(s) are overdue.` }
      : { code: "PROMISE_RISK", label: "Promise risk", status: overdueRate > 0.4 ? "REVIEW" : "WARNING", message: "The current overdue workload increases promise risk." },
  ];
  const reviewCount = checks.filter((check) => check.status === "REVIEW").length;
  const warningCount = checks.filter((check) => check.status === "WARNING").length;
  const status = reviewCount ? "MANAGER_REVIEW" : warningCount ? "ACCEPT_WITH_CONSTRAINTS" : "READY";
  const promiseConfidence = reviewCount ? "DO_NOT_PROMISE" : warningCount ? "CONDITIONAL" : "HIGH";
  const diagnosisOutlook = reviewCount ? "CAPACITY_REVIEW" : matched ? "SCHEDULED_WINDOW" : "LIKELY_TODAY";
  const recommendation = status === "READY"
    ? "Accept custody and proceed with the scheduled service-intake plan."
    : status === "ACCEPT_WITH_CONSTRAINTS"
      ? "Accept custody, explain the visible constraints, and make only a conditional diagnosis or completion promise."
      : "Accept custody when operationally appropriate, but obtain manager review before promising diagnosis start or completion timing.";
  const alternatives = status === "READY" ? [] : [
    "Offer drop-off with a later diagnosis update.",
    "Review the next qualified appointment window.",
    "Check another permitted location for capacity.",
  ];
  return {
    appointment: matched ? { appointmentNumber: matched.appointmentNumber, attendanceStatus: matched.attendanceStatus, endsAt: matched.endsAt?.toISOString() ?? null, expectedVersion: matched.version, id: matched.id, owner: matched.ownerUser?.name ?? null, startsAt: matched.startsAt?.toISOString() ?? null, timing: appointmentTiming, title: matched.title } : null,
    alternatives,
    canAcceptCustody: true,
    checks,
    confidence: matched && staff.active > 0 && bays.active > 0 ? "HIGH" : matched || staff.active > 0 ? "MEDIUM" : "LOW",
    contractVersion: SERVICE_INTAKE_READINESS_CONTRACT,
    diagnosisOutlook,
    facts: { activeBayCapacity: bays.active, activeStaffCapacity: staff.active, availableBayCapacity: bays.available, availableStaffCapacity: staff.available, matchedAppointmentCount: facts.appointments.length, openRepairOrders: facts.openRepairOrders, overdueRepairOrders: facts.overdueRepairOrders, reservedBayCapacity: bays.reserved, reservedStaffCapacity: staff.reserved },
    generatedAt: generatedAt.toISOString(),
    policyVersion: SERVICE_INTAKE_READINESS_POLICY,
    promiseConfidence,
    recommendation,
    status,
  };
}

export function createServiceIntakeReadinessRepository(): Repository {
  return {
    async readFacts(input) {
      const windowStart = new Date(input.arrivedAt.getTime() - 12 * 60 * 60_000);
      const windowEnd = new Date(input.arrivedAt.getTime() + 36 * 60 * 60_000);
      const activeStatuses = ["HELD", "COMMITTED"] as const;
      const [customer, vehicle, location, appointments, openRepairOrders, overdueRepairOrders, resources] = await Promise.all([
        prisma.customer.findFirst({ where: { id: input.customerId, organizationId: input.organizationId, status: "ACTIVE", mergedIntoCustomerId: null }, select: { id: true } }),
        prisma.vehicle.findFirst({ where: { id: input.vehicleId, organizationId: input.organizationId, status: "ACTIVE", mergedIntoVehicleId: null }, select: { id: true } }),
        prisma.location.findFirst({ where: { id: input.locationId, organizationId: input.organizationId }, select: { id: true } }),
        prisma.appointment.findMany({
          where: { organizationId: input.organizationId, locationId: input.locationId, bookingStatus: "SCHEDULED", cancelledAt: null, noShowAt: null, completedAt: null, serviceVisit: null, startsAt: { gte: windowStart, lte: windowEnd }, participants: { some: { customerId: input.customerId, participantType: "CUSTOMER" } }, vehicles: { some: { vehicleId: input.vehicleId } } },
          orderBy: { startsAt: "asc" }, take: 3,
          select: { id: true, appointmentNumber: true, attendanceStatus: true, startsAt: true, endsAt: true, title: true, version: true, ownerUser: { select: { name: true } }, resourceRequirements: { select: { assignmentTiming: true, hardBlockIfUnfulfilled: true, isMandatory: true, requirementCode: true, reservations: { where: { status: { in: [...activeStatuses] } }, select: { status: true, resource: { select: { resourceType: { select: { kind: true } } } } } } } } },
        }),
        prisma.repairOrder.count({ where: { organizationId: input.organizationId, locationId: input.locationId, closedAt: null } }),
        prisma.repairOrder.count({ where: { organizationId: input.organizationId, locationId: input.locationId, closedAt: null, targetAt: { lt: input.arrivedAt } } }),
        prisma.schedulableResource.findMany({
          where: { organizationId: input.organizationId, locationId: input.locationId, status: "ACTIVE", effectiveFrom: { lte: input.arrivedAt }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.arrivedAt } }], resourceType: { kind: { in: ["STAFF", "SERVICE_BAY"] } } },
          select: { capacity: true, resourceType: { select: { kind: true } }, reservations: { where: { status: { in: [...activeStatuses] }, startsAt: { lte: input.arrivedAt }, endsAt: { gt: input.arrivedAt } }, select: { appointmentId: true, capacityUnits: true } }, unavailability: { where: { startsAt: { lte: input.arrivedAt }, endsAt: { gt: input.arrivedAt } }, select: { capacityReduction: true, type: true } } },
        }),
      ]);
      return { appointments, identity: { customer: Boolean(customer), location: Boolean(location), vehicle: Boolean(vehicle) }, openRepairOrders, overdueRepairOrders, resources: resources.map((resource) => ({ capacity: resource.capacity, kind: resource.resourceType.kind, reservations: resource.reservations, unavailability: resource.unavailability })) };
    },
    async createSnapshot(value) {
      return prisma.serviceIntakeReadinessSnapshot.create({ data: { ...value, checks: value.checks, facts: value.facts } });
    },
  };
}

export async function evaluateServiceIntakeReadiness(actor: AuthenticatedUser | null, value: Input, input: Dependencies = {}): Promise<ServiceIntakeReadinessProjection> {
  const user = assertAuthenticatedUser(actor);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const now = input.now?.() ?? new Date();
  const customerId = required(value.customerId, "Customer ID");
  const vehicleId = required(value.vehicleId, "Vehicle ID");
  const locationId = required(value.locationId, "Location ID");
  const arrivedAt = arrival(value.arrivedAt, now);
  const foundation = input.foundationRepository ?? createEnterpriseCommandRepository();
  const grants = await foundation.listCapabilityGrants(user.id, organizationId);
  assertVehicleCapability({ actor: user, capability: "REPAIR_ORDER_VIEW", grants, locationId, now });
  const repository = input.repository ?? createServiceIntakeReadinessRepository();
  const projection = buildServiceIntakeReadiness(await repository.readFacts({ arrivedAt, customerId, locationId, organizationId, vehicleId }), arrivedAt, now);
  const snapshotId = randomUUID();
  const expiresAt = new Date(now.getTime() + 2 * 60_000);
  await repository.createSnapshot({ appointmentId: projection.appointment?.id ?? null, checks: projection.checks, confidence: projection.confidence, contractVersion: projection.contractVersion, customerId, diagnosisOutlook: projection.diagnosisOutlook, evaluatedByUserId: user.id, expiresAt, facts: projection.facts, generatedAt: now, id: snapshotId, locationId, organizationId, policyVersion: projection.policyVersion, promiseConfidence: projection.promiseConfidence, recommendation: projection.recommendation, status: projection.status, vehicleId });
  return { ...projection, expiresAt: expiresAt.toISOString(), snapshotId };
}
