import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TestDriveExecutionDesk } from "@/features/crm-next/crm-next-deal-start-tool";

const draft = vi.hoisted(() => ({ values: {} as Record<string, unknown> }));
vi.mock("@/features/crm-next/deal-draft-workspace", () => ({
  useDealDraft: () => ({ save: vi.fn(async () => true) }),
  useDealDraftState: (key: string, initial: unknown) => [draft.values[key] ?? initial, vi.fn()],
  useArchivedDealPacket: () => [null, vi.fn()],
  DealDraftWorkspace: ({ children }: { children: unknown }) => children,
  DealDraftScope: ({ children }: { children: unknown }) => children
}));

function markup(props: Partial<Parameters<typeof TestDriveExecutionDesk>[0]> = {}) {
  return renderToStaticMarkup(<TestDriveExecutionDesk review employeeName="Pat Employee" customerName="Alex Driver"
    customerPrefill={{ address: "", dateOfBirth: "", email: "", idLast4: "", idState: "", idType: "", phoneNumber: "" }}
    vehicle="2005 Toyota Corolla / 1NXBR32E85Z123456" onAmountChange={vi.fn()} onComplete={vi.fn(async () => true)}
    onSaveDraft={vi.fn()} onVehicleChange={vi.fn()} statusKind="idle" {...props} />);
}

const validFacts = {
  salesperson: "Pat Employee", accompanyingEmployee: "Pat Employee", driveMode: "SUPERVISED", driverLicense: "D123456",
  licenseState: "MN", licenseExpiration: "2028-01-01", licenseVerified: true, driverPhone: "612-555-0100", driverEmail: "",
  insuranceBasis: "DRIVER_POLICY", insuranceCarrier: "Example", insurancePolicy: "POL123", insuranceVerified: true,
  testDriveDate: "2026-10-13", startTime: "12:00", durationMinutes: "30", mileageAllowance: "20",
  departureMileage: "45000", departureCondition: "Existing rear scratch", fuelOut: "3/4", approvedRoute: "Local route",
  vin: "1NXBR32E85Z123456", stockNumber: "123", year: "2005", make: "Toyota", model: "Corolla", trim: "", notes: "",
  returnAt: "", returnMileage: "", returnCondition: "", fuelIn: "", keysReturned: false, receivedBy: ""
};

function readyDraft() {
  draft.values = {
    facts: { ...validFacts },
    releasePhotos: Object.fromEntries(["td-front", "td-rear", "td-sides", "td-interior", "td-odometer"].map((id) => [id, `${id}.jpg`])),
    documents: Object.fromEntries(["td-signed-release", "td-driver-license", "td-insurance-proof"].map((id) => [id, `${id}.pdf`]))
  };
}

function startDisabled(html: string) {
  const footer = html.split("<footer>")[1]?.split("</footer>")[0] ?? "";
  return !footer.includes("Start test drive") || /<button[^>]*disabled=""[^>]*>[\s\S]*?Start test drive<\/button>/.test(footer);
}

describe("test-drive checkout review", () => {
  beforeEach(() => { draft.values = {}; });

  it("shows one short departure checklist and keeps long editors closed", () => {
    const html = markup();
    expect(html).toContain("Departure checks");
    expect(html).toContain("Driver and coverage");
    expect(html).toContain('hidden="" class="');
    for (const id of ["driver", "vehicle", "evidence", "checkout"]) {
      expect(html).toMatch(new RegExp(`<section hidden=""[^>]+id="test-drive-${id}"`));
    }
    expect(startDisabled(html)).toBe(true);
    expect(html).toContain("Complete next check");
    expect(html).toContain("Take photos later");
    expect(html).toContain('aria-label="Upload existing Front photo"');
  });

  it("does not change the normal desk when the review flag is absent", () => {
    const html = markup({ review: false });
    expect(html).not.toContain("Departure checks");
    expect(html).not.toMatch(/<section hidden=""[^>]+id="test-drive-driver"/);
    expect(html).toContain("Checkout controls");
  });

  it("allows departure only when all existing release requirements are ready", () => {
    readyDraft();
    expect(startDisabled(markup())).toBe(false);
    for (const key of ["documents", "releasePhotos"]) {
      readyDraft();
      draft.values[key] = {};
      expect(startDisabled(markup())).toBe(true);
    }
  });

  it("allows saving intake with photos deferred without treating departure as ready", () => {
    readyDraft();
    draft.values.releasePhotos = {};
    draft.values.departurePhotosDeferred = true;
    const html = markup();
    expect(html).toContain("Save intake · photos later");
    expect(html).toContain("Pending · before departure");
    expect(startDisabled(html)).toBe(true);
    expect(html).toContain("1 check remaining");
  });

  it("shows completed photos as ready even if they were previously deferred", () => {
    readyDraft();
    draft.values.departurePhotosDeferred = true;
    const html = markup();
    expect(startDisabled(html)).toBe(false);
    expect(html).not.toContain("Pending · before departure");
    expect(html).not.toContain("Save intake · photos later");
  });

  it.each([{ licenseVerified: false }, { insuranceVerified: false }, { licenseExpiration: "2020-01-01" }, { departureMileage: "-1" }, { accompanyingEmployee: "" }])("retains authorization validation: %j", (change) => {
    readyDraft();
    draft.values.facts = { ...validFacts, ...change };
    expect(startDisabled(markup())).toBe(true);
  });

  it("blocks release while uploads are saving or failed", () => {
    readyDraft();
    expect(startDisabled(markup({ uploadBusy: true }))).toBe(true);
    expect(startDisabled(markup({ uploadError: "Upload failed" }))).toBe(true);
    expect(markup({ uploadError: "Upload failed" })).toContain('role="alert">Upload failed');
  });

  it("restores an active drive with a direct return action and no second start action", () => {
    readyDraft();
    draft.values.testDriveStarted = true;
    const html = markup();
    expect(html).toContain("Test drive active");
    expect(html).toContain("Record return");
    expect(html.split('id="test-drive-driver"')[0]).not.toContain("Start test drive");
  });
});
