import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { applyDemoAction, createDemoAppointments, exampleDays, isCalendarDate, minnesotaToday } from "../../../packages/appointment-preview/domain";
import { AppointmentCalendarPreview } from "../../../packages/appointment-preview/calendar";
import { WebsiteAppointments } from "@/features/website-console/appointments";
import { websiteConsoleNavigationItems, websiteSections, resolveWebsiteSection } from "@/features/website-console/navigation";

describe("isolated appointment calendar demo", () => {
  it("creates independent fictitious records on every reset", () => {
    const first = createDemoAppointments();
    first[0].history.push("Changed only this copy");
    expect(createDemoAppointments()[0].history).not.toContain("Changed only this copy");
    expect(first.every(appointment => appointment.id.startsWith("sample-") && appointment.name.startsWith("Sample"))).toBe(true);
  });
  it("requires sample staff review before confirmation", () => {
    const records = createDemoAppointments();
    expect(() => applyDemoAction(records, records[0].id, { kind: "CONFIRM", date: exampleDays[0], time: "09:00" })).toThrow("Review");
    const reviewed = applyDemoAction(records, records[0].id, { kind: "REVIEW" });
    expect(reviewed[0].status).toBe("REVIEWING");
    expect(records[0].status).toBe("REQUESTED");
    const confirmed = applyDemoAction(reviewed, records[0].id, { kind: "CONFIRM", date: exampleDays[0], time: "11:00" });
    expect(confirmed[0]).toMatchObject({ status: "CONFIRMED", time: "11:00" });
  });
  it("blocks conflicting sample times without modifying the input", () => {
    const records = applyDemoAction(createDemoAppointments(), "sample-test-drive", { kind: "REVIEW" });
    expect(() => applyDemoAction(records, "sample-test-drive", { kind: "CONFIRM", date: exampleDays[0], time: "10:00" })).toThrow("conflict");
    expect(records[0].status).toBe("REVIEWING");
    expect(() => applyDemoAction(records, "sample-test-drive", { kind: "CONFIRM", date: "2027-01-01", time: "09:00" })).toThrow("example week");
    expect(() => applyDemoAction(records, "sample-test-drive", { kind: "CONFIRM", date: exampleDays[0], time: "23:00" })).toThrow("example week");
  });
  it("requires reasons for cancellation and rescheduling and retains history", () => {
    const records = createDemoAppointments();
    expect(() => applyDemoAction(records, "sample-service", { kind: "CANCEL" })).toThrow("reason");
    expect(() => applyDemoAction(records, "sample-service", { kind: "RESCHEDULE", date: exampleDays[1], time: "09:00" })).toThrow("reason");
    const moved = applyDemoAction(records, "sample-service", { kind: "RESCHEDULE", date: exampleDays[1], time: "09:00", reason: "Sample timing change" });
    expect(moved[1]).toMatchObject({ date: exampleDays[1], time: "09:00", status: "CONFIRMED" });
    const cancelled = applyDemoAction(moved, "sample-service", { kind: "CANCEL", reason: "Sample visit cancelled" });
    expect(cancelled[1].status).toBe("CANCELLED");
    expect(cancelled[1].history).toHaveLength(3);
    expect(() => applyDemoAction(cancelled, "sample-service", { kind: "REVIEW" })).toThrow("active sample");
  });
  it("rejects illegal transitions and excessive sample reasons", () => {
    const records = createDemoAppointments();
    expect(() => applyDemoAction(records, "unknown", { kind: "REVIEW" })).toThrow("active sample");
    expect(() => applyDemoAction(records, "sample-service", { kind: "REVIEW" })).toThrow("Only a sample request");
    expect(() => applyDemoAction(records, "sample-test-drive", { kind: "RESCHEDULE", reason: "Sample reason" })).toThrow("confirmed");
    expect(() => applyDemoAction(records, "sample-service", { kind: "CANCEL", reason: "x".repeat(201) })).toThrow("200");
  });
  it("renders clear fictional dates, no submit-to-staff control and no personal-data fields", () => {
    const markup = renderToStaticMarkup(<AppointmentCalendarPreview />);
    expect(markup).toContain("Nothing here is live availability");
    expect(markup).toContain("Dates, times, people and capacity are invented");
    expect(markup).toContain("No personal information is needed");
    expect(markup).not.toContain('type="email"');
    expect(markup).not.toContain('type="tel"');
    expect(markup).not.toContain("Submit request");
  });
  it("validates real dates and Minnesota date boundaries", () => {
    expect(isCalendarDate("2028-02-29")).toBe(true);
    for (const date of ["2027-02-29", "2026-02-30", "2026-13-01", "tomorrow", "2026-1-01"]) expect(isCalendarDate(date)).toBe(false);
    expect(minnesotaToday(new Date("2026-10-25T01:00:00Z"))).toBe("2026-10-24");
  });
});

describe("permanent Website Console appointments workspace", () => {
  it("keeps navigation aligned and links canonical staff tools without exposing records in initial HTML", () => {
    expect(resolveWebsiteSection("appointments")).toBe("appointments");
    expect(websiteConsoleNavigationItems[websiteSections.indexOf("appointments")].title).toBe("Appointments");
    const markup = renderToStaticMarkup(<WebsiteAppointments initialDate="2026-10-24" previewUrl="http://127.0.0.1:3100" />);
    expect(markup).toContain('href="/appointments?view=board"');
    expect(markup).toContain('href="http://127.0.0.1:3100/appointments" target="_blank" rel="noopener noreferrer"');
    expect(markup).toContain("Website appointment intake is not connected");
    expect(markup).not.toContain("Sample shopper A");
    expect(markup).not.toContain("<form");
  });
  it("does not invent a customer preview destination", () => {
    const markup = renderToStaticMarkup(<WebsiteAppointments initialDate="2026-10-24" previewUrl={null} />);
    expect(markup).toContain("Customer preview URL is not configured");
    expect(markup).not.toContain("http://127.0.0.1");
  });
});
