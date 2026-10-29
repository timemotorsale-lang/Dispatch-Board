import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { closingChecks, closingPathways, closingReviewSummary, suggestedClosingPathway } from "@/lib/deal-closing";
import { prepareClosingReview } from "@/server/sales-documents/closing-review";
import { PaperworkSetup } from "@/features/website-console/paperwork";
import { resolveWebsiteSection, websiteConsoleNavigationItems, websiteSections } from "@/features/website-console/navigation";

const input = (pathway = "cash") => ({ pathway, classificationNote: "Proposed cash purchase; approved retail rules still require verification.", checks: closingChecks("cash").map(check => ({ id: check.id, state: "PENDING", evidence: "" })) });

describe("deal-closing preparation controls", () => {
  it("retains eight distinct pathways without classifying a lease label as ownership", () => {
    expect(closingPathways).toHaveLength(8);
    expect(new Set(closingPathways.map(item => item.id)).size).toBe(8);
    expect(suggestedClosingPathway("lease-to-own")).toBe("lease-purchase");
    expect(suggestedClosingPathway("daily-rental")).toBeNull();
    expect(closingPathways.find(item => item.id === "closed-end-lease")?.decision).toContain("Not automatically lease-to-own");
  });
  it("requires distinct financing, leasing and buyout checks", () => {
    expect(closingChecks("cash").some(item => item.id === "credit")).toBe(false);
    expect(closingChecks("outside-finance").some(item => item.id === "credit")).toBe(true);
    expect(closingChecks("closed-end-lease").some(item => item.id === "lease")).toBe(true);
    expect(closingChecks("lease-buyout").some(item => item.id === "buyout")).toBe(true);
    for (const pathway of closingPathways) expect(new Set(closingChecks(pathway.id).map(check => check.id)).size).toBe(closingChecks(pathway.id).length);
  });
  it("stamps server identity, time and revision rather than accepting client approval", () => {
    const review = prepareClosingReview({ ...input(), savedBy: "forged", savedAt: "fake", jacketRevision: 999, releaseAllowed: true }, "real-manager", 4, new Date("2026-10-24T18:00:00Z"));
    expect(review).toMatchObject({ savedBy: "real-manager", jacketRevision: 4, savedAt: "2026-10-24T18:00:00.000Z" });
    expect(review.checks.every(check => check.reviewedBy === "real-manager")).toBe(true);
    expect(closingReviewSummary(review, 4)).toMatchObject({ releaseAllowed: false, signingAllowed: false, resolved: 0 });
  });
  it("rejects unknown products, missing checks, duplicate checks and unsupported states", () => {
    expect(() => prepareClosingReview(input("unknown"), "manager", 1)).toThrow("supported");
    expect(() => prepareClosingReview({ ...input(), checks: [] }, "manager", 1)).toThrow("every closing check");
    const duplicate = input(); duplicate.checks[1] = duplicate.checks[0];
    expect(() => prepareClosingReview(duplicate, "manager", 1)).toThrow("duplicate");
    const invalid = input(); invalid.checks[0].state = "APPROVED";
    expect(() => prepareClosingReview(invalid, "manager", 1)).toThrow("valid review state");
    expect(() => prepareClosingReview({ ...input(), classificationNote: "short" }, "manager", 1)).toThrow("15–1000");
  });
  it("requires evidence for reviewed, blocked and excluded checks", () => {
    for (const state of ["REVIEWED", "BLOCKED"]) {
      const payload = input(); payload.checks[0].state = state;
      expect(() => prepareClosingReview(payload, "manager", 1)).toThrow("evidence");
    }
    const payload = input(); payload.checks[0].state = "NOT_APPLICABLE";
    expect(() => prepareClosingReview(payload, "manager", 1)).toThrow("cannot be excluded");
    const insurance = payload.checks.find(check => check.id === "insurance")!;
    payload.checks[0].state = "PENDING"; insurance.state = "NOT_APPLICABLE";
    expect(() => prepareClosingReview(payload, "manager", 1)).toThrow("evidence");
    insurance.evidence = "Approved policy review reference INS-001 confirms non-applicability.";
    expect(closingReviewSummary(prepareClosingReview(payload, "manager", 1), 1).resolved).toBe(1);
  });
  it("never authorizes signing or handoff even when every preparation check is reviewed", () => {
    const payload = input(); payload.checks.forEach(check => { check.state = "REVIEWED"; check.evidence = "Controlled evidence reference TEST-001 reviewed for this deal."; });
    const review = prepareClosingReview(payload, "manager", 8);
    expect(closingReviewSummary(review, 8)).toMatchObject({ resolved: 10, total: 10, signingAllowed: false, releaseAllowed: false });
    expect(closingReviewSummary(review, 9)).toMatchObject({ stale: true, resolved: 0, releaseAllowed: false });
    expect(closingReviewSummary(null, 1).label).toBe("Preparation not started");
  });
  it("rejects malformed, unexpected or excessive check content", () => {
    expect(() => prepareClosingReview({ ...input(), checks: Array(10).fill(null) }, "manager", 1)).toThrow("Invalid closing check");
    const payload = input(); payload.checks[0].evidence = "a".repeat(1001);
    expect(() => prepareClosingReview(payload, "manager", 1)).toThrow("limit");
    payload.checks[0] = { id: "release-approved", state: "REVIEWED", evidence: "Pretend everything is ready." };
    expect(() => prepareClosingReview(payload, "manager", 1)).toThrow("unsupported");
  });
});

describe("permanent paperwork setup space", () => {
  it("is discoverable with aligned navigation and truthful rollout state", () => {
    expect(resolveWebsiteSection("paperwork")).toBe("paperwork");
    expect(websiteConsoleNavigationItems[websiteSections.indexOf("paperwork")].title).toBe("Paperwork & Delivery");
    const markup = renderToStaticMarkup(<PaperworkSetup />);
    expect(markup).toContain('href="/sales-documents"');
    expect(markup).toContain("My Garage → My Purchase → Paperwork &amp; Delivery");
    expect(markup).toContain("customer completion not activated");
    expect(markup).toContain("not implemented by this foundation");
    expect(markup).not.toContain("<form");
    for (const pathway of closingPathways) expect(markup).toContain(pathway.code);
  });
});
