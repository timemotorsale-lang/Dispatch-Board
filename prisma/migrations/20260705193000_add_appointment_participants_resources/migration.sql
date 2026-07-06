-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MERGED', 'RETIRED');

CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SOLD', 'OUT_OF_SERVICE', 'RETIRED');

CREATE TYPE "AppointmentParticipantType" AS ENUM ('INTERNAL_USER', 'CUSTOMER', 'EXTERNAL');

CREATE TYPE "SchedulableResourceKind" AS ENUM (
    'STAFF',
    'VEHICLE',
    'SERVICE_BAY',
    'ROOM',
    'EQUIPMENT',
    'POOL',
    'LOCATION',
    'OTHER'
);

CREATE TYPE "ResourceCapacityMode" AS ENUM ('EXCLUSIVE', 'CAPACITY');

CREATE TYPE "ResourceConflictPolicy" AS ENUM ('HARD_BLOCK', 'WARNING', 'INFORMATION');

CREATE TYPE "ResourceVisibilityClass" AS ENUM ('OPERATIONAL', 'LIMITED', 'RESTRICTED');

CREATE TYPE "SchedulableResourceStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'OUT_OF_SERVICE',
    'RETIRED'
);

CREATE TYPE "ResourceRequirementAssignmentTiming" AS ENUM (
    'AT_BOOKING',
    'BEFORE_START',
    'OPTIONAL'
);

CREATE TYPE "ResourceReservationStatus" AS ENUM (
    'PROPOSED',
    'HELD',
    'COMMITTED',
    'RELEASED',
    'CANCELLED'
);

CREATE TYPE "ResourceUnavailabilityType" AS ENUM (
    'ABSENCE',
    'OUTAGE',
    'MAINTENANCE',
    'CAPACITY_REDUCTION',
    'OTHER'
);

-- CreateTable
CREATE TABLE "UserLocationAccess" (
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "canViewSchedule" BOOLEAN NOT NULL DEFAULT true,
    "canParticipate" BOOLEAN NOT NULL DEFAULT true,
    "canOwnAppointments" BOOLEAN NOT NULL DEFAULT false,
    "canManageAppointments" BOOLEAN NOT NULL DEFAULT false,
    "canViewLimitedData" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLocationAccess_pkey" PRIMARY KEY ("userId", "locationId"),
    CONSTRAINT "UserLocationAccess_validity_check"
        CHECK ("validTo" IS NULL OR "validTo" >= "validFrom"),
    CONSTRAINT "UserLocationAccess_capability_hierarchy_check"
        CHECK (
            (
                NOT "canParticipate"
                AND NOT "canOwnAppointments"
                AND NOT "canManageAppointments"
                AND NOT "canViewLimitedData"
            )
            OR "canViewSchedule"
        ),
    CONSTRAINT "UserLocationAccess_owner_participant_check"
        CHECK (NOT "canOwnAppointments" OR "canParticipate")
);

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "externalReference" TEXT,
    "duplicateKey" TEXT,
    "mergedIntoCustomerId" TEXT,
    "retentionUntil" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Customer_number_not_blank_check"
        CHECK (NULLIF(BTRIM("customerNumber"), '') IS NOT NULL),
    CONSTRAINT "Customer_name_not_blank_check"
        CHECK (NULLIF(BTRIM("displayName"), '') IS NOT NULL),
    CONSTRAINT "Customer_phone_format_check"
        CHECK ("phoneNumber" IS NULL OR "phoneNumber" ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT "Customer_email_format_check"
        CHECK ("email" IS NULL OR "email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
    CONSTRAINT "Customer_merge_target_check"
        CHECK (
            ("status" = 'MERGED' AND "mergedIntoCustomerId" IS NOT NULL)
            OR ("status" <> 'MERGED' AND "mergedIntoCustomerId" IS NULL)
        ),
    CONSTRAINT "Customer_no_self_merge_check"
        CHECK ("mergedIntoCustomerId" IS NULL OR "mergedIntoCustomerId" <> "id")
);

CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vin" TEXT,
    "stockNumber" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "licensePlate" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "externalReference" TEXT,
    "duplicateKey" TEXT,
    "retentionUntil" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Vehicle_number_not_blank_check"
        CHECK (NULLIF(BTRIM("vehicleNumber"), '') IS NOT NULL),
    CONSTRAINT "Vehicle_vin_format_check"
        CHECK ("vin" IS NULL OR "vin" ~ '^[A-HJ-NPR-Z0-9]{17}$'),
    CONSTRAINT "Vehicle_year_range_check"
        CHECK ("year" IS NULL OR ("year" >= 1886 AND "year" <= 2100))
);

