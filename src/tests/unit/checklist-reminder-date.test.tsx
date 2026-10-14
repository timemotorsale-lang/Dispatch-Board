import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { normalizeChecklistReminderDate } from "@/lib/checklist-reminder-date";
import { ChecklistReminderField } from "@/features/advisor/checklist-reminder-field";

describe("checklist reminder date", () => {
  it("accepts dates, supports clearing, and preserves omitted updates", () => {
    expect(normalizeChecklistReminderDate("2026-09-04")).toBe("2026-09-04");
    expect(normalizeChecklistReminderDate("")).toBe("");
    expect(normalizeChecklistReminderDate(null)).toBe("");
    expect(normalizeChecklistReminderDate(undefined)).toBeUndefined();
  });
  it.each(["tomorrow", "2026-02-30", "2026-13-01", 123])("rejects invalid dates: %s", value => {
    expect(() => normalizeChecklistReminderDate(value)).toThrow("valid date");
  });
  it("renders a saved date and a matching schedule link", () => {
    const html = renderToStaticMarkup(<ChecklistReminderField value="2026-09-04" disabled={false} title="Solicit bids" onSave={vi.fn()} />);
    expect(html).toContain('type="date"');
    expect(html).toContain('value="2026-09-04"');
    expect(html).toContain("localDate=2026-09-04");
  });
});
