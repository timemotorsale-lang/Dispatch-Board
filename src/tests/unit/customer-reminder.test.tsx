import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CrmNextDirectActionForm, reminderDateToIso } from "@/features/crm-next/crm-next-direct-action-form";
import { crmActionSourceTruth } from "@/lib/crm-source-of-truth-registry";

describe("customer reminder", () => {
  it("requires a future time and preserves the exact selected time", () => {
    const now = new Date("2026-10-31T10:00:00").getTime();
    expect(reminderDateToIso("2026-10-31T11:15", now)).toBe(new Date("2026-10-31T11:15").toISOString());
    for (const value of ["", "invalid", "2026-10-31T09:00", "2026-10-31T10:00"]) expect(reminderDateToIso(value, now)).toBeNull();
  });
  it("exposes a note, date and time and clear staff-queue ownership", () => {
    const html = renderToStaticMarkup(<CrmNextDirectActionForm actionId="set-reminder" cancelHref="/crm-next/customers/customer-1" customerId="customer-1" customerName="Sample Buyer" disabled={false} fields={[{ label: "Reminder note", placeholder: "Follow up" }, { label: "Reminder", placeholder: "Choose a time" }]} nextAction="Review customer" saveLabel="Save Reminder" successMessage="Reminder saved" />);
    expect(html).toContain('type="datetime-local"');
    expect(html).toContain("Reminder note");
    expect(html).toContain("Save Reminder");
    expect(crmActionSourceTruth("set-reminder")).toMatchObject({ status: "Live", source: "CRM customer task list and staff queue" });
  });
});
