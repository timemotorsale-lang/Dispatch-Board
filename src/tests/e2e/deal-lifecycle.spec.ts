import { test, expect } from "@playwright/test";
import { reportingRange, summarizeDeals, type DashboardDeal } from "../../lib/deal-dashboard";

test("staff finish the same lease, managers reopen it and request unwind review", async ({ page }) => {
  test.setTimeout(120000); page.setDefaultTimeout(15000);
  let state = "WORKING", status = "IN_PROGRESS", revision = 3, packetRevision = 5, ready = false;
  const actions: string[] = [];
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside lifecycle test" } }));
  await page.route("**/api/sales-documents/jacket-sample", route => route.fulfill({ json: { id: "jacket-sample", state, revision: packetRevision, checklist: [{ id: "lease", label: "Signed lease agreement", blocker: ready ? null : "Upload and review the signed lease agreement.", ready, required: true }], versions: [], requirements: [], documents: [] } }));
  await page.route("**/api/crm/v1/deal-drafts*", async route => {
    const request = route.request(), query = new URL(request.url()).searchParams;
    if (request.method() === "POST") throw new Error("Closing an existing deal must not create a new draft.");
    if (request.method() === "PATCH") {
      const body = request.postDataJSON();
      expect(body.id).toBe("draft-sample"); expect(body.jacketId).toBe("jacket-sample");
      expect(body.revision).toBe(revision); expect(body.jacketRevision).toBe(packetRevision);
      actions.push(body.action); revision++; packetRevision++;
      if (body.action === "FINISH") { state = "CLOSED"; status = "SOLD"; }
      if (body.action === "REOPEN") { state = "WORKING"; expect(body.note.length).toBeGreaterThanOrEqual(10); }
      if (body.action === "REQUEST_UNWIND") { state = "UNWIND_PENDING"; status = "PENDING"; }
      return route.fulfill({ json: { id: body.id, jacketId: body.jacketId, status, state } });
    }
    if (query.get("id")) return route.fulfill({ json: { id: "draft-sample", revision } });
    const row: DashboardDeal = { id: "draft-sample", draftId: "draft-sample", draftRevision: revision, jacketId: "jacket-sample", dealNumber: "D-SAMPLE", customerName: "Sample lease customer", customerId: "sample-customer", vehicleReference: "Sample Toyota", pathway: "lease-to-own", status, packetState: state, updatedAt: new Date().toISOString(), ownerId: "sample-staff", ownerName: "Sample Staff", stage: state === "CLOSED" ? "Completed" : state === "UNWIND_PENDING" ? "Unwind review pending" : "Working", nextAction: "Review packet", dueAt: null, taskHref: null, completedDate: state === "CLOSED" ? "2026-11-01" : null, createdDate: "2026-11-01", documentsReady: ready ? 1 : 0, documentsTotal: 1, needsAttention: state !== "CLOSED" };
    const range = reportingRange("2026-11-01", "month");
    return route.fulfill({ json: { items: [row], total: 1, pages: 1, page: 1, counts: { [status]: 1 }, dashboard: { range, summary: summarizeDeals([row], range), owners: [], taxes: { available: false, message: "Outside lifecycle test" }, canManage: true, scope: "Synthetic test records" } } });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test"); await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const login = page.waitForResponse(response => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); expect((await login).ok()).toBe(true);
  await page.goto("/crm-next/deals");
  await page.getByRole("button", { name: "Finish lease", exact: true }).click();
  const finish = page.getByRole("dialog", { name: "Finish lease and mark sold", exact: true });
  await expect(finish).toContainText("Upload and review the signed lease agreement.");
  await expect(finish.getByRole("button", { name: "Finish lease and mark sold", exact: true })).toBeDisabled();
  ready = true; await finish.getByRole("button", { name: "Refresh checklist", exact: true }).click();
  await expect(finish).toContainText("Required packet checks are complete");
  await finish.getByRole("checkbox").check(); await finish.getByRole("button", { name: "Finish lease and mark sold", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "D-SAMPLE" });
  await expect(row).toContainText("Sold · lease");
  await row.locator("summary").filter({ hasText: "More" }).click(); await row.getByRole("button", { name: "Reopen for corrections", exact: true }).click();
  const reopen = page.getByRole("dialog", { name: "Reopen for corrections", exact: true });
  await reopen.getByLabel("Reason", { exact: true }).fill("Correct the customer mailing address.");
  await reopen.getByRole("button", { name: "Reopen for corrections", exact: true }).click();
  await expect(row.getByRole("button", { name: "Finish lease", exact: true })).toBeVisible();
  await row.getByRole("button", { name: "Finish lease", exact: true }).click();
  await expect(finish.getByRole("checkbox")).toBeVisible(); await finish.getByRole("checkbox").check();
  await finish.getByRole("button", { name: "Finish lease and mark sold", exact: true }).click();
  await expect(row).toContainText("Sold · lease");
  await row.locator("summary").filter({ hasText: "More" }).click(); await row.getByRole("button", { name: "Request unwind review", exact: true }).click();
  const unwind = page.getByRole("dialog", { name: "Request unwind review", exact: true });
  await expect(unwind).toContainText("does not refund the customer");
  await unwind.getByLabel("Reason", { exact: true }).fill("Customer requested cancellation; accounting review needed.");
  await unwind.getByRole("button", { name: "Request unwind review", exact: true }).click();
  await expect(row).toContainText("Unwind review pending");
  expect(actions).toEqual(["FINISH", "REOPEN", "FINISH", "REQUEST_UNWIND"]);
});