CREATE TABLE "AppointmentParticipant" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "participantType" "AppointmentParticipantType" NOT NULL,
    "roleCode" TEXT NOT NULL,
    "userId" TEXT,
    "customerId" TEXT,
    "displayNameSnapshot" TEXT NOT NULL,
    "contactSnapshot" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "attendanceRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentParticipant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AppointmentParticipant_role_not_blank_check"
        CHECK (NULLIF(BTRIM("roleCode"), '') IS NOT NULL),
    CONSTRAINT "AppointmentParticipant_name_not_blank_check"
        CHECK (NULLIF(BTRIM("displayNameSnapshot"), '') IS NOT NULL),
    CONSTRAINT "AppointmentParticipant_reference_check"
        CHECK (
            (
                "participantType" = 'INTERNAL_USER'
                AND "userId" IS NOT NULL
                AND "customerId" IS NULL
            )
            OR (
                "participantType" = 'CUSTOMER'
                AND "customerId" IS NOT NULL
                AND "userId" IS NULL
            )
            OR (
                "participantType" = 'EXTERNAL'
                AND "userId" IS NULL
                AND "customerId" IS NULL
            )
        )
);

CREATE TABLE "AppointmentVehicle" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "vehicleSnapshot" JSONB NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "exclusiveReservationRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentVehicle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AppointmentVehicle_role_not_blank_check"
        CHECK (NULLIF(BTRIM("roleCode"), '') IS NOT NULL)
);

CREATE TABLE "SchedulableResourceType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SchedulableResourceKind" NOT NULL,
    "defaultCapacityMode" "ResourceCapacityMode" NOT NULL,
    "defaultCapacity" INTEGER NOT NULL DEFAULT 1,
    "defaultConflictPolicy" "ResourceConflictPolicy" NOT NULL,
    "visibilityClass" "ResourceVisibilityClass" NOT NULL DEFAULT 'OPERATIONAL',
    "attributeSchema" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulableResourceType_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResourceType_code_not_blank_check"
        CHECK (NULLIF(BTRIM("code"), '') IS NOT NULL),
    CONSTRAINT "ResourceType_name_not_blank_check"
        CHECK (NULLIF(BTRIM("name"), '') IS NOT NULL),
    CONSTRAINT "ResourceType_capacity_positive_check"
        CHECK ("defaultCapacity" >= 1),
    CONSTRAINT "ResourceType_exclusive_capacity_check"
        CHECK ("defaultCapacityMode" <> 'EXCLUSIVE' OR "defaultCapacity" = 1)
);

CREATE TABLE "SchedulableResource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "resourceTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SchedulableResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "capacityMode" "ResourceCapacityMode" NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "conflictPolicy" "ResourceConflictPolicy" NOT NULL,
    "userId" TEXT,
    "vehicleId" TEXT,
    "attributes" JSONB,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulableResource_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Resource_code_not_blank_check"
        CHECK (NULLIF(BTRIM("code"), '') IS NOT NULL),
    CONSTRAINT "Resource_name_not_blank_check"
        CHECK (NULLIF(BTRIM("name"), '') IS NOT NULL),
    CONSTRAINT "Resource_capacity_positive_check"
        CHECK ("capacity" >= 1),
    CONSTRAINT "Resource_exclusive_capacity_check"
        CHECK ("capacityMode" <> 'EXCLUSIVE' OR "capacity" = 1),
    CONSTRAINT "Resource_effective_range_check"
        CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom"),
    CONSTRAINT "Resource_single_subject_check"
        CHECK (NOT ("userId" IS NOT NULL AND "vehicleId" IS NOT NULL))
);

CREATE TABLE "ResourcePoolMember" (
    "poolResourceId" TEXT NOT NULL,
    "memberResourceId" TEXT NOT NULL,
    "capacityContribution" INTEGER NOT NULL DEFAULT 1,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourcePoolMember_pkey"
        PRIMARY KEY ("poolResourceId", "memberResourceId", "validFrom"),
    CONSTRAINT "ResourcePoolMember_not_self_check"
        CHECK ("poolResourceId" <> "memberResourceId"),
    CONSTRAINT "ResourcePoolMember_capacity_check"
        CHECK ("capacityContribution" >= 1),
    CONSTRAINT "ResourcePoolMember_validity_check"
        CHECK ("validTo" IS NULL OR "validTo" >= "validFrom")
);

