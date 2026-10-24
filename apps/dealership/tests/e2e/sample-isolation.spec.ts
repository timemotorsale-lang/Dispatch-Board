import { test, expect } from "@playwright/test";

const publicUrl = process.env.DEALERSHIP_PUBLIC_TEST_URL;
const privateUrl = process.env.DEALERSHIP_PRIVATE_TEST_URL;

test("expanded development pack supplies useful filters without enabling unavailable purchases", async ({ page }) => {
  test.skip(!privateUrl, "Requires local sample preview.");
  await page.goto(`${privateUrl}/shop`);
  await expect(page.getByRole("link", { name: "View vehicle", exact: true })).toHaveCount(23);
  await page.goto(`${privateUrl}/shop?exterior=Blue`);
  await expect(page.getByRole("link", { name: "View vehicle", exact: true })).toHaveCount(2);
  await page.goto(`${privateUrl}/shop?body=Truck`);
  await expect(page.getByRole("link", { name: "View vehicle", exact: true })).toHaveCount(2);
  await page.goto(`${privateUrl}/vehicles/sample-x3`);
  await expect(page.getByRole("link", { name: "Start purchase", exact: true })).toHaveCount(0);
  await page.goto(`${privateUrl}/vehicles/sample-leaf`);
  await expect(page.getByRole("link", { name: "Start purchase", exact: true })).toHaveCount(0);
});

test("public customer runtime has no sample vehicles, photos or preview persistence", async ({ page, request }) => {
  test.skip(!publicUrl, "Requires an isolated sample-free public build.");
  await page.goto(publicUrl!);
  await expect(page.getByRole("heading", { name: "Inventory is not connected yet" })).toBeVisible();
  await expect(page.locator('img[src*="sample-media"]')).toHaveCount(0);
  await expect(page.locator('a[href*="sample-rav4"]')).toHaveCount(0);
  expect((await request.get(`${publicUrl}/listing-media/sample-rav4.png`)).status()).toBe(404);
  expect((await request.get(`${publicUrl}/api/sample-media/rav4`)).status()).toBe(404);
  expect((await request.get(`${publicUrl}/api/preview-status`)).status()).toBe(404);
  expect((await request.get(`${publicUrl}/api/preview`)).status()).toBe(503);
  expect((await page.context().cookies()).some(cookie => cookie.name === "tms-preview")).toBe(false);
});

test("private development still renders guarded sample imagery without a public media copy", async ({ page, request }) => {
  test.skip(!privateUrl, "Requires an isolated local sample preview.");
  const response = await page.goto(privateUrl!);
  expect(response!.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByText("PRIVATE DESIGN PREVIEW", { exact: false }).first()).toBeVisible();
  const image = page.locator('.hero-image img[src*="/api/sample-media/rav4"]');
  await expect(image).toBeVisible();
  expect(await image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const media = await request.get(`${privateUrl}/api/sample-media/rav4`);
  expect(media.status()).toBe(200);
  expect(media.headers()["cache-control"]).toContain("no-store");
  expect((await request.get(`${privateUrl}/listing-media/sample-rav4.png`)).status()).toBe(404);
});
