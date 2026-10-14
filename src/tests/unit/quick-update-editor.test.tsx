import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuickUpdateEditor } from "@/features/advisor/quick-update-editor";

describe("saved Quick Update edit entry point", () => {
  const item = { id: "note-1", text: "Call customer", category: "OTHER", person: "", company: "", dueWindow: "", followUpNeeded: false, convertedTaskId: null };
  it("offers a compact edit button without mounting an unsaved form", () => {
    const html = renderToStaticMarkup(<QuickUpdateEditor item={item} categories={[]} disabled={false} onSaved={async () => {}} />);
    expect(html).toContain("Edit update");
    expect(html).not.toContain("textarea");
    expect(html).not.toContain("disabled");
  });
  it("disables editing when the workbook day is closed", () => {
    const html = renderToStaticMarkup(<QuickUpdateEditor item={item} categories={[]} disabled onSaved={async () => {}} />);
    expect(html).toContain('disabled=""');
  });
});