CREATE TABLE "ResourceOperatingWindow" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "businessDay" "BusinessDay" NOT NULL,
    "opensAtMinute" INTEGER NOT NULL,
    "closesAtMinute" INTEGER NOT NULL,
    "capacityOverride" INTEGER,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceOperatingWindow_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResourceOperatingWindow_minute_range_check"
        CHECK (
            "opensAtMinute" >= 0
            AND "opensAtMinute" < "closesAtMinute"
            AND "closesAtMinute" <= 1440
        ),
    CONSTRAINT "ResourceOperatingWindow_capacity_check"
        CHECK ("capacityOverride" IS NULL OR "capacityOverride" >= 1),
    CONSTRAINT "ResourceOperatingWindow_validity_check"
        CHECK ("validTo" IS NULL OR "validTo" >= "validFrom")
);

CREATE TABLE "ResourceUnavailability" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "type" "ResourceUnavailabilityType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacityReduction" INTEGER,
    "reason" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceUnavailability_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResourceUnavailability_time_range_check"
        CHECK ("endsAt" > "startsAt"),
    CONSTRAINT "ResourceUnavailability_reason_check"
        CHECK (NULLIF(BTRIM("reason"), '') IS NOT NULL),
    CONSTRAINT "ResourceUnavailability_capacity_check"
        CHECK (
            (
                "type" = 'CAPACITY_REDUCTION'
                AND "capacityReduction" IS NOT NULL
                AND "capacityReduction" >= 1
            )
            OR (
                "type" <> 'CAPACITY_REDUCTION'
                AND "capacityReduction" IS NULL
            )
        )
);

CREATE TABLE "AppointmentResourceRequirement" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "resourceTypeId" TEXT NOT NULL,
    "requirementCode" TEXT NOT NULL,
    "requiredCapacity" INTEGER NOT NULL DEFAULT 1,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "assignmentTiming" "ResourceRequirementAssignmentTiming" NOT NULL DEFAULT 'AT_BOOKING',
    "hardBlockIfUnfulfilled" BOOLEAN NOT NULL DEFAULT true,
    "characteristics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentResourceRequirement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResourceRequirement_code_not_blank_check"
        CHECK (NULLIF(BTRIM("requirementCode"), '') IS NOT NULL),
    CONSTRAINT "ResourceRequirement_capacity_check"
        CHECK ("requiredCapacity" >= 1),
    CONSTRAINT "ResourceRequirement_optional_block_check"
        CHECK ("isMandatory" OR NOT "hardBlockIfUnfulfilled"),
    CONSTRAINT "ResourceRequirement_assignment_check"
        CHECK (
            "assignmentTiming" <> 'OPTIONAL'
            OR (NOT "isMandatory" AND NOT "hardBlockIfUnfulfilled")
        )
);

CREATE TABLE "AppointmentResourceReservation" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "requirementId" TEXT,
    "resourceId" TEXT NOT NULL,
    "status" "ResourceReservationStatus" NOT NULL DEFAULT 'PROPOSED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacityUnits" INTEGER NOT NULL DEFAULT 1,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentResourceReservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResourceReservation_time_range_check"
        CHECK ("endsAt" > "startsAt"),
    CONSTRAINT "ResourceReservation_capacity_check"
        CHECK ("capacityUnits" >= 1),
    CONSTRAINT "ResourceReservation_buffer_check"
        CHECK (
            "bufferBeforeMinutes" BETWEEN 0 AND 1440
            AND "bufferAfterMinutes" BETWEEN 0 AND 1440
        )
);

-- CreateIndex
CREATE INDEX "UserLocationAccess_location_capability_idx"
ON "UserLocationAccess"("locationId", "canOwnAppointments", "canManageAppointments");

CREATE INDEX "UserLocationAccess_location_validity_idx"
ON "UserLocationAccess"("locationId", "validFrom", "validTo");

CREATE UNIQUE INDEX "Location_id_organization_key"
ON "Location"("id", "organizationId");

CREATE UNIQUE INDEX "Customer_organization_number_key"
ON "Customer"("organizationId", "customerNumber");

