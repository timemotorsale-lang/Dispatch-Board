import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

const privateUrl = process.env.DEALERSHIP_PRIVATE_TEST_URL;
const publicUrl = process.env.DEALERSHIP_PUBLIC_TEST_URL;
const groups = ["Exterior damage", "Interior condition", "Technology issues", "Engine issues", "Mechanical or electrical issues"];

async function choose(page: Page, group: string, value: string) {
  await page.getByRole("group", { name: group, exact: true }).getByLabel(value, { exact: true }).check();
}
async function startManual(page: Page) {
  await page.goto(`${privateUrl}/sell`);
  await page.getByRole("button", { name: "Enter VIN or vehicle details" }).click();
  await page.getByLabel("Year", { exact: true }).fill("2003");
  await page.getByLabel("Make", { exact: true }).fill("Honda");
  await page.getByLabel("Model", { exact: true }).fill("Accord");
  await page.getByLabel("I have reviewed and confirmed these vehicle details.").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function condition(page: Page) {
  for (const group of groups) await choose(page, group, "None known");
  for (const group of ["Windshield condition", "Has the vehicle been modified?", "Can the vehicle be driven safely?", "Overall condition"]) await choose(page, group, "Not sure");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function history(page: Page) {
  await page.getByLabel("Current mileage", { exact: true }).fill("170000");
  for (const group of ["Known accident history", "Has it been smoked in?", "Tires replaced in the past 12 months"]) await choose(page, group, "Not sure");
  await choose(page, "How many keys do you have?", "0");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function accessibility(page: Page) {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  }
}

test("guided VIN appraisal keeps a local photo, preserves answers and saves no fake offer", async ({ page }) => {
  test.skip(!privateUrl, "Requires an isolated private sample preview.");
  await page.route("**/api/vin-decode", async route => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ vin: "1HGCM82633A004352" });
    await route.fulfill({ json: { vehicle: { year: "2003", make: "Honda", model: "Accord", trim: "EX", transmission: "Automatic", drivetrain: "FWD", engineSpec: "2.4 L · 4 cylinders" }, partial: false, image: null, source: "NHTSA vPIC" } });
  });
  await page.goto(`${privateUrl}/sell`);
  await accessibility(page);
  await page.getByRole("button", { name: "Enter VIN or vehicle details" }).click();
  await page.getByLabel("VIN (optional for manual entry)", { exact: true }).fill("1HGCM82633A004352");
  await page.getByRole("button", { name: "Find vehicle details", exact: true }).click();
  await expect(page.getByLabel("Make", { exact: true })).toHaveValue("Honda");
  await expect(page.getByLabel("Exterior color (optional)", { exact: true })).toHaveValue("");
  await expect(page.getByRole("complementary", { name: "Appraisal vehicle summary" })).toContainText("licensed photo catalog not connected");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Confirm that the vehicle details are correct." })).toBeVisible();
  await page.getByLabel("I have reviewed and confirmed these vehicle details.").check();
  await accessibility(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await choose(page, "Exterior damage", "Rust");
  await choose(page, "Exterior damage", "None known");
  await expect(page.getByLabel("Rust", { exact: true })).not.toBeChecked();
  await accessibility(page);
  await condition(page);
  await accessibility(page);
  await history(page);
  await page.getByLabel("Choose a vehicle photo", { exact: true }).setInputFiles({ name: "invalid.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await expect(page.getByText("Choose a JPEG, PNG or WebP photo up to 5 MB. HEIC and SVG are not supported.", { exact: true })).toBeVisible();
  await page.getByLabel("Choose a vehicle photo", { exact: true }).setInputFiles(path.resolve("apps/dealership/fixtures/media/sample-rav4.png"));
  const image = page.getByRole("img", { name: "Customer-selected vehicle photo; not verified", exact: true });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", /^blob:/);
  await expect(page.getByText("Your selected photo · this tab only; not uploaded", { exact: true })).toBeVisible();
  await accessibility(page);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Current mileage", { exact: true })).toHaveValue("170000");
  await expect(image).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Vehicle ZIP code", { exact: true }).fill("55407");
  await choose(page, "Is there a loan or lease?", "Neither");
  await choose(page, "What would you like to do?", "Trade toward a purchase");
  await choose(page, "How would you prefer a response?", "Email");
  await accessibility(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await accessibility(page);
  await page.getByLabel("Email address (required)", { exact: true }).fill("sample@example.com");
  await page.getByLabel("I understand this is a private preview and will use sample information only.").check();
  const submitted = page.waitForRequest(request => request.url().endsWith("/api/preview") && request.method() === "POST");
  await page.getByRole("button", { name: "Save preview appraisal request", exact: true }).click();
  const body = (await submitted).postDataJSON();
  expect(JSON.stringify(body)).not.toContain("blob:");
  expect(body.value.details.keys).toBe("0");
  expect(body.value.details.exterior).toBe("None known");
  await expect(page.getByRole("heading", { name: "Appraisal preview saved." })).toBeVisible();
  await expect(page.getByText("Saved in this private preview. Not delivered to staff.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "View preview My Garage", exact: true }).click();
  await expect(page.getByText("Saved in preview · Not delivered to staff", { exact: true })).toBeVisible();
  await page.getByRole("link").filter({ has: page.getByText("SELL", { exact: true }) }).click();
  await expect(page.getByRole("heading", { name: "Your appraisal preview.", exact: true })).toBeVisible();
  await expect(page.getByText("Signing & handoff", { exact: true })).toHaveCount(0);
  await expect(page.locator("dl")).toContainText("Trade toward a purchase");
});

test("manual appraisal works without a VIN service or a vehicle photograph", async ({ page }) => {
  test.skip(!privateUrl, "Requires an isolated private sample preview.");
  await page.goto(`${privateUrl}/sell`);
  await page.getByRole("button", { name: "Enter VIN or vehicle details" }).click();
  await page.getByLabel("VIN (optional for manual entry)", { exact: true }).fill("1HGCM82633A004352");
  await page.route("**/api/vin-decode", route => route.fulfill({ status: 503, json: { error: "Lookup unavailable. Enter details manually." } }));
  await page.getByRole("button", { name: "Find vehicle details", exact: true }).click();
  await expect(page.getByText("Lookup unavailable. Enter details manually.", { exact: true })).toBeVisible();
  await startManual(page);
  await condition(page);
  await history(page);
  await expect(page.getByRole("img", { name: /vehicle photo/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your plans", exact: true })).toBeVisible();
});

test("public mode denies VIN decoding and appraisal persistence", async ({ page, request }) => {
  test.skip(!publicUrl, "Requires an isolated public-mode runtime.");
  await page.goto(`${publicUrl}/sell`);
  await page.getByRole("button", { name: "Enter VIN or vehicle details" }).click();
  await expect(page.getByRole("button", { name: "Find vehicle details", exact: true })).toBeDisabled();
  const result = await request.post(`${publicUrl}/api/vin-decode`, { headers: { Origin: publicUrl! }, data: { vin: "1HGCM82633A004352" } });
  expect(result.status()).toBe(503);
  expect((await request.post(`${publicUrl}/api/preview`, { headers: { Origin: publicUrl! }, data: {} })).status()).toBe(503);
});
