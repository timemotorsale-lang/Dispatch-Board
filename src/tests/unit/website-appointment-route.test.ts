import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), read: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/server/services/appointment-read-service", () => ({ listAppointmentReadModels: mocks.read }));
import { GET } from "@/app/api/website-console/appointments/route";

const manager: AuthenticatedUser = { id: "manager", name: "Synthetic manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const request = (query = "date=2026-10-24") => new Request(`http://localhost/api/website-console/appointments?${query}`);

describe("private website calendar API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue(manager);
    mocks.read.mockResolvedValue({ appointments: [] });
  });
  it("rejects anonymous, inactive and unauthorized access without reading appointments", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    mocks.currentUser.mockResolvedValue({ ...manager, isActive: false });
    expect((await GET(request())).status).toBe(401);
    mocks.currentUser.mockResolvedValue({ ...manager, roles: ["Sales"] });
    expect((await GET(request())).status).toBe(403);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("rejects invalid dates, duplicate fields and organization/location overrides", async () => {
    for (const query of ["date=2026-02-30", "date=invalid", "date=2026-10-24&date=2026-10-25", "locationId=other&date=2026-10-24", "organizationId=other"]) expect((await GET(request(query))).status).toBe(400);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("reuses the authorized native read service and scopes a Minnesota day", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.read).toHaveBeenCalledWith(manager, { locationId: "loc-time-motor-sales-minneapolis", windowStart: new Date("2026-10-24T05:00:00Z"), windowEnd: new Date("2026-10-25T05:00:00Z"), includeCancelled: true });
    expect(await response.json()).toMatchObject({ source: "SHARED_STAFF_CALENDAR", readOnly: true, websiteIntakeConnected: false, rows: [] });
  });
  it("projects only the minimal staff fields and separates booking from confirmation", async () => {
    mocks.read.mockResolvedValue({ appointments: [{ id: "apt", appointmentNumber: "APT-1", title: "Synthetic test", startsAt: null, endsAt: null, bookingStatus: "DRAFT", confirmationStatus: "NOT_SENT", owner: { name: "Staff", email: "private@example.test" }, customer: { email: "secret@example.test" }, sourceSnapshot: { notes: "Private notes" } }] });
    const body = await (await GET(request())).json();
    expect(body.rows).toEqual([{ id: "apt", appointmentNumber: "APT-1", title: "Synthetic test", startsAt: null, endsAt: null, bookingStatus: "DRAFT", confirmationStatus: "NOT_SENT", ownerName: "Staff" }]);
    expect(JSON.stringify(body)).not.toContain("@example.test");
    expect(JSON.stringify(body)).not.toContain("Private notes");
  });
  it("uses the DST-aware local day rather than assuming 24 hours", async () => {
    await GET(request("date=2026-11-01"));
    expect(mocks.read).toHaveBeenCalledWith(manager, expect.objectContaining({ windowStart: new Date("2026-11-01T05:00:00Z"), windowEnd: new Date("2026-11-02T06:00:00Z") }));
  });
  it("caps the response honestly and maps native denial and outages without leaking errors", async () => {
    mocks.read.mockResolvedValue({ appointments: Array.from({ length: 101 }, (_, index) => ({ id: `apt-${index}`, owner: null })) });
    const body = await (await GET(request())).json();
    expect(body.truncated).toBe(true);
    expect(body.rows).toHaveLength(100);
    mocks.read.mockRejectedValue(new Error("Appointment schedule is not authorized."));
    expect((await GET(request())).status).toBe(403);
    mocks.read.mockRejectedValue(new Error("Database password secret details"));
    const failed = await GET(request());
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("password");
  });
});
