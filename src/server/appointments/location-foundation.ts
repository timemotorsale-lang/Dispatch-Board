import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";

export const INITIAL_ORGANIZATION = {
  id: "org-time-motor-sales",
  code: "TIME_MOTOR_SALES",
  name: "Time Motor Sales"
} as const;

export const INITIAL_MINNEAPOLIS_LOCATION = {
  id: "loc-time-motor-sales-minneapolis",
  organizationId: INITIAL_ORGANIZATION.id,
  code: "TMS-MSP-01",
  name: "Time Motor Sales — Minneapolis",
  timezone: "America/Chicago",
  addressLine1: "1101 E. Lake Street",
  addressLine2: null,
  city: "Minneapolis",
  region: "MN",
  postalCode: "55407",
  phoneNumber: "+16127243631",
  countryCode: "US",
  schedulingStatus: LocationSchedulingStatus.DRAFT
} as const;

export const INITIAL_MINNEAPOLIS_OPERATING_WINDOWS = [
  BusinessDay.MONDAY,
  BusinessDay.TUESDAY,
  BusinessDay.WEDNESDAY,
  BusinessDay.THURSDAY,
  BusinessDay.FRIDAY
].map((businessDay) => ({
  id: `loc-time-motor-sales-minneapolis-hours-${businessDay.toLowerCase()}-20260705`,
  businessDay,
  opensAtMinute: 9 * 60,
  closesAtMinute: 18 * 60,
  validFrom: new Date("2026-07-05T00:00:00.000Z"),
  validTo: null
}));

export function getInitialOrganization() {
  return { ...INITIAL_ORGANIZATION };
}

export function getInitialMinneapolisLocation() {
  return { ...INITIAL_MINNEAPOLIS_LOCATION };
}

export function getInitialMinneapolisOperatingWindows() {
  return INITIAL_MINNEAPOLIS_OPERATING_WINDOWS.map((window) => ({
    ...window,
    validFrom: new Date(window.validFrom),
    validTo: window.validTo ? new Date(window.validTo) : null
  }));
}
