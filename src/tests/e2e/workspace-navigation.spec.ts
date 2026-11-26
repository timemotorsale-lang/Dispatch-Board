import { expect, test } from "@playwright/test";

test.skip(process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated" || process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:3212",
  "Requires the isolated staff workspace preview.");

const ready = expect.configure({ timeout: 30_000 });

test("desktop sidebar preference carries from Dispatch to Repair and CRM; mobile navigation overlays the form", async ({ page }) => {
  test.setTimeout(210_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
  expect((await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } })).ok()).toBe(true);

  await page.goto("/board");
  const workspace = page.locator(".app-workspace");
  const collapse = page.getByRole("button", { name: "Collapse navigation", exact: true });
  const expand = page.getByRole("button", { name: "Expand navigation", exact: true });
  await ready(collapse).toBeVisible();
  const originalWidth = (await workspace.boundingBox())!.width;
  await collapse.focus();
  await page.keyboard.press("Enter");
  await ready(expand).toBeFocused();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  expect((await workspace.boundingBox())!.width).toBeGreaterThan(originalWidth + 100);

  await page.goto("/vehicles/repair-orders?intakeSource=WALK_IN");
  await ready(expand).toBeVisible();
  const collapsedWidth = (await workspace.boundingBox())!.width;
  const search = page.getByPlaceholder(/Search name, phone, email, VIN/);
  await ready(search).toBeVisible();
  await search.fill("Synthetic intake search");
  await expand.click();
  await ready(collapse).toHaveAttribute("aria-expanded", "true");
  expect((await workspace.boundingBox())!.width).toBeLessThan(collapsedWidth - 40);
  await expect(search).toHaveValue("Synthetic intake search");
  await ready(page.locator("footer.sic-footer")).toBeVisible();
  await collapse.click();
  await page.reload();
  await ready(expand).toBeVisible();
  const repairRail = page.locator(".app-frame > .app-sidebar");
  expect((await repairRail.boundingBox())!.width).toBeLessThanOrEqual(60);
  await expect(page.locator("footer.sic-footer")).toHaveCSS("left", "60px");

  await page.goto("/crm-next/customers");
  const crmSidebar = page.getByRole("complementary", { name: "Customer Console navigation" });
  await ready(crmSidebar.getByRole("button", { name: "Expand navigation", exact: true })).toBeVisible();
  await expect(crmSidebar.getByRole("link", { name: "Needs Attention", exact: true })).toBeHidden();

  await page.goto("/sales");
  const salesSidebar = page.getByRole("complementary", { name: "Sales Workspace sidebar" });
  await ready(salesSidebar.getByRole("button", { name: "Expand navigation", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/vehicles/repair-orders?intakeSource=WALK_IN");
  const mobileMenu = page.getByRole("button", { name: "Open navigation", exact: true });
  await ready(mobileMenu).toHaveAttribute("aria-expanded", "false");
  const drawer = page.locator(".app-frame > .app-sidebar");
  await expect(drawer).toBeHidden();
  const mobileWidth = (await workspace.boundingBox())!.width;
  await mobileMenu.click();
  const close = drawer.getByRole("button", { name: "Close navigation", exact: true });
  await ready(close).toBeFocused();
  await expect(workspace).toHaveAttribute("inert", "");
  expect((await workspace.boundingBox())!.width).toBe(mobileWidth);
  await page.keyboard.press("Escape");
  await ready(mobileMenu).toBeFocused();
  await expect(drawer).toBeHidden();
  await ready(search).toBeVisible();

  await page.goto("/capture");
  await expect(page.locator(".app-frame > .app-sidebar")).toHaveCount(0);
  await expect(page.locator(".app-frame .topbar-menu")).toHaveCount(0);
});
