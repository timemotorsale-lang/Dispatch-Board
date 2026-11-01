import { test, expect } from "@playwright/test";
import { reportingRange, summarizeDeals, type DashboardDeal } from "../../lib/deal-dashboard";

for (const existingPacket of [true, false]) {
test(`staff mark sold before paperwork, then finalize the same deal (existing packet: ${existingPacket})`, async ({ page }) => {
  test.setTimeout(120000); page.setDefaultTimeout(15000);
  let state = "WORKING", status = "IN_PROGRESS", revision = 3, packetRevision = 5, ready = false;
  let jacketId: string | null = existingPacket ? "jacket-sample" : null;
  const actions: string[] = [];
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside lifecycle test" } }));
  await page.route("**/api/sales-documents/jacket-sample", route => route.fulfill({ json: { id: "jacket-sample", state, revision: packetRevision, checklist: [{ id: "lease", label: "Signed lease agreement", blocker: ready ? null : "Upload and review the signed lease agreement.", ready, required: true }], versions: [], requirements: [], documents: [] } }));
  await page.route("**/api/crm/v1/deal-drafts*", async route => {
    const request = route.request(), query = new URL(request.url()).searchParams;
    if (request.method() === "POST") throw new Error("Closing an existing deal must not create a new draft.");
    if (request.method() === "PATCH") {
      const body = request.postDataJSON();
      expect(body.id).toBe("draft-sample");
      expect(body.revision).toBe(revision);
      if (!["MARK_SOLD", "PREPARE_PAPERWORK"].includes(body.action)) { expect(body.jacketId).toBe("jacket-sample"); expect(body.jacketRevision).toBe(packetRevision); packetRevision++; }
      actions.push(body.action); revision++;
      if (body.action === "MARK_SOLD") status = "SOLD";
      if (body.action === "PREPARE_PAPERWORK") jacketId = "jacket-sample";
      if (body.action === "FINISH") { state = "CLOSED"; status = "SOLD"; }
      if (body.action === "REOPEN") { state = "WORKING"; expect(body.note.length).toBeGreaterThanOrEqual(10); }
      if (body.action === "REQUEST_UNWIND") { state = "UNWIND_PENDING"; status = "PENDING"; }
      return route.fulfill({ json: { id: body.id, jacketId, status, state, revision } });
    }
    if (query.get("id") || query.get("view") === "operations") return route.fulfill({ json: { id: "draft-sample", revision, draftRevision: revision } });
    const row: DashboardDeal = { id: "draft-sample", draftId: "draft-sample", draftRevision: revision, jacketId, dealNumber: "D-SAMPLE", customerName: "Sample lease customer", customerId: "sample-customer", vehicleReference: "Sample Toyota", pathway: "lease-to-own", status, packetState: jacketId ? state : null, updatedAt: new Date().toISOString(), ownerId: "sample-staff", ownerName: "Sample Staff", stage: state === "CLOSED" ? "Completed" : state === "UNWIND_PENDING" ? "Unwind review pending" : status === "SOLD" ? "Sold · paperwork pending" : "Working", nextAction: "Review packet", dueAt: null, taskHref: null, completedDate: state === "CLOSED" ? "2026-11-01" : null, createdDate: "2026-11-01", documentsReady: ready ? 1 : 0, documentsTotal: 1, needsAttention: state !== "CLOSED" };
    const range = reportingRange("2026-11-01", "month");
    return route.fulfill({ json: { items: [row], total: 1, pages: 1, page: 1, counts: { [status]: 1 }, dashboard: { range, summary: summarizeDeals([row], range), owners: [], taxes: { available: false, message: "Outside lifecycle test" }, canManage: true, scope: "Synthetic test records" } } });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test"); await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const login = page.waitForResponse(response => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); expect((await login).ok()).toBe(true);
  await page.goto("/crm-next/deals");
  await page.getByRole("button", { name: "Mark sold", exact: true }).click();
  const sold = page.getByRole("dialog", { name: "Mark deal sold", exact: true });
  await sold.getByRole("checkbox").check(); await sold.getByRole("button", { name: "Mark deal sold", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "D-SAMPLE" });
  await expect(row).toContainText("Sold · paperwork pending");
  await expect(row.locator('[data-status="SOLD"]')).toHaveAttribute("data-finalized", "false");
  expect(actions).toEqual(["MARK_SOLD"]);
  await row.getByRole("button", { name: "Complete paperwork", exact: true }).click();
  const finish = page.getByRole("dialog", { name: "Finalize paperwork", exact: true });
  if (!existingPacket) await finish.getByRole("button", { name: "Start paperwork checklist", exact: true }).click();
  await expect(finish).toContainText("Upload and review the signed lease agreement.");
  await expect(finish.getByRole("button", { name: "Finalize paperwork", exact: true })).toBeDisabled();
  ready = true; await finish.getByRole("button", { name: "Refresh checklist", exact: true }).click();
  await expect(finish).toContainText("Required packet checks are complete");
  await finish.getByRole("checkbox").check(); await finish.getByRole("button", { name: "Finalize paperwork", exact: true }).click();
  await expect(row).toContainText("Sold · finalized");
  await expect(row.locator('[data-status="SOLD"]')).toHaveAttribute("data-finalized", "true");
  await row.locator("summary").filter({ hasText: "More" }).click(); await row.getByRole("button", { name: "Reopen for corrections", exact: true }).click();
  const reopen = page.getByRole("dialog", { name: "Reopen for corrections", exact: true });
  await reopen.getByLabel("Reason", { exact: true }).fill("Correct the customer mailing address.");
  await reopen.getByRole("button", { name: "Reopen for corrections", exact: true }).click();
  await expect(row.getByRole("button", { name: "Complete paperwork", exact: true })).toBeVisible();
  await row.getByRole("button", { name: "Complete paperwork", exact: true }).click();
  await expect(finish.getByRole("checkbox")).toBeVisible(); await finish.getByRole("checkbox").check();
  await finish.getByRole("button", { name: "Finalize paperwork", exact: true }).click();
  await expect(row).toContainText("Sold · finalized");
  await row.locator("summary").filter({ hasText: "More" }).click(); await row.getByRole("button", { name: "Request unwind review", exact: true }).click();
  const unwind = page.getByRole("dialog", { name: "Request unwind review", exact: true });
  await expect(unwind).toContainText("does not refund the customer");
  await unwind.getByLabel("Reason", { exact: true }).fill("Customer requested cancellation; accounting review needed.");
  await unwind.getByRole("button", { name: "Request unwind review", exact: true }).click();
  await expect(row).toContainText("Unwind review pending");
  expect(actions).toEqual(["MARK_SOLD", ...(!existingPacket ? ["PREPARE_PAPERWORK"] : []), "FINISH", "REOPEN", "FINISH", "REQUEST_UNWIND"]);
});
}