CREATE UNIQUE INDEX "Customer_organization_external_key"
ON "Customer"("organizationId", "externalReference");

CREATE UNIQUE INDEX "Customer_id_organization_key"
ON "Customer"("id", "organizationId");

CREATE INDEX "Customer_organization_name_idx"
ON "Customer"("organizationId", "displayName");

CREATE INDEX "Customer_organization_duplicate_idx"
ON "Customer"("organizationId", "duplicateKey");

CREATE INDEX "Customer_merged_target_idx"
ON "Customer"("mergedIntoCustomerId");

CREATE UNIQUE INDEX "Vehicle_organization_number_key"
ON "Vehicle"("organizationId", "vehicleNumber");

CREATE UNIQUE INDEX "Vehicle_organization_vin_key"
ON "Vehicle"("organizationId", "vin");

CREATE UNIQUE INDEX "Vehicle_organization_external_key"
ON "Vehicle"("organizationId", "externalReference");

CREATE UNIQUE INDEX "Vehicle_id_organization_key"
ON "Vehicle"("id", "organizationId");

CREATE INDEX "Vehicle_organization_stock_idx"
ON "Vehicle"("organizationId", "stockNumber");

CREATE INDEX "Vehicle_organization_description_idx"
ON "Vehicle"("organizationId", "year", "make", "model");

CREATE INDEX "Vehicle_organization_duplicate_idx"
ON "Vehicle"("organizationId", "duplicateKey");

CREATE UNIQUE INDEX "AppointmentParticipant_user_role_key"
ON "AppointmentParticipant"("appointmentId", "userId", "roleCode");

CREATE UNIQUE INDEX "AppointmentParticipant_customer_role_key"
ON "AppointmentParticipant"("appointmentId", "customerId", "roleCode");

CREATE UNIQUE INDEX "AppointmentParticipant_primary_type_key"
ON "AppointmentParticipant"("appointmentId", "participantType")
WHERE "isPrimary";

CREATE INDEX "AppointmentParticipant_type_idx"
ON "AppointmentParticipant"("appointmentId", "participantType");

CREATE INDEX "AppointmentParticipant_user_idx"
ON "AppointmentParticipant"("userId");

CREATE INDEX "AppointmentParticipant_customer_idx"
ON "AppointmentParticipant"("customerId");

CREATE UNIQUE INDEX "AppointmentVehicle_appointment_vehicle_role_key"
ON "AppointmentVehicle"("appointmentId", "vehicleId", "roleCode");

CREATE UNIQUE INDEX "AppointmentVehicle_primary_key"
ON "AppointmentVehicle"("appointmentId")
WHERE "isPrimary";

CREATE INDEX "AppointmentVehicle_appointment_primary_idx"
ON "AppointmentVehicle"("appointmentId", "isPrimary");

CREATE INDEX "AppointmentVehicle_vehicle_idx"
ON "AppointmentVehicle"("vehicleId");

CREATE UNIQUE INDEX "ResourceType_organization_code_key"
ON "SchedulableResourceType"("organizationId", "code");

CREATE UNIQUE INDEX "ResourceType_id_organization_key"
ON "SchedulableResourceType"("id", "organizationId");

CREATE INDEX "ResourceType_organization_kind_active_idx"
ON "SchedulableResourceType"("organizationId", "kind", "isActive");

CREATE UNIQUE INDEX "Resource_location_code_key"
ON "SchedulableResource"("locationId", "code");

CREATE UNIQUE INDEX "Resource_location_user_key"
ON "SchedulableResource"("locationId", "userId");

CREATE UNIQUE INDEX "Resource_location_vehicle_key"
ON "SchedulableResource"("locationId", "vehicleId");

CREATE INDEX "Resource_organization_location_status_idx"
ON "SchedulableResource"("organizationId", "locationId", "status");

CREATE INDEX "Resource_type_status_idx"
ON "SchedulableResource"("resourceTypeId", "status");

CREATE INDEX "ResourcePoolMember_member_validity_idx"
ON "ResourcePoolMember"("memberResourceId", "validFrom", "validTo");

CREATE UNIQUE INDEX "ResourceOperatingWindow_identity_key"
ON "ResourceOperatingWindow"("resourceId", "businessDay", "opensAtMinute", "validFrom");

