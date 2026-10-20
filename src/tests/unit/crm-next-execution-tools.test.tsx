import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CrmNextInlineTaskComposer } from "@/features/crm-next/crm-next-inline-task-composer";
import { CrmNextDirectActionForm } from "@/features/crm-next/crm-next-direct-action-form";

describe("compact CRM execution tools", () => {
  it("does not claim an appointment is scheduled just because its link was opened", () => {
    const markup = renderToStaticMarkup(<CrmNextInlineTaskComposer appointmentHref="/appointments?action=new" customerId="customer-1" customerName="Review Customer" nextAction="Find available vehicle" owner="Review staff" />);
    expect(markup).toContain("Add CRM Task");
    expect(markup).toContain("Record outcome note");
    expect(markup).not.toContain("Appointment Scheduled");
  });
  it("routes actual files into the existing customer-linked document library, not a filename-only note", () => {
    const markup = renderToStaticMarkup(<CrmNextDirectActionForm actionId="upload-document" cancelHref="/crm-next/customers/customer-1" customerId="customer-1" customerName="Review Customer" disabled={false} fields={[]} nextAction="Review proof" saveLabel="Save" successMessage="Saved" />);
    expect(markup).toContain("/documents?ownerId=customer-1&amp;ownerLabel=Review+Customer");
    expect(markup).toContain("Saving a note does not upload a file.");
    expect(markup).not.toContain('type="file"');
  });
  it("does not expose upload actions without verified customer context", () => {
    const markup = renderToStaticMarkup(<CrmNextDirectActionForm actionId="upload-document" cancelHref="/crm-next/customers" customerName="Unavailable" disabled fields={[]} nextAction="" saveLabel="Save" successMessage="Saved" />);
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("/documents?");
  });
});
