import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClaimsWorkspaceReview } from "@/features/inventory/claims-workspace-review";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  attachClaimEvidence,
  createInsuranceClaim,
  createInMemoryClaimsWorkspaceRepository,
  getClaimWorkspaceReadModel
} from "@/server/claims-workspace/service";

const actor: AuthenticatedUser = {
  duties: { all: [], direct: [], roleDefaults: [] },
  email: "advisor@example.com",
  id: "advisor-1",
  isActive: true,
  name: "Eli Manager",
  roles: ["Service Advisor"]
};

describe("claims workspace review", () => {
  it("renders the adopted claims workspace sections and handoff guidance", () => {
    const html = renderToStaticMarkup(<ClaimsWorkspaceReview />);

    expect(html).toContain("Claims Workspace");
    expect(html).toContain("Save claim");
    expect(html).toContain("Execute Next Tasks");
    expect(html).toContain("Extra Action Tools");
    expect(html).toContain("Add progress note / view timeline");
    expect(html).toContain("Keep progress recording and audit history close");
    expect(html).toContain("Claim Snapshot");
    expect(html).toContain("What We Need");
    expect(html).toContain("Carrier Tracker");
    expect(html).toContain("Activity Timeline");
    expect(html).toContain("Next Action");
    expect(html).toContain("Money &amp; Recovery");
    expect(html).toContain("Open recovery workspace");
    expect(html).toContain("Handoff Readiness");
    expect(html).toContain("Contact adjuster");
    expect(html).toContain("Repair order handoff");
  });

  it("shows a staff name instead of the internal owner id", async () => {
    const model = await getClaimWorkspaceReadModel(actor, "claim-demo-1", {
      repository: createInMemoryClaimsWorkspaceRepository()
    });
    const html = renderToStaticMarkup(<ClaimsWorkspaceReview model={model} />);

    expect(html).toContain("Eli Manager");
    expect(html).not.toContain("advisor-1");
  });

  it("shows uploaded carrier estimates as reviewable approved repair amounts", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository();
    const model = await attachClaimEvidence(actor, "claim-demo-1", {
      category: "ESTIMATE",
      documentLibraryId: "doc-state-farm-estimate",
      fileName: "state-farm-estimate.pdf",
      notes: "State Farm estimate total approved repairs $5,344.16.",
      relationshipTargets: ["CLAIM", "REPAIR_ORDER"],
      status: "RECEIVED",
      title: "State Farm approved repair estimate"
    }, { repository });
    const html = renderToStaticMarkup(<ClaimsWorkspaceReview model={{ ...model, documentStorageReady: true }} />);

    expect(html).toContain("Carrier Estimate");
    expect(html).toContain("Uploaded Files");
    expect(html).toContain("$5,344.16");
    expect(html).toContain("Review estimate");
    expect(html).toContain("View document");
    expect(html).toContain(">View summary</button>");
    expect(html).toContain("Claim evidence / Document library");
    expect(html).toContain("state-farm-estimate.pdf");
  });

  it("keeps original file links available for document-backed evidence", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository();
    const model = await attachClaimEvidence(actor, "claim-demo-1", {
      category: "ESTIMATE",
      documentLibraryId: "doc-state-farm-estimate",
      fileName: "state-farm-estimate.pdf",
      notes: "State Farm estimate total approved repairs $5,344.16.",
      relationshipTargets: ["CLAIM", "REPAIR_ORDER"],
      status: "RECEIVED",
      title: "State Farm approved repair estimate"
    }, { repository });
    const html = renderToStaticMarkup(<ClaimsWorkspaceReview model={{ ...model, documentStorageReady: false }} />);

    expect(html).toContain("View document");
    expect(html).toContain(`/api/claims-workspace/claims/${model.claim.id}/evidence/`);
  });

  it("opens the associated repair task from a ready claim handoff", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository([]);
    const created = await createInsuranceClaim(actor, {
      carrierName: "Progressive",
      claimNumber: "MN-70002",
      customerName: "Ready Customer",
      description: "Left front damage.",
      ownerUserId: "advisor-1",
      vehicleMake: "Nissan",
      vehicleModel: "Rogue",
      vehicleVin: "VIN-READY-002",
      vehicleYear: "2020"
    }, { repository });

    for (const [category, title] of [
      ["AUTHORIZATION", "Signed customer authorization"],
      ["DAMAGE_PHOTO", "Damage photo set"],
      ["VIN_PHOTO", "VIN photo"],
      ["ODOMETER_PHOTO", "Odometer photo"],
      ["INSURANCE_CARD", "Insurance card"],
      ["CLAIM_IDENTITY", "Claim number"]
    ] as const) {
      await attachClaimEvidence(actor, created.readModel.claim.id, {
        category,
        relationshipTargets: ["CLAIM", "CUSTOMER", "VEHICLE"],
        status: "RECEIVED",
        title
      }, { repository });
    }

    const model = await getClaimWorkspaceReadModel(actor, created.readModel.claim.id, { repository });
    const createHtml = renderToStaticMarkup(<ClaimsWorkspaceReview model={model} />);
    expect(createHtml).toContain("Create start repairs task");
    expect(createHtml).toContain('href="/tasks/intake?');

    const html = renderToStaticMarkup(
      <ClaimsWorkspaceReview model={{
        ...model,
        associatedRepairTask: {
          href: "/tasks/task-repair-start",
          id: "task-repair-start",
          status: "IN_PROGRESS",
          title: "Start approved repairs for Ready Customer"
        }
      }} />
    );

    expect(html).toContain("Open associated task");
    expect(html).toContain('href="/tasks/task-repair-start"');
    expect(html).not.toContain("Create start repairs task");
  });

  it("opens in safe mode when claim details are temporarily limited", () => {
    const html = renderToStaticMarkup(
      <ClaimsWorkspaceReview loadError="Claim data could not be loaded. The workspace opened in safe mode." />
    );

    expect(html).toContain("Safe mode");
    expect(html).toContain("Claim details are temporarily limited");
    expect(html).toContain("Retry from Claim Desk");
    expect(html).toContain("Execute Next Tasks");
  });
});
