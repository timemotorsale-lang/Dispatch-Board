import {
  BusinessDay,
  LocationClosureType,
  LocationSchedulingStatus
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  getInitialMinneapolisLocation,
  getInitialMinneapolisOperatingWindows,
  getInitialOrganization,
  INITIAL_MINNEAPOLIS_LOCATION,
  INITIAL_ORGANIZATION
} from "@/server/appointments/location-foundation";
import {
  normalizeLocationClosure,
  normalizeLocationConfiguration,
  normalizeLocationOperatingWindow
} from "@/server/validation/appointment-location";

describe("appointment location foundation", () => {
  it("exposes the approved Minneapolis location while keeping production scheduling in draft", () => {
    expect(getInitialOrganization()).toEqual({
      id: "org-time-motor-sales",
      code: "TIME_MOTOR_SALES",
      name: "Time Motor Sales"
    });
    expect(getInitialMinneapolisLocation()).toEqual({
      id: "loc-time-motor-sales-minneapolis",
      organizationId: "org-time-motor-sales",
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
    });
    expect(getInitialMinneapolisOperatingWindows()).toEqual(
      [
        BusinessDay.MONDAY,
        BusinessDay.TUESDAY,
        BusinessDay.WEDNESDAY,
        BusinessDay.THURSDAY,
        BusinessDay.FRIDAY
      ].map((businessDay) => ({
        id: `loc-time-motor-sales-minneapolis-hours-${businessDay.toLowerCase()}-20260705`,
        businessDay,
        opensAtMinute: 540,
        closesAtMinute: 1080,
        validFrom: new Date("2026-07-05T00:00:00.000Z"),
        validTo: null
      }))
    );
    expect(getInitialOrganization()).not.toBe(INITIAL_ORGANIZATION);
    expect(getInitialMinneapolisLocation()).not.toBe(INITIAL_MINNEAPOLIS_LOCATION);
  });

  it("normalizes a valid draft location", () => {
    expect(
      normalizeLocationConfiguration({
        organizationId: " org-time-motor-sales ",
        code: " tms-msp-01 ",
        name: " Time Motor Sales — Minneapolis ",
        timezone: " America/Chicago ",
        addressLine1: " ",
        city: " Minneapolis ",
        region: " mn ",
        postalCode: null,
        countryCode: " us ",
        schedulingStatus: LocationSchedulingStatus.DRAFT
      })
    ).toEqual({
      organizationId: "org-time-motor-sales",
      code: "TMS-MSP-01",
      name: "Time Motor Sales — Minneapolis",
      timezone: "America/Chicago",
      addressLine1: null,
      addressLine2: null,
      city: "Minneapolis",
      region: "MN",
      postalCode: null,
      phoneNumber: null,
      countryCode: "US",
      schedulingStatus: LocationSchedulingStatus.DRAFT
    });
  });

  it("normalizes common US telephone formatting to E.164", () => {
    expect(
      normalizeLocationConfiguration({
        organizationId: "org-time-motor-sales",
        code: "TMS-MSP-01",
        name: "Time Motor Sales — Minneapolis",
        timezone: "America/Chicago",
        addressLine1: "1101 E. Lake Street",
        city: "Minneapolis",
        region: "MN",
        postalCode: "55407",
        phoneNumber: "612 724 3631",
        countryCode: "US",
        schedulingStatus: LocationSchedulingStatus.DRAFT
      }).phoneNumber
    ).toBe("+16127243631");

    expect(() =>
      normalizeLocationConfiguration({
        organizationId: "org-time-motor-sales",
        code: "TMS-MSP-01",
        name: "Time Motor Sales — Minneapolis",
        timezone: "America/Chicago",
        city: "Minneapolis",
        region: "MN",
        phoneNumber: "123",
        countryCode: "US",
        schedulingStatus: LocationSchedulingStatus.DRAFT
      })
    ).toThrow(/valid international telephone/);
  });

  it("requires an address and postal code before scheduling can be active", () => {
    expect(() =>
      normalizeLocationConfiguration({
        organizationId: "org-time-motor-sales",
        code: "TMS-MSP-01",
        name: "Time Motor Sales — Minneapolis",
        timezone: "America/Chicago",
        city: "Minneapolis",
        region: "MN",
        countryCode: "US",
        schedulingStatus: LocationSchedulingStatus.ACTIVE
      })
    ).toThrow(/requires a street address and postal code/);
  });

  it("rejects invalid location codes, timezones, country codes, and statuses", () => {
    const validInput = {
      organizationId: "org-time-motor-sales",
      code: "TMS-MSP-01",
      name: "Time Motor Sales — Minneapolis",
      timezone: "America/Chicago",
      city: "Minneapolis",
      region: "MN",
      countryCode: "US",
      schedulingStatus: LocationSchedulingStatus.DRAFT
    };

    expect(() => normalizeLocationConfiguration({ ...validInput, code: "MSP location" })).toThrow(
      /Location code/
    );
    expect(() =>
      normalizeLocationConfiguration({ ...validInput, timezone: "Mars/Olympus" })
    ).toThrow(/timezone must be valid/);
    expect(() => normalizeLocationConfiguration({ ...validInput, countryCode: "USA" })).toThrow(
      /two-letter/
    );
    expect(() =>
      normalizeLocationConfiguration({ ...validInput, schedulingStatus: "OPEN" })
    ).toThrow(/scheduling status is invalid/);
  });

  it("normalizes a valid effective operating window", () => {
    const validFrom = new Date("2026-07-01T00:00:00.000Z");
    const validTo = new Date("2026-12-31T00:00:00.000Z");

    expect(
      normalizeLocationOperatingWindow({
        locationId: " loc-time-motor-sales-minneapolis ",
        businessDay: BusinessDay.MONDAY,
        opensAtMinute: 9 * 60,
        closesAtMinute: 18 * 60,
        validFrom,
        validTo
      })
    ).toEqual({
      locationId: "loc-time-motor-sales-minneapolis",
      businessDay: BusinessDay.MONDAY,
      opensAtMinute: 540,
      closesAtMinute: 1080,
      validFrom,
      validTo
    });
  });

  it("rejects invalid operating-window ranges and validity periods", () => {
    const baseInput = {
      locationId: "loc-time-motor-sales-minneapolis",
      businessDay: BusinessDay.MONDAY,
      opensAtMinute: 540,
      closesAtMinute: 1080,
      validFrom: new Date("2026-07-01T00:00:00.000Z")
    };

    expect(() =>
      normalizeLocationOperatingWindow({ ...baseInput, businessDay: "FUNDAY" })
    ).toThrow(/invalid business day/);
    expect(() =>
      normalizeLocationOperatingWindow({ ...baseInput, closesAtMinute: 500 })
    ).toThrow(/open before it closes/);
    expect(() =>
      normalizeLocationOperatingWindow({
        ...baseInput,
        validTo: new Date("2026-06-30T00:00:00.000Z")
      })
    ).toThrow(/cannot be before/);
  });

  it("normalizes closures and requires a valid range and documented reason", () => {
    const normalized = normalizeLocationClosure({
      locationId: "loc-time-motor-sales-minneapolis",
      type: LocationClosureType.HOLIDAY,
      name: "Independence Day",
      startsAt: new Date("2026-07-04T05:00:00.000Z"),
      endsAt: new Date("2026-07-05T05:00:00.000Z"),
      reason: "Location holiday",
      createdByUserId: " user-manager "
    });

    expect(normalized).toMatchObject({
      type: LocationClosureType.HOLIDAY,
      reason: "Location holiday",
      createdByUserId: "user-manager"
    });

    expect(() => normalizeLocationClosure({ ...normalized, reason: " " })).toThrow(
      /Closure reason is required/
    );
    expect(() =>
      normalizeLocationClosure({
        ...normalized,
        endsAt: normalized.startsAt
      })
    ).toThrow(/must end after/);
  });
});
