import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppointmentAdminSettingsPanel } from "@/features/settings/appointment-admin-settings-panel";
import type { AppointmentAdminSettings } from "@/server/services/appointment-admin-settings";

function settingsFixture(): AppointmentAdminSettings {
  return {
    organization: {
      id: "org-time-motor-sales",
      code: "TIME",
      name: "Time Motor Sales"
    },
    location: {
      id: "loc-time-motor-sales-minneapolis",
      organizationId: "org-time-motor-sales",
      code: "TMS-MSP-01",
      name: "Time Motor Sales — Minneapolis",
      timezone: "America/Chicago",
      addressLine1: "1101 E. Lake Street",
      addressLine2: "",
      city: "Minneapolis",
      region: "MN",
      postalCode: "55407",
      phoneNumber: "612 724 3631",
      countryCode: "US",
      schedulingStatus: "ACTIVE",
      displayAddress: "1101 E. Lake Street, Minneapolis MN 55407",
      displayPhone: "(612) 724-3631",
      businessHoursLabel: "9:00 AM - 6:00 PM"
    },
    operatingWindows: [
      {
        businessDay: "MONDAY",
        isOpen: true,
        opensAt: "09:00",
        closesAt: "18:00"
      }
    ],
    closures: [],
    resourceTypes: [
      {
        id: "rt-staff",
        code: "STAFF",
        name: "Staff member",
        kind: "STAFF",
        defaultCapacityMode: "EXCLUSIVE",
        defaultCapacity: 1,
        defaultConflictPolicy: "HARD_BLOCK",
        isActive: true
      }
    ],
    resources: [],
    catalogs: {
      purposes: [],
      outcomeCodes: [],
      followUpDispositionCodes: [],
      reasonCodes: []
    },
    automationRules: [],
    specialHoursCalendar: {
      horizonStartIso: "2026-07-07",
      horizonEndIso: "2026-07-20",
      days: [
        {
          dateIso: "2026-07-07",
          businessDay: "TUESDAY",
          status: "OPEN",
          label: "Open",
          opensAt: "09:00",
          closesAt: "18:00",
          closureIds: [],
          closureNames: [],
          resourceImpactCount: 0,
          resourceImpactNames: [],
          warnings: []
        }
      ],
      summary: {
        openDayCount: 1,
        closedDayCount: 0,
        resourceImpactDayCount: 0,
        upcomingClosureCount: 0,
        upcomingResourceImpactCount: 0,
        nextClosureName: null,
        nextClosureStartsAtIso: null
      }
    }
  };
}

describe("appointment admin settings panel", () => {
  it("renders configuration portability import/export foundation", () => {
    const markup = renderToStaticMarkup(
      <AppointmentAdminSettingsPanel initialSettings={settingsFixture()} />
    );

    expect(markup).toContain("Configuration portability");
    expect(markup).toContain("Special-hours calendar");
    expect(markup).toContain("Closure and resource-impact preview");
    expect(markup).toContain("Export and import preview foundation");
    expect(markup).toContain("Generate export package");
    expect(markup).toContain("Preview import validation");
    expect(markup).toContain("Import apply");
  });
});
