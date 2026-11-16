import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { DEFAULT_COLLECTIONS_SETTINGS } from "@/features/collections/domain/settings";
import { wantedAccountTasks, type AccountTaskFacts } from "@/features/collections/domain/tasks";
import { createManualGpsClient } from "@/features/collections/server/gps-client";
import { buildLetterPdf, fillLetterText } from "@/features/collections/server/letter-pdf";

const fields = {
  dealershipName: "Time Motor Sales", dealershipPhone: "612-555-0100", dealershipAddress: "1 Test Ave", customerName: "Alex Sample", mailingAddress: "2 Fake St",
  dealNumber: "D-1", accountNumber: "FAKE-1001", vehicle: "2015 Test Car", vin: "1FAKEVIN000000000", date: "November 16, 2026", amountDue: "$300.00"
};

describe("repo letters", () => {
  it("prints a DRAFT letter until approved wording exists", async () => {
    const draft = await buildLetterPdf("PRE_REPO_NOTICE", fields, null);
    expect(draft.isDraftWording).toBe(true);
    expect((await PDFDocument.load(draft.bytes)).getPageCount()).toBe(1);
    const approved = await buildLetterPdf("POST_REPO_NOTICE", fields, "Dear {customerName}, your vehicle {vehicle} is at our lot.");
    expect(approved.isDraftWording).toBe(false);
  });
  it("fills fields in approved wording", () => {
    expect(fillLetterText("Dear {customerName}, account {accountNumber}. {unknown}", fields)).toBe("Dear Alex Sample, account FAKE-1001. [unknown]");
  });
});

describe("Advantage GPS (manual in Release 1)", () => {
  it("never claims to have done anything; it gives the portal link and steps", async () => {
    const client = createManualGpsClient("https://portal.example.test");
    const result = await client.disable("SN-1");
    expect(result).toMatchObject({ mode: "MANUAL", done: false, portalUrl: "https://portal.example.test" });
    expect(result.instructions).toMatch(/SN-1.*Starter Disable.*Done in portal/);
    expect((await client.status("SN-1")).known).toBe(false);
  });
});

describe("re-enable task after a redemption", () => {
  const base: AccountTaskFacts = {
    daysPastDue: 70, inactive: false, activeFlags: [], bankruptcyFlaggedAt: null, lastBrokenAt: null, arrangementAfterBroken: false, lastNotFoundAt: null,
    starter: { action: "DISABLE", at: new Date("2026-11-01T12:00:00Z") }, lastArrangementAt: null, repo: null, insurance: null,
    belowThresholdSince: { disable: null, twoWeek: null, thirtyDay: null, repo: null }
  };
  it("asks to re-enable when the customer redeemed the car after the disable", () => {
    const reasons = (f: Partial<AccountTaskFacts>) => wantedAccountTasks({ ...base, ...f }, DEFAULT_COLLECTIONS_SETTINGS).map(w => w.reason);
    expect(reasons({})).not.toContain("RE_ENABLE_STARTER");
    expect(reasons({ redeemedAt: new Date("2026-11-10T12:00:00Z") })).toContain("RE_ENABLE_STARTER");
  });
});
