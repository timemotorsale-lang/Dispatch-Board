import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiagnosticWorkspace } from "@/features/diagnostics/diagnostic-workspace";

const props = { vehicle: "2017 Acura TLX", customer: "Sample customer", vin: "VEH-TEST", concern: "Brake concern", tools: <button>Choose vehicle</button>, onSave: async () => true, onFindDrafts: async () => [], saveStatus: "Saved" };
describe("simplified diagnostic workspace", () => {
  it("renders one identity header, the approved sections, and a retained estimate editor", () => {
    const html = renderToStaticMarkup(<DiagnosticWorkspace {...props}><input defaultValue="Unfinished estimate" /></DiagnosticWorkspace>);
    expect(html.match(/<h1>/g)).toHaveLength(1);
    for (const section of ["Overview", "Findings &amp; tests", "Estimate", "Authorization", "Verification"]) expect(html).toContain(section);
    expect(html).toContain("Unfinished estimate");
    expect(html).not.toContain(">Overview</button>");
    expect(html).not.toContain('aria-pressed="true"');
    expect(html).toContain("Preliminary quote · no repair order");
    expect(html).toContain('href="/my-tasks"');
    expect(html).not.toContain("Open authorization workbench");
  });
  it("never treats loading as proof that findings or authorization are missing", () => {
    const html = renderToStaticMarkup(<DiagnosticWorkspace {...props} repairOrderId="ro-1" repairOrderNumber="RO-1"><p>Editor</p></DiagnosticWorkspace>);
    expect(html).toContain("Loading recorded progress");
    expect(html).toContain("Not loaded");
    expect(html).not.toContain("No diagnosis has been recorded.");
    expect(html).toContain("Open simple findings entry");
    expect(html).toContain("Record customer decision");
    expect(html).toContain("Job completion alone does not prove");
  });
});
