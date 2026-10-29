import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const privateUrl = process.env.DEALERSHIP_PRIVATE_TEST_URL;
const publicUrl = process.env.DEALERSHIP_PUBLIC_TEST_URL;

test("private calculator validates assumptions and supports vehicle and budget estimates", async ({ page }) => {
  test.skip(!privateUrl, "Requires an isolated private sample preview.");
  await page.goto(`${privateUrl}/finance`);
  await expect(page.getByRole("region", { name: "Private payment calculator preview" })).toBeVisible();
  await page.goto(`${privateUrl}/budget`);
  const calculator = page.getByRole("region", { name: "Private payment calculator preview" });
  await expect(calculator).toBeVisible();
  await calculator.getByRole("button", { name: "Estimate a vehicle", exact: true }).click();
  await calculator.getByLabel("Vehicle cash price ($)", { exact: true }).fill("20000");
  await calculator.getByLabel("Down payment ($)", { exact: true }).fill("2500");
  await calculator.getByLabel("Loan term", { exact: true }).selectOption("66");
  await calculator.getByRole("button", { name: "Calculate estimated payment" }).click();
  await expect(calculator.getByRole("alert")).toContainText("Unknown fees cannot be treated as zero");
  await expect(calculator.getByText("Keep the whole cost in view")).toHaveCount(0);
  await calculator.getByLabel("Additional registration, plate & local charges ($)", { exact: true }).fill("0");
  await calculator.getByLabel("I have included all additional charges applicable to this example.", { exact: true }).check();
  await calculator.getByLabel("This is the standard Minnesota retail transfer scenario described above.", { exact: true }).check();
  await expect(calculator.getByText("Keep the whole cost in view")).toBeVisible();
  await expect(calculator.getByText("$19,263.00", { exact: true })).toBeVisible();
  await calculator.getByText("Show the calculation breakdown", { exact: true }).click();
  await expect(calculator.getByText("$1,375.00", { exact: true })).toBeVisible();
  await expect(calculator.getByText("66-month term", { exact: false })).toBeVisible();
  await calculator.getByLabel("Additional registration, plate & local charges ($)", { exact: true }).fill("");
  await expect(calculator.getByText("Keep the whole cost in view")).toHaveCount(0);
  await calculator.getByRole("button", { name: "Shop by budget", exact: true }).click();
  await calculator.getByLabel("Desired monthly budget ($)", { exact: true }).fill("400");
  await calculator.getByLabel("Additional registration, plate & local charges ($)", { exact: true }).fill("100");
  await calculator.getByRole("button", { name: "Find my estimated price range" }).click();
  await expect(calculator.getByText("Keep the whole cost in view")).toBeVisible();
  await expect(calculator.getByRole("link", { name: "Browse matching sample vehicles" })).toHaveAttribute("href", /^\/shop\?max=\d+\.\d{2}$/);
  await expect(calculator.getByText("not a quoted APR", { exact: false })).toBeVisible();
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('section[aria-label="Private payment calculator preview"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
  }
});

test("cash out-the-door estimates need no loan inputs and remove stale totals", async ({ page }) => {
  test.skip(!privateUrl, "Requires an isolated private sample preview.");
  await page.goto(`${privateUrl}/finance`);
  const calculator = page.getByRole("region", { name: "Private payment calculator preview" });
  await calculator.getByRole("button", { name: "Cash purchase", exact: true }).click();
  await expect(calculator.getByLabel("Loan term", { exact: true })).toHaveCount(0);
  await expect(calculator.getByLabel("Down payment ($)", { exact: true })).toHaveCount(0);
  await expect(calculator.getByText("not a quoted APR", { exact: false })).toHaveCount(0);
  await calculator.getByLabel("Vehicle cash price ($)", { exact: true }).fill("20000");
  await calculator.getByRole("button", { name: "Calculate cash total", exact: true }).click();
  await expect(calculator.getByRole("alert")).toContainText("Unknown fees");
  await expect(calculator.getByRole("heading", { name: "Estimated total due", exact: true })).toHaveCount(0);
  await calculator.getByLabel("Additional registration, plate & local charges ($)", { exact: true }).fill("200");
  await calculator.getByLabel("I have included all additional charges applicable to this example.", { exact: true }).check();
  await calculator.getByLabel("This is the standard Minnesota retail transfer scenario described above.", { exact: true }).check();
  await expect(calculator.getByRole("status")).toContainText("$21,961.00");
  await expect(calculator.getByRole("heading", { name: "Estimated total due", exact: true })).toBeVisible();
  await calculator.getByText("View cash breakdown", { exact: true }).click();
  await expect(calculator.getByText("$1,375.00", { exact: true })).toBeVisible();
  await expect(calculator.getByText("Recorded lien", { exact: true })).toHaveCount(0);
  await expect(calculator.getByText("Estimated amount financed", { exact: true })).toHaveCount(0);
  await expect(calculator.getByText("Estimate—not a final purchase agreement.", { exact: true })).toBeVisible();
  await calculator.getByLabel("Vehicle cash price ($)", { exact: true }).fill("10000");
  await expect(calculator.getByRole("status")).toContainText("$11,273.50");
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('section[aria-label="Private payment calculator preview"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
  }
  await calculator.getByLabel("Additional registration, plate & local charges ($)", { exact: true }).fill("");
  await expect(calculator.getByRole("heading", { name: "Estimated total due", exact: true })).toHaveCount(0);
  await expect(calculator.getByRole("status")).not.toContainText("$11,273.50");
  await calculator.getByRole("button", { name: "Estimate a vehicle", exact: true }).click();
  await expect(calculator.getByLabel("Loan term", { exact: true })).toBeVisible();
  await expect(calculator.getByRole("heading", { name: "Estimated total due", exact: true })).toHaveCount(0);
});

test("public mode cannot expose the private calculator through a preview query", async ({ page }) => {
  test.skip(!publicUrl, "Requires an isolated sample-free public runtime.");
  await page.goto(`${publicUrl}/finance?preview=1`);
  await expect(page.getByRole("region", { name: "Private payment calculator preview" })).toHaveCount(0);
  await page.goto(`${publicUrl}/budget?preview=1`);
  await expect(page.getByRole("region", { name: "Private payment calculator preview" })).toHaveCount(0);
  await expect(page.getByText("Payment estimates are not configured yet", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Find my estimated price range" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cash purchase", exact: true })).toHaveCount(0);
});
