import { test, expect } from "@playwright/test";

for (const rejectArchive of [false, true]) {
  test(rejectArchive ? "archive conflict preserves the deal and explains the error" : "archive duplicate confirms, hides the draft and preserves its packet link", async ({ page }) => {
    const duplicate = { id: "draft-duplicate", draftId: "draft-duplicate", draftRevision: 3, jacketId: "packet-duplicate", dealNumber: "SAMPLE-DUP", customerName: "Sample buyer", vehicleReference: "Sample vehicle", pathway: "lease-to-own", status: "IN_PROGRESS", updatedAt: "2026-10-31T18:00:00Z" };
    const keep = { ...duplicate, id: "draft-keep", draftId: "draft-keep", jacketId: "packet-keep", dealNumber: "SAMPLE-KEEP" };
    let archives = 0;
    await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside archive test" } }));
    await page.route("**/api/crm/v1/deal-drafts*", route => {
      const request = route.request();
      if (request.method() === "PATCH") {
        const body = request.postDataJSON();
        expect(body).toEqual({ action: "ARCHIVE_DUPLICATE", id: duplicate.id, revision: 3 });
        archives += 1;
        if (rejectArchive) return route.fulfill({ status: 409, json: { error: "This deal changed in another window. Refresh the list and review it before archiving." } });
        duplicate.status = "ARCHIVED";
        return route.fulfill({ json: { id: duplicate.id, status: duplicate.status } });
      }
      const status = new URL(request.url()).searchParams.get("status");
      const items = [duplicate, keep].filter(row => status === "ALL" || (status === "CURRENT" ? row.status !== "ARCHIVED" : row.status === status));
      return route.fulfill({ json: { items, counts: { IN_PROGRESS: duplicate.status === "ARCHIVED" ? 1 : 2, ARCHIVED: duplicate.status === "ARCHIVED" ? 1 : 0 }, total: items.length, page: 1, pages: 1 } });
    });
    await page.goto("/login");
    await page.getByLabel("Email").fill("morgan.manager@local.test");
    await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
    const signedIn = page.waitForResponse(response => response.url().endsWith("/api/auth/login"));
    await page.getByRole("button", { name: "Sign in" }).click();
    expect((await signedIn).ok()).toBe(true);
    expect((await page.request.get("/api/crm/v1/deal-drafts?view=workbench&status=CURRENT")).status()).toBe(200);
    await page.goto("/crm-next/deals");
    const row = page.getByRole("row").filter({ hasText: "SAMPLE-DUP" });
    await row.getByRole("button", { name: "Archive duplicate", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Archive duplicate deal" });
    await expect(dialog).toContainText("All packet documents and history stay saved");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(archives).toBe(0);
    await row.getByRole("button", { name: "Archive duplicate", exact: true }).click();
    await dialog.getByRole("button", { name: "Confirm archive", exact: true }).click();
    if (rejectArchive) {
      await expect(dialog.getByRole("alert")).toContainText("changed in another window");
      expect(duplicate.status).toBe("IN_PROGRESS");
      return;
    }
    await expect(row).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: "SAMPLE-KEEP" })).toBeVisible();
    await page.getByRole("tab", { name: /^Archived deals/ }).click();
    await expect(row.getByRole("link", { name: "Open packet for Sample buyer" })).toHaveAttribute("href", "/sales-documents?jacketId=packet-duplicate");
    await expect(row.getByRole("button", { name: "Archive duplicate", exact: true })).toHaveCount(0);
    await page.getByRole("tab", { name: /^Current deals/ }).click();
    await expect(row).toHaveCount(0);
  });
}
