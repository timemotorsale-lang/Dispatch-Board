-- CreateEnum
CREATE TYPE "AppointmentBookingStatus" AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'SCHEDULED',
    'CANCELLED',
    'COMPLETED'
);

-- CreateEnum
CREATE TYPE "AppointmentConfirmationStatus" AS ENUM (
    'NOT_REQUIRED',
    'NOT_SENT',
    'PENDING',
    'CONFIRMED',
    'DECLINED'
);

-- CreateEnum
CREATE TYPE "AppointmentAttendanceStatus" AS ENUM (
    'EXPECTED',
    'CHECKED_IN',
    'NO_SHOW'
);

-- CreateEnum
CREATE TYPE "AppointmentExecutionStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'WAITING',
    'FINISHED'
);

-- CreateEnum
CREATE TYPE "AppointmentSourceType" AS ENUM (
    'MANUAL',
    'TASK',
    'AUTOMATION',
    'RECURRENCE',
    'COPY',
    'IMPORT'
);

-- AlterTable
ALTER TABLE "Location"
ADD COLUMN "phoneNumber" TEXT;

ALTER TABLE "Location"
ADD CONSTRAINT "Location_phone_number_check"
CHECK (
    "phoneNumber" IS NULL
    OR "phoneNumber" ~ '^\+[1-9][0-9]{7,14}$'
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "appointmentNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "createdByUserId" TEXT,
    "sourceType" "AppointmentSourceType" NOT NULL,
    "sourceReference" TEXT,
    "title" TEXT NOT NULL,
    "schedulingTimezone" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "bookingStatus" "AppointmentBookingStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmationStatus" "AppointmentConfirmationStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "attendanceStatus" "AppointmentAttendanceStatus" NOT NULL DEFAULT 'EXPECTED',
    "executionStatus" "AppointmentExecutionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "purposeSnapshot" JSONB,
    "customerSnapshot" JSONB,
    "vehicleSnapshot" JSONB,
    "sourceSnapshot" JSONB,
    "confirmedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "noShowAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "waitingAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancellationReasonCode" TEXT,
    "cancellationReasonNotes" TEXT,
    "confirmationDeclineReasonCode" TEXT,
    "confirmationDeclineReasonNotes" TEXT,
    "noShowReasonCode" TEXT,
    "noShowReasonNotes" TEXT,
    "waitingReasonCode" TEXT,
    "waitingReasonNotes" TEXT,
    "outcomeCode" TEXT,
    "outcomeNotes" TEXT,
    "followUpDispositionCode" TEXT,
    "followUpNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Appointment_number_not_blank_check"
        CHECK (NULLIF(BTRIM("appointmentNumber"), '') IS NOT NULL),
    CONSTRAINT "Appointment_title_not_blank_check"
        CHECK (NULLIF(BTRIM("title"), '') IS NOT NULL),
    CONSTRAINT "Appointment_timezone_not_blank_check"
        CHECK (NULLIF(BTRIM("schedulingTimezone"), '') IS NOT NULL),
    CONSTRAINT "Appointment_version_positive_check"
        CHECK ("version" >= 1),
    CONSTRAINT "Appointment_time_pair_check"
        CHECK (
            ("startsAt" IS NULL AND "endsAt" IS NULL)
            OR ("startsAt" IS NOT NULL AND "endsAt" IS NOT NULL AND "endsAt" > "startsAt")
        ),
    CONSTRAINT "Appointment_committed_fields_check"
        CHECK (
            "bookingStatus" IN ('DRAFT', 'PENDING_APPROVAL')
            OR (
                "ownerUserId" IS NOT NULL
                AND "startsAt" IS NOT NULL
                AND "endsAt" IS NOT NULL
                AND "purposeSnapshot" IS NOT NULL
            )
        ),
    CONSTRAINT "Appointment_uncommitted_state_check"
        CHECK (
            "bookingStatus" NOT IN ('DRAFT', 'PENDING_APPROVAL')
            OR (
                "attendanceStatus" = 'EXPECTED'
                AND "executionStatus" = 'NOT_STARTED'
            )
        ),
    CONSTRAINT "Appointment_cancelled_documentation_check"
        CHECK (
            "bookingStatus" <> 'CANCELLED'
            OR (
                "cancelledAt" IS NOT NULL
                AND NULLIF(BTRIM("cancellationReasonCode"), '') IS NOT NULL
                AND NULLIF(BTRIM("followUpDispositionCode"), '') IS NOT NULL
            )
        ),
    CONSTRAINT "Appointment_completed_documentation_check"
        CHECK (
            "bookingStatus" <> 'COMPLETED'
            OR (
                "completedAt" IS NOT NULL
                AND "executionStatus" = 'FINISHED'
                AND NULLIF(BTRIM("outcomeCode"), '') IS NOT NULL
                AND NULLIF(BTRIM("followUpDispositionCode"), '') IS NOT NULL
            )
        ),
    CONSTRAINT "Appointment_confirmed_timestamp_check"
        CHECK ("confirmationStatus" <> 'CONFIRMED' OR "confirmedAt" IS NOT NULL),
    CONSTRAINT "Appointment_declined_documentation_check"
        CHECK (
            "confirmationStatus" <> 'DECLINED'
            OR (
                "declinedAt" IS NOT NULL
                AND NULLIF(BTRIM("confirmationDeclineReasonCode"), '') IS NOT NULL
                AND NULLIF(BTRIM("followUpDispositionCode"), '') IS NOT NULL
            )
        ),
    CONSTRAINT "Appointment_checked_in_timestamp_check"
        CHECK ("attendanceStatus" <> 'CHECKED_IN' OR "checkedInAt" IS NOT NULL),
    CONSTRAINT "Appointment_no_show_documentation_check"
        CHECK (
            "attendanceStatus" <> 'NO_SHOW'
            OR (
                "noShowAt" IS NOT NULL
                AND "executionStatus" = 'NOT_STARTED'
                AND NULLIF(BTRIM("noShowReasonCode"), '') IS NOT NULL
                AND NULLIF(BTRIM("followUpDispositionCode"), '') IS NOT NULL
            )
        ),
    CONSTRAINT "Appointment_in_progress_timestamp_check"
        CHECK ("executionStatus" <> 'IN_PROGRESS' OR "startedAt" IS NOT NULL),
    CONSTRAINT "Appointment_waiting_documentation_check"
        CHECK (
            "executionStatus" <> 'WAITING'
            OR (
                "startedAt" IS NOT NULL
                AND "waitingAt" IS NOT NULL
                AND NULLIF(BTRIM("waitingReasonCode"), '') IS NOT NULL
                AND NULLIF(BTRIM("waitingReasonNotes"), '') IS NOT NULL
            )
        ),
    CONSTRAINT "Appointment_finished_timestamp_check"
        CHECK (
            "executionStatus" <> 'FINISHED'
            OR ("startedAt" IS NOT NULL AND "finishedAt" IS NOT NULL)
        )
);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_appointmentNumber_key"
ON "Appointment"("appointmentNumber");

