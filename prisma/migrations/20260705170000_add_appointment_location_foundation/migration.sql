-- CreateEnum
CREATE TYPE "LocationSchedulingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "LocationClosureType" AS ENUM ('HOLIDAY', 'PLANNED', 'EMERGENCY', 'OTHER');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "schedulingStatus" "LocationSchedulingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Location_country_code_check" CHECK (char_length("countryCode") = 2),
    CONSTRAINT "Location_timezone_not_blank_check" CHECK (NULLIF(BTRIM("timezone"), '') IS NOT NULL)
);

-- CreateTable
CREATE TABLE "LocationOperatingWindow" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "businessDay" "BusinessDay" NOT NULL,
    "opensAtMinute" INTEGER NOT NULL,
    "closesAtMinute" INTEGER NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationOperatingWindow_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LocationOperatingWindow_minute_range_check" CHECK (
        "opensAtMinute" >= 0
        AND "opensAtMinute" < "closesAtMinute"
        AND "closesAtMinute" <= 1440
    ),
    CONSTRAINT "LocationOperatingWindow_validity_check" CHECK (
        "validTo" IS NULL OR "validTo" >= "validFrom"
    )
);

-- CreateTable
CREATE TABLE "LocationClosure" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" "LocationClosureType" NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationClosure_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LocationClosure_time_range_check" CHECK ("endsAt" > "startsAt"),
    CONSTRAINT "LocationClosure_reason_not_blank_check" CHECK (NULLIF(BTRIM("reason"), '') IS NOT NULL)
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Location_organizationId_code_key" ON "Location"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Location_organizationId_schedulingStatus_idx" ON "Location"("organizationId", "schedulingStatus");

-- CreateIndex
CREATE INDEX "Location_city_region_idx" ON "Location"("city", "region");

-- CreateIndex
CREATE UNIQUE INDEX "LocationOperatingWindow_locationId_businessDay_opensAtMinute_validFrom_key"
ON "LocationOperatingWindow"("locationId", "businessDay", "opensAtMinute", "validFrom");

-- CreateIndex
CREATE INDEX "LocationOperatingWindow_locationId_businessDay_validFrom_validTo_idx"
ON "LocationOperatingWindow"("locationId", "businessDay", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "LocationClosure_locationId_startsAt_endsAt_idx"
ON "LocationClosure"("locationId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "LocationClosure_createdByUserId_idx" ON "LocationClosure"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Location"
ADD CONSTRAINT "Location_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationOperatingWindow"
ADD CONSTRAINT "LocationOperatingWindow_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationClosure"
ADD CONSTRAINT "LocationClosure_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationClosure"
ADD CONSTRAINT "LocationClosure_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
