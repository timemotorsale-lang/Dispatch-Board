import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DocumentsPage from "@/app/(app)/documents/page";
import { DocumentLibraryLanding } from "@/features/document-library/document-library-landing";

describe("document library landing", () => {
  it("renders the approved landing page structure and category scope", () => {
    const markup = renderToStaticMarkup(<DocumentLibraryLanding />);

    expect(markup).toContain("Document Library");
    expect(markup).toContain("Document Categories");
    expect(markup).toContain("Document work dashboard");
    expect(markup).toContain("Ready for review");
    expect(markup).toContain("Provider waiting");
    expect(markup).toContain("Customer");
    expect(markup).toContain("Vehicle");
    expect(markup).toContain("Repair Order");
    expect(markup).toContain("Purchase / Appraisal");
    expect(markup).toContain("Signed Forms");
    expect(markup).toContain("Add or link document");
    expect(markup).toContain("Claim Packet: Gada Ahmed Jamal");
    expect(markup).toContain("Packet overview");
    expect(markup).toContain("Linked documents");
    expect(markup).toContain("Audit &amp; Source");
  });

  it("renders packet review controls with requirement progress and audit provenance", () => {
    const markup = renderToStaticMarkup(<DocumentLibraryLanding />);

    expect(markup).toContain("2 of 4 received");
    expect(markup).toContain("Insurance claim intake form");
    expect(markup).toContain("Customer authorization");
    expect(markup).toContain("Damage photos");
    expect(markup).toContain("Tow / storage form");
    expect(markup).toContain("Needs correction");
    expect(markup).toContain("Request document");
    expect(markup).toContain("Accept packet");
    expect(markup).toContain("Send to archive");
    expect(markup).toContain("Blockers");
    expect(markup).toContain("Advisory");
    expect(markup).toContain("Provider status");
    expect(markup).toContain("Provider actions");
    expect(markup).toContain("Archive controls");
    expect(markup).toContain("Customer Portal");
    expect(markup).toContain("View audit history");
  });

  it("renders the expected packet queue and filter status gates", () => {
    const markup = renderToStaticMarkup(<DocumentLibraryLanding />);

    expect(markup.match(/type="checkbox"/g)).toHaveLength(5);
    expect(markup).toContain("Accepted");
    expect(markup).toContain("In Review");
    expect(markup).toContain("Missing");
    expect(markup).toContain("Needs Correction");
    expect(markup).toContain("Received");
    expect(markup).toContain("#CLM-10421");
    expect(markup).toContain("#RO-88317");
    expect(markup).toContain("#TTL-55091");
    expect(markup).toContain("#FIN-77102");
    expect(markup).toContain("#PUR-66120");
    expect(markup).toContain("#WAR-33418");
  });

  it("exposes the route-level document library page", () => {
    const markup = renderToStaticMarkup(<DocumentsPage />);

    expect(markup).toContain("Add Document");
    expect(markup).toContain("Create Packet");
    expect(markup).toContain("Required Documents");
    expect(markup).toContain("Add to packet");
    expect(markup).toContain("Link existing");
  });
});
