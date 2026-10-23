import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("approved shell works at desktop and mobile widths without horizontal overflow", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Find your next vehicle." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Shop vehicles" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 390) await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
  }
});

test("inventory preserves filters through detail and makes no silent search changes", async ({ page }) => {
  await page.goto("/shop?q=rav4&max=20000&sort=price-low");
  await page.getByRole("link", { name: "View vehicle", exact: true }).click();
  await expect(page.getByRole("heading", { name: "2021 Toyota RAV4" })).toBeVisible();
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(page).toHaveURL(/q=rav4.*max=20000.*sort=price-low/);
  await page.goto("/shop?q=no-such-model");
  await expect(page.getByRole("heading", { name: "No matching vehicles" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search inventory" })).toHaveValue("no-such-model");
});

test("phone-only service request saves once locally, with no false staff receipt", async ({ page }) => {
  await page.goto("/service");
  await page.getByRole("spinbutton", { name: "Year", exact: true }).fill("2021");
  await page.getByRole("textbox", { name: "Make", exact: true }).fill("Example");
  await page.getByRole("textbox", { name: "Model", exact: true }).fill("Test vehicle");
  await page.getByRole("button", { name: "Review vehicle" }).click();
  await page.getByRole("textbox", { name: "Describe what you notice" }).fill("Synthetic local test only.");
  await page.getByRole("button", { name: "Review request" }).click();
  await expect(page.locator("dl")).not.toContainText("paymentPath");
  await expect(page.locator("dl")).not.toContainText("intent");
  await page.getByRole("textbox", { name: "Phone number", exact: true }).fill("612-555-0142");
  await page.getByRole("checkbox", { name: /private preview/ }).check();
  await page.getByRole("button", { name: "Save preview request" }).click();
  await expect(page.getByRole("heading", { name: "Request saved." })).toBeVisible();
  await expect(page.getByText("Saved in this private preview. Not delivered to staff.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "View preview Garage" }).click();
  await expect(page.getByText("Saved in preview · Not delivered to staff", { exact: true })).toBeVisible();
});

test("saved listing persists, and an unrelated browser session cannot read account records", async ({ page, browser }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: "Save 2021 Toyota RAV4", exact: true }).first().click();
  await page.goto("/garage/saved");
  await expect(page.getByRole("heading", { name: "2021 Toyota RAV4", exact: true })).toBeVisible();
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto("http://127.0.0.1:3100/garage/saved");
  await expect(otherPage.getByRole("heading", { name: "No saved vehicles yet" })).toBeVisible();
  await otherContext.close();
});

test("personal vehicle carries into service without a new scan and grants no history", async ({ page }) => {
  await page.goto("/garage/add");
  await page.getByRole("spinbutton", { name: "Year", exact: true }).fill("2020");
  await page.getByRole("textbox", { name: "Make", exact: true }).fill("Example");
  await page.getByRole("textbox", { name: "Model", exact: true }).fill("Owned vehicle");
  await page.getByRole("button", { name: "Review vehicle" }).click();
  await expect(page.getByText("Entered by you · No dealership records linked")).toBeVisible();
  await page.getByRole("link", { name: "Request Service", exact: true }).click();
  await expect(page.getByText("2020 Example Owned vehicle", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Describe what you notice" })).toBeVisible();
});

test("cross-origin preview mutations are denied", async ({ request }) => {
  const response = await request.post("/api/preview", { headers: { Origin: "https://other.example" }, data: { operation: "SAVE", key: "12345678-1234-1234-1234-123456789abc", value: "sample-rav4" } });
  expect(response.status()).toBe(403);
});
