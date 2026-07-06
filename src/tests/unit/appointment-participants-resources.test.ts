import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  APPOINTMENT_FIELD_CLASSIFICATION,
  projectCustomerForAppointment,
  projectVehicleForAppointment
} from "@/server/appointments/appointment-privacy";
import { getInitialResourceTypeDefinitions } from "@/server/appointments/resource-foundation";
import {
  normalizeAppointmentParticipant,
  normalizeAppointmentVehicle,
  normalizeCustomerReference,
  normalizeUserLocationAccess,
  normalizeVehicleReference
} from "@/server/validation/appointment-participants";
import {
  normalizeAppointmentResourceRequirement,
  normalizeAppointmentResourceReservation,
  normalizeResourceOperatingWindow,
  normalizeResourcePoolMember,
  normalizeResourceUnavailability,
  normalizeSchedulableResource,
  normalizeSchedulableResourceType
} from "@/server/validation/appointment-resources";

describe("appointment participants, customers, vehicles, and resources", () => {
  it("seeds approved resource-type definitions without inventing physical inventory", () => {
    const definitions = getInitialResourceTypeDefinitions();

    expect(definitions.map((definition) => definition.code)).toEqual([
      "STAFF",
      "VEHICLE",
      "SERVICE_BAY",
      "ROOM",
      "EQUIPMENT",
      "POOL",
      "LOCATION",
      "OTHER"
    ]);
    expect(definitions.find((definition) => definition.code === "VEHICLE")).toMatchObject({
      defaultCapacityMode: "EXCLUSIVE",
      defaultCapacity: 1,
      defaultConflictPolicy: "HARD_BLOCK",
      visibilityClass: "LIMITED"
    });
    expect(definitions.find((definition) => definition.code === "STAFF")).toMatchObject({
      defaultCapacityMode: "CAPACITY",
      defaultConflictPolicy: "WARNING"
    });
  });

  it("normalizes minimal customer identity and limited contact fields", () => {
    expect(
      normalizeCustomerReference({
        organizationId: "org-time-motor-sales",
        customerNumber: " cust-1024 ",
        displayName: " Abdi Hussein ",
        phoneNumber: "(612) 555-0147",
        email: " ABDI@EXAMPLE.COM ",
        status: "ACTIVE"
      })
    ).toMatchObject({
      customerNumber: "CUST-1024",
      displayName: "Abdi Hussein",
      phoneNumber: "+16125550147",
      email: "abdi@example.com",
      status: "ACTIVE"
    });
  });

  it("requires customer merges to name a different surviving customer", () => {
    expect(() =>
      normalizeCustomerReference({
        customerId: "customer-1",
        organizationId: "org-time-motor-sales",
        customerNumber: "CUST-1",
        displayName: "Duplicate Customer",
        status: "MERGED"
      })
    ).toThrow(/surviving customer/);
    expect(() =>
      normalizeCustomerReference({
        customerId: "customer-1",
        organizationId: "org-time-motor-sales",
        customerNumber: "CUST-1",
        displayName: "Duplicate Customer",
        status: "MERGED",
        mergedIntoCustomerId: "customer-1"
      })
    ).toThrow(/merged into itself/);
  });

  it("normalizes vehicle identity and rejects invalid VINs and years", () => {
    expect(
      normalizeVehicleReference({
        organizationId: "org-time-motor-sales",
        vehicleNumber: " veh-2048 ",
        vin: "1FAHP2E82EG123456",
        stockNumber: "TMS-4587",
        year: 2014,
        make: "Ford",
        model: "Taurus",
        status: "ACTIVE"
      })
    ).toMatchObject({
      vehicleNumber: "VEH-2048",
      vin: "1FAHP2E82EG123456",
      year: 2014,
      status: "ACTIVE"
    });

    expect(() =>
      normalizeVehicleReference({
        organizationId: "org-time-motor-sales",
        vehicleNumber: "VEH-1",
        vin: "SHORT",
        status: "ACTIVE"
      })
    ).toThrow(/17-character VIN/);
    expect(() =>
      normalizeVehicleReference({
        organizationId: "org-time-motor-sales",
        vehicleNumber: "VEH-1",
        year: 1800,
        status: "ACTIVE"
      })
    ).toThrow(/Vehicle year/);
  });

  it("enforces participant reference cardinality and preserves snapshots", () => {
    expect(
      normalizeAppointmentParticipant({
        appointmentId: "appointment-1",
        appointmentOrganizationId: "org-time-motor-sales",
        participantType: "CUSTOMER",
        roleCode: " primary_contact ",
        customerId: "customer-1",
        customerOrganizationId: "org-time-motor-sales",
        displayNameSnapshot: "Abdi Hussein",
        contactSnapshot: { phoneNumber: "+16125550147" },
        isPrimary: true,
        isRequired: true
      })
    ).toMatchObject({
      participantType: "CUSTOMER",
      roleCode: "PRIMARY_CONTACT",
      customerId: "customer-1",
      userId: null,
      isPrimary: true
    });

    expect(() =>
      normalizeAppointmentParticipant({
        appointmentId: "appointment-1",
        appointmentOrganizationId: "org-time-motor-sales",
        participantType: "INTERNAL_USER",
        roleCode: "ATTENDEE",
        userId: "user-1",
        customerId: "customer-1",
        displayNameSnapshot: "Incorrect"
      })
    ).toThrow(/only a user reference/);
    expect(() =>
      normalizeAppointmentParticipant({
        appointmentId: "appointment-1",
        appointmentOrganizationId: "org-time-motor-sales",
        participantType: "EXTERNAL",
        roleCode: "VENDOR",
        userId: "user-1",
        displayNameSnapshot: "Vendor"
      })
    ).toThrow(/cannot reference/);
  });

  it("requires a historical snapshot for every appointment vehicle link", () => {
    expect(
      normalizeAppointmentVehicle({
        appointmentId: "appointment-1",
        appointmentOrganizationId: "org-time-motor-sales",
        vehicleId: "vehicle-1",
        vehicleOrganizationId: "org-time-motor-sales",
        roleCode: "service_vehicle",
        vehicleSnapshot: {
          vehicleNumber: "VEH-2048",
          year: 2014,
          make: "Ford",
          model: "Taurus"
        },
        isPrimary: true
      })
    ).toMatchObject({
      roleCode: "SERVICE_VEHICLE",
      isPrimary: true,
      exclusiveReservationRequired: true
    });

    expect(() =>
      normalizeAppointmentVehicle({
        appointmentId: "appointment-1",
        appointmentOrganizationId: "org-time-motor-sales",
        vehicleId: "vehicle-1",
        vehicleOrganizationId: "org-time-motor-sales",
        roleCode: "SERVICE_VEHICLE",
        vehicleSnapshot: null
      })
    ).toThrow(/snapshot is required/);
  });

  it("keeps location capabilities internally consistent", () => {
    expect(
      normalizeUserLocationAccess({
        userId: "user-1",
        locationId: "location-1",
        canOwnAppointments: true,
        validFrom: new Date("2026-07-05T00:00:00.000Z")
      })
    ).toMatchObject({
      canViewSchedule: true,
      canParticipate: true,
      canOwnAppointments: true
    });

    expect(() =>
      normalizeUserLocationAccess({
        userId: "user-1",
        locationId: "location-1",
        canViewSchedule: false,
        canParticipate: false,
        canOwnAppointments: true,
        validFrom: new Date("2026-07-05T00:00:00.000Z")
      })
    ).toThrow(/schedule-view access/);
  });

  it("masks limited customer and vehicle fields in schedule summaries", () => {
    expect(APPOINTMENT_FIELD_CLASSIFICATION.customerPhoneNumber).toBe("LIMITED");
    expect(APPOINTMENT_FIELD_CLASSIFICATION.participantContactSnapshot).toBe("RESTRICTED");
    expect(
      projectCustomerForAppointment(
        {
          customerNumber: "CUST-1024",
          displayName: "Abdi Hussein",
          phoneNumber: "+16125550147",
          email: "abdi@example.com"
        },
        "SCHEDULE_SUMMARY"
      )
    ).toEqual({
      customerNumber: "CUST-1024",
      displayName: "Abdi H.",
      phoneNumber: null,
      email: null
    });
    expect(
      projectVehicleForAppointment(
        {
          vehicleNumber: "VEH-2048",
          stockNumber: "TMS-4587",
          year: 2014,
          make: "Ford",
          model: "Taurus",
          vin: "1FAHP2E82EG123456",
          licensePlate: "ABC123"
        },
        "SCHEDULE_SUMMARY"
      )
    ).toMatchObject({
      vehicleNumber: "VEH-2048",
      stockNumber: "TMS-4587",
      vin: null,
      licensePlate: null
    });
  });

  it("enforces exclusive and capacity resource definitions", () => {
    expect(
      normalizeSchedulableResourceType({
        organizationId: "org-time-motor-sales",
        code: "service_bay",
        name: "Service Bay",
        kind: "SERVICE_BAY",
        defaultCapacityMode: "EXCLUSIVE",
        defaultCapacity: 1,
        defaultConflictPolicy: "HARD_BLOCK",
        visibilityClass: "OPERATIONAL"
      })
    ).toMatchObject({
      code: "SERVICE_BAY",
      defaultCapacity: 1
    });

    expect(() =>
      normalizeSchedulableResourceType({
        organizationId: "org-time-motor-sales",
        code: "ROOM",
        name: "Room",
        kind: "ROOM",
        defaultCapacityMode: "EXCLUSIVE",
        defaultCapacity: 2,
        defaultConflictPolicy: "HARD_BLOCK",
        visibilityClass: "OPERATIONAL"
      })
    ).toThrow(/capacity 1/);
  });

  it("requires staff and vehicle resources to reference the matching subject type", () => {
    const base = {
      organizationId: "org-time-motor-sales",
      locationId: "loc-time-motor-sales-minneapolis",
      locationOrganizationId: "org-time-motor-sales",
      resourceTypeId: "resource-type-staff",
      resourceTypeOrganizationId: "org-time-motor-sales",
      code: "STAFF-BROCK",
      name: "Brock Inventory",
      status: "ACTIVE",
      capacityMode: "CAPACITY",
      capacity: 1,
      conflictPolicy: "WARNING",
      effectiveFrom: new Date("2026-07-05T00:00:00.000Z")
    };

    expect(
      normalizeSchedulableResource({
        ...base,
        resourceKind: "STAFF",
        userId: "user-brock"
      })
    ).toMatchObject({
      userId: "user-brock",
      vehicleId: null
    });
    expect(() =>
      normalizeSchedulableResource({
        ...base,
        resourceKind: "STAFF"
      })
    ).toThrow(/internal user reference/);
    expect(() =>
      normalizeSchedulableResource({
        ...base,
        resourceKind: "VEHICLE",
        userId: "user-brock"
      })
    ).toThrow(/vehicle reference/);
  });

  it("validates pool membership, working windows, and outages", () => {
    expect(
      normalizeResourcePoolMember({
        poolResourceId: "pool-service-bays",
        memberResourceId: "bay-1",
        poolResourceKind: "POOL",
        capacityContribution: 1,
        validFrom: new Date("2026-07-05T00:00:00.000Z")
      })
    ).toMatchObject({
      capacityContribution: 1
    });
    expect(() =>
      normalizeResourcePoolMember({
        poolResourceId: "pool-1",
        memberResourceId: "pool-1",
        poolResourceKind: "POOL",
        capacityContribution: 1,
        validFrom: new Date("2026-07-05T00:00:00.000Z")
      })
    ).toThrow(/member of itself/);

    expect(
      normalizeResourceOperatingWindow({
        resourceId: "bay-1",
        businessDay: BusinessDay.MONDAY,
        opensAtMinute: 540,
        closesAtMinute: 1080,
        validFrom: new Date("2026-07-05T00:00:00.000Z")
      })
    ).toMatchObject({
      opensAtMinute: 540,
      closesAtMinute: 1080
    });

    expect(() =>
      normalizeResourceUnavailability({
        resourceId: "bay-1",
        type: "CAPACITY_REDUCTION",
        startsAt: new Date("2026-07-06T14:00:00.000Z"),
        endsAt: new Date("2026-07-06T15:00:00.000Z"),
        reason: "Partial maintenance"
      })
    ).toThrow(/positive reduction/);
  });

  it("separates resource requirements from concrete reservations", () => {
    expect(
      normalizeAppointmentResourceRequirement({
        appointmentId: "appointment-1",
        appointmentOrganizationId: "org-time-motor-sales",
        resourceTypeId: "resource-type-service-bay",
        resourceTypeOrganizationId: "org-time-motor-sales",
        requirementCode: " primary_bay ",
        requiredCapacity: 1,
        assignmentTiming: "AT_BOOKING"
      })
    ).toMatchObject({
      requirementCode: "PRIMARY_BAY",
      isMandatory: true,
      hardBlockIfUnfulfilled: true
    });

    expect(() =>
      normalizeAppointmentResourceRequirement({
        appointmentId: "appointment-1",
        appointmentOrganizationId: "org-time-motor-sales",
        resourceTypeId: "resource-type-equipment",
        resourceTypeOrganizationId: "org-time-motor-sales",
        requirementCode: "OPTIONAL_EQUIPMENT",
        requiredCapacity: 1,
        isMandatory: false,
        assignmentTiming: "OPTIONAL",
        hardBlockIfUnfulfilled: true
      })
    ).toThrow(/cannot hard-block/);
  });

  it("rejects reservation over-capacity, invalid ranges, and oversized buffers", () => {
    const reservation = {
      appointmentId: "appointment-1",
      appointmentLocationId: "loc-time-motor-sales-minneapolis",
      requirementId: "requirement-1",
      requirementAppointmentId: "appointment-1",
      resourceId: "bay-1",
      resourceLocationId: "loc-time-motor-sales-minneapolis",
      status: "COMMITTED",
      startsAt: new Date("2026-07-06T14:00:00.000Z"),
      endsAt: new Date("2026-07-06T15:00:00.000Z"),
      capacityUnits: 1,
      resourceCapacity: 1,
      resourceCapacityMode: "EXCLUSIVE"
    };

    expect(normalizeAppointmentResourceReservation(reservation)).toMatchObject({
      capacityUnits: 1,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0
    });
    expect(() =>
      normalizeAppointmentResourceReservation({
        ...reservation,
        capacityUnits: 2
      })
    ).toThrow(/cannot exceed/);
    expect(() =>
      normalizeAppointmentResourceReservation({
        ...reservation,
        bufferAfterMinutes: 1441
      })
    ).toThrow(/cannot exceed one day/);
  });
});