CREATE INDEX "ResourceOperatingWindow_validity_idx"
ON "ResourceOperatingWindow"("resourceId", "businessDay", "validFrom", "validTo");

CREATE INDEX "ResourceUnavailability_time_idx"
ON "ResourceUnavailability"("resourceId", "startsAt", "endsAt");

CREATE INDEX "ResourceUnavailability_creator_idx"
ON "ResourceUnavailability"("createdByUserId");

CREATE UNIQUE INDEX "ResourceRequirement_appointment_code_key"
ON "AppointmentResourceRequirement"("appointmentId", "requirementCode");

CREATE INDEX "ResourceRequirement_type_idx"
ON "AppointmentResourceRequirement"("resourceTypeId");

CREATE INDEX "ResourceReservation_appointment_status_idx"
ON "AppointmentResourceReservation"("appointmentId", "status");

CREATE INDEX "ResourceReservation_requirement_idx"
ON "AppointmentResourceReservation"("requirementId");

CREATE INDEX "ResourceReservation_resource_time_idx"
ON "AppointmentResourceReservation"("resourceId", "status", "startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "UserLocationAccess"
ADD CONSTRAINT "UserLocationAccess_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLocationAccess"
ADD CONSTRAINT "UserLocationAccess_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_mergedIntoCustomerId_fkey"
FOREIGN KEY ("mergedIntoCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_merge_same_organization_fkey"
FOREIGN KEY ("mergedIntoCustomerId", "organizationId")
REFERENCES "Customer"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppointmentParticipant"
ADD CONSTRAINT "AppointmentParticipant_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentParticipant"
ADD CONSTRAINT "AppointmentParticipant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppointmentParticipant"
ADD CONSTRAINT "AppointmentParticipant_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppointmentVehicle"
ADD CONSTRAINT "AppointmentVehicle_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentVehicle"
ADD CONSTRAINT "AppointmentVehicle_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulableResourceType"
ADD CONSTRAINT "SchedulableResourceType_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulableResource"
ADD CONSTRAINT "SchedulableResource_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulableResource"
ADD CONSTRAINT "SchedulableResource_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulableResource"
ADD CONSTRAINT "SchedulableResource_resourceTypeId_fkey"
FOREIGN KEY ("resourceTypeId") REFERENCES "SchedulableResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulableResource"
ADD CONSTRAINT "SchedulableResource_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulableResource"
ADD CONSTRAINT "SchedulableResource_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulableResource"
ADD CONSTRAINT "Resource_location_organization_fkey"
FOREIGN KEY ("locationId", "organizationId")
REFERENCES "Location"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulableResource"
ADD CONSTRAINT "Resource_type_organization_fkey"
FOREIGN KEY ("resourceTypeId", "organizationId")
REFERENCES "SchedulableResourceType"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulableResource"
ADD CONSTRAINT "Resource_vehicle_organization_fkey"
FOREIGN KEY ("vehicleId", "organizationId")
REFERENCES "Vehicle"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResourcePoolMember"
ADD CONSTRAINT "ResourcePoolMember_poolResourceId_fkey"
FOREIGN KEY ("poolResourceId") REFERENCES "SchedulableResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourcePoolMember"
ADD CONSTRAINT "ResourcePoolMember_memberResourceId_fkey"
FOREIGN KEY ("memberResourceId") REFERENCES "SchedulableResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceOperatingWindow"
ADD CONSTRAINT "ResourceOperatingWindow_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "SchedulableResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceUnavailability"
ADD CONSTRAINT "ResourceUnavailability_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "SchedulableResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceUnavailability"
ADD CONSTRAINT "ResourceUnavailability_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AppointmentResourceRequirement"
ADD CONSTRAINT "AppointmentResourceRequirement_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentResourceRequirement"
ADD CONSTRAINT "AppointmentResourceRequirement_resourceTypeId_fkey"
FOREIGN KEY ("resourceTypeId") REFERENCES "SchedulableResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppointmentResourceReservation"
ADD CONSTRAINT "AppointmentResourceReservation_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentResourceReservation"
ADD CONSTRAINT "AppointmentResourceReservation_requirementId_fkey"
FOREIGN KEY ("requirementId") REFERENCES "AppointmentResourceRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AppointmentResourceReservation"
ADD CONSTRAINT "AppointmentResourceReservation_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "SchedulableResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