CREATE INDEX "Appointment_locationId_startsAt_endsAt_idx"
ON "Appointment"("locationId", "startsAt", "endsAt");

CREATE INDEX "Appointment_locationId_bookingStatus_startsAt_idx"
ON "Appointment"("locationId", "bookingStatus", "startsAt");

CREATE INDEX "Appointment_ownerUserId_bookingStatus_startsAt_idx"
ON "Appointment"("ownerUserId", "bookingStatus", "startsAt");

CREATE INDEX "Appointment_organizationId_bookingStatus_idx"
ON "Appointment"("organizationId", "bookingStatus");

CREATE INDEX "Appointment_createdByUserId_idx"
ON "Appointment"("createdByUserId");

CREATE INDEX "Appointment_sourceType_sourceReference_idx"
ON "Appointment"("sourceType", "sourceReference");

-- AddForeignKey
ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Upgrade the already-seeded Minneapolis location without activating production scheduling.
UPDATE "Location"
SET
    "addressLine1" = '1101 E. Lake Street',
    "city" = 'Minneapolis',
    "region" = 'MN',
    "postalCode" = '55407',
    "phoneNumber" = '+16127243631',
    "timezone" = 'America/Chicago',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'TMS-MSP-01';

-- Seed the approved Monday-Friday 9:00 AM-6:00 PM operating windows when the location exists.
INSERT INTO "LocationOperatingWindow" (
    "id",
    "locationId",
    "businessDay",
    "opensAtMinute",
    "closesAtMinute",
    "validFrom",
    "validTo",
    "createdAt",
    "updatedAt"
)
SELECT
    'loc-time-motor-sales-minneapolis-hours-' || LOWER(day_value::TEXT) || '-20260705',
    location_record."id",
    day_value,
    540,
    1080,
    DATE '2026-07-05',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Location" AS location_record
CROSS JOIN UNNEST(
    ARRAY[
        'MONDAY'::"BusinessDay",
        'TUESDAY'::"BusinessDay",
        'WEDNESDAY'::"BusinessDay",
        'THURSDAY'::"BusinessDay",
        'FRIDAY'::"BusinessDay"
    ]
) AS operating_days(day_value)
WHERE location_record."code" = 'TMS-MSP-01'
ON CONFLICT DO NOTHING;
