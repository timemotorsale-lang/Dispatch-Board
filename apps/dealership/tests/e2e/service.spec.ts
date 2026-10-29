import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const privateUrl = process.env.DEALERSHIP_PRIVATE_TEST_URL;
const publicUrl = process.env.DEALERSHIP_PUBLIC_TEST_URL;
async function vehicle(page: Page) {
  await page.goto(`${privateUrl}/service`);
  await page.getByLabel("Year", { exact: true }).fill("2021");
  await page.getByLabel("Make", { exact: true }).fill("Example");
  await page.getByLabel("Model", { exact: true }).fill("Service test");
  await page.getByRole("button", { name: "Review vehicle", exact: true }).click();
}
test("service request preserves edits and saves structured concerns without authorizing work", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  await vehicle(page);
  await page.getByLabel("Brakes", { exact: true }).check();
  await page.getByLabel("Describe what you notice", { exact: true }).fill("Synthetic sound when stopping.");
  await page.getByRole("combobox", { name: /Any concern about driving/ }).selectOption("Not drivable");
  await expect(page.getByText("Do not drive a vehicle you believe is unsafe.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await page.getByRole("combobox", { name: /Preferred response method/ }).selectOption("Phone call");
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await page.getByRole("button", { name: "Edit vehicle", exact: true }).click();
  await expect(page.getByLabel("Make", { exact: true })).toHaveValue("Example");
  await page.getByRole("button", { name: "Review vehicle", exact: true }).click();
  await expect(page.getByLabel("Brakes", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await page.getByLabel("Phone number", { exact: true }).fill("612-555-0142");
  await page.getByRole("checkbox", { name: /private preview/ }).check();
  const request = page.waitForRequest(value => value.url().endsWith("/api/preview") && value.method() === "POST");
  await page.getByRole("button", { name: "Save preview request", exact: true }).click();
  expect((await request).postDataJSON().value).toMatchObject({ kind: "SERVICE", details: { serviceVersion: "1", categories: "Brakes", drivability: "Not drivable", contactMethod: "Phone call" } });
  await expect(page.getByRole("heading", { name: "Request saved.", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "View preview Garage", exact: true }).click();
  await page.getByRole("link").filter({ has: page.getByText("SERVICE", { exact: true }) }).click();
  await expect(page.getByRole("heading", { name: "Your service request.", exact: true })).toBeVisible();
  await expect(page.getByText("No appointment, diagnosis, estimate, paid work or repair order is authorized.", { exact: true })).toBeVisible();
});
test("empty concerns are blocked and flexible timing clears old dates", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  await vehicle(page);
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Select a concern" })).toBeVisible();
  await page.getByLabel("Other / not sure", { exact: true }).check();
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await page.getByLabel("I'm flexible — contact me", { exact: true }).uncheck();
  await page.getByLabel("Preferred date", { exact: true }).fill("2027-01-20");
  await page.getByLabel("Preferred time or alternative", { exact: true }).fill("Morning");
  await page.getByLabel("I'm flexible — contact me", { exact: true }).check();
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await expect(page.locator("dl")).not.toContainText("2027-01-20");
  await expect(page.locator("dl")).not.toContainText("Morning");
});
test("VIN lookup failure keeps manual entry available", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  await page.route("**/api/vin-decode", route => route.fulfill({ status: 503, json: { error: "Test lookup unavailable. Continue manually." } }));
  await page.goto(`${privateUrl}/service`);
  await page.getByLabel("VIN", { exact: false }).fill("1HGCM82633A004352");
  await page.getByRole("button", { name: "Look up VIN", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Test lookup unavailable" })).toBeVisible();
  await page.getByLabel("Year", { exact: true }).fill("2003");
  await page.getByLabel("Make", { exact: true }).fill("Honda");
  await page.getByLabel("Model", { exact: true }).fill("Accord");
  await page.getByRole("button", { name: "Review vehicle", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Service request summary" })).toContainText("2003 Honda Accord");
});
test("service steps are accessible and fit phone, tablet and desktop widths", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  await vehicle(page);
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  }
  await page.getByLabel("Brakes", { exact: true }).check();
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
});
test("failed submission keeps answers and retries with the same idempotency key", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  const keys: string[] = [];
  await page.route("**/api/preview", async route => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    keys.push(route.request().postDataJSON().key);
    if (keys.length === 1) await route.fulfill({ status: 503, json: { error: "Synthetic temporary failure. Your details are kept." } });
    else await route.continue();
  });
  await vehicle(page);
  await page.getByLabel("Brakes", { exact: true }).check();
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await page.getByLabel("Email address", { exact: true }).fill("sample@example.com");
  await page.getByRole("checkbox", { name: /private preview/ }).check();
  await page.getByRole("button", { name: "Save preview request", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Synthetic temporary failure" })).toBeVisible();
  await expect(page.getByLabel("Email address", { exact: true })).toHaveValue("sample@example.com");
  await page.getByRole("button", { name: "Save preview request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Request saved.", exact: true })).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});
test("public service intake cannot enable sample persistence or VIN lookup", async ({ page, request }) => {
  test.skip(!publicUrl, "Requires isolated public runtime.");
  await page.goto(`${publicUrl}/service?preview=1`);
  await expect(page.getByText("Service intake preview only.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Look up VIN", exact: true })).toHaveCount(0);
  for (const endpoint of ["preview", "vin-decode"]) expect((await request.post(`${publicUrl}/api/${endpoint}`, { headers: { Origin: publicUrl! }, data: {} })).status()).toBe(503);
});
