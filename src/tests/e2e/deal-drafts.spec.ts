import { test, expect } from "@playwright/test";

test("saved deal restores work and the optional dealer warranty choice", async ({ page }) => {
  let saved: Record<string, unknown> | null = null;
  await page.route("**/api/crm/v1/deal-drafts*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      saved = { ...body, revision: body.revision + 1, updatedAt: new Date().toISOString() };
      await route.fulfill({ json: saved });
    } else {
      await route.fulfill({ json: url.searchParams.has("id") ? saved : saved ? [saved] : [] });
    }
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test");
  await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const login = page.waitForResponse((response) => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await login).ok()).toBe(true);
  await page.goto("/crm-next/deals/start");
  const toolbar = page.getByRole("region", { name: "Saved deal drafts" });
  await expect(toolbar.getByRole("button", { name: "New deal", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: /^BHPH/ }).click();
  await page.getByRole("button", { name: "Open execution path" }).click();
  await page.getByLabel("Make", { exact: true }).fill("Chevrolet");
  await page.getByLabel("Down payment", { exact: true }).fill("$2000");
  await page.getByLabel("Income proof", { exact: true }).fill("Verified paystub");
  await page.getByLabel(/^Dealer warrantyOffer/).selectOption("NOT_OFFERED");
  await page.getByRole("button", { name: "Open BHPH packet" }).click();
  await page.getByRole("button", { name: "Prepare required forms" }).click();
  await expect(page.getByText("9/9", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await toolbar.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(toolbar.getByRole("status")).toContainText("Draft saved");
  await page.reload();
  await expect(toolbar.getByRole("status")).toContainText("Saved deal reopened");
  await expect(page.getByLabel("Make", { exact: true })).toHaveValue("Chevrolet");
  await expect(page.getByLabel("Down payment", { exact: true })).toHaveValue("$2000");
  await expect(page.getByLabel("Income proof", { exact: true })).toHaveValue("Verified paystub");
  await expect(page.getByLabel(/^Dealer warrantyOffer/)).toHaveValue("NOT_OFFERED");
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await page.getByLabel("Make", { exact: true }).boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath("draft-resume-mobile.png") });
  await page.getByRole("button", { name: "Open BHPH packet" }).click();
  await expect(page.getByText("9/9", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByLabel(/^Dealer warrantyOffer/).selectOption("OFFERED");
  await page.getByRole("button", { name: "Open BHPH packet" }).click();
  await page.getByRole("button", { name: "Prepare required forms" }).click();
  await expect(page.getByText("10/10", { exact: true })).toBeVisible();
});
