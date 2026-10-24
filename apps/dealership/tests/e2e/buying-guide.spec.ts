import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const privateUrl = process.env.DEALERSHIP_PRIVATE_TEST_URL;
const publicUrl = process.env.DEALERSHIP_PUBLIC_TEST_URL;
const planQuery = "vehicle=sample-rav4&paymentPath=cash&trade=yes";

async function guide(page: Page) {
  await page.goto(`${privateUrl}/how-it-works?${planQuery}`);
  await expect(page.getByRole("heading", { name: "How buying works.", exact: true })).toBeVisible();
}
async function choose(page: Page, group: string, answer: string) {
  await page.getByRole("group", { name: group, exact: true }).getByLabel(answer, { exact: true }).check();
}

test("buying guide restores safe choices, supports reset and is accessible across screen sizes", async ({ page }) => {
  test.skip(!privateUrl, "Requires an isolated private preview.");
  await page.goto(`${privateUrl}/how-it-works`);
  await expect(page.getByRole("link", { name: "Prepare preview purchase request", exact: true })).toHaveCount(0);
  await page.getByLabel("Choose a vehicle", { exact: true }).selectOption("sample-rav4");
  await page.getByLabel("Cash purchase", { exact: true }).check();
  await page.getByLabel("I have a trade-in", { exact: true }).check();
  await expect(page).toHaveURL(/vehicle=sample-rav4/);
  await page.reload();
  await expect(page.getByLabel("Cash purchase", { exact: true })).toBeChecked();
  await expect(page.getByLabel("I have a trade-in", { exact: true })).toBeChecked();
  await expect(page.getByRole("complementary", { name: "Your buying plan summary" })).toContainText("Not created");
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  }
  await page.getByText("Does starting a request reserve the vehicle?", { exact: true }).click();
  await expect(page.getByText("No. A request, saved vehicle or payment estimate creates no hold.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Reset my plan", exact: true }).click();
  await expect(page.getByLabel("Choose a vehicle", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Help me choose", { exact: true })).toBeChecked();
  await expect(page.getByRole("link", { name: "Prepare preview purchase request", exact: true })).toHaveCount(0);
});

test("cash estimate uses the published sample price, ignores query prices and returns to the plan", async ({ page }) => {
  test.skip(!privateUrl, "Requires an isolated private preview.");
  await guide(page);
  await page.getByRole("link", { name: "Explore cash out-the-door estimate", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cash purchase", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Vehicle cash price ($)", { exact: true })).toHaveValue("18995.00");
  await expect(page.getByRole("heading", { name: "Estimated total due", exact: true })).toHaveCount(0);
  await page.goto(`${privateUrl}/finance?${planQuery}&from=buying-guide&price=1&amount=1&approved=1&returnTo=https://other.example`);
  await expect(page.getByLabel("Vehicle cash price ($)", { exact: true })).toHaveValue("18995.00");
  await page.getByRole("link", { name: "Back to my buying plan", exact: true }).click();
  await expect(page.getByLabel("Choose a vehicle", { exact: true })).toHaveValue("sample-rav4");
  await expect(page.getByLabel("I have a trade-in", { exact: true })).toBeChecked();
  expect(page.url()).not.toContain("other.example");
  expect(page.url()).not.toContain("approved");
});

test("purchase preparation carries preferences into the isolated preview receipt and Garage", async ({ page }) => {
  test.skip(!privateUrl, "Requires an isolated private preview.");
  await guide(page);
  await page.getByRole("link", { name: "Prepare preview purchase request", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Cash", exact: true })).toBeChecked();
  await expect(page.getByLabel("Have a trade-in?", { exact: false })).toHaveValue("yes");
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await page.getByLabel("Email address", { exact: true }).fill("sample@example.com");
  await page.getByRole("checkbox", { name: /private preview/ }).check();
  const pending = page.waitForRequest(request => request.url().endsWith("/api/preview") && request.method() === "POST");
  await page.getByRole("button", { name: "Save preview request", exact: true }).click();
  const body = (await pending).postDataJSON();
  expect(body.value).toMatchObject({ kind: "PURCHASE", vehicleId: "sample-rav4", details: { paymentPath: "cash", trade: "yes" } });
  expect(body.value.details).not.toHaveProperty("price");
  await expect(page.getByText("Saved in this private preview. Not delivered to staff.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "View preview Garage", exact: true }).click();
  await page.getByRole("link").filter({ has: page.getByText("PURCHASE", { exact: true }) }).click();
  await expect(page.getByRole("heading", { name: "Your purchase preparation.", exact: true })).toBeVisible();
  await expect(page.locator("dl")).toContainText("Cash purchase");
  await page.getByRole("link", { name: "Review my buying plan", exact: true }).click();
  await expect(page.getByLabel("Cash purchase", { exact: true })).toBeChecked();
});

test("trade appraisal keeps the current vehicle separate and returns to buying choices", async ({ page }) => {
  test.skip(!privateUrl, "Requires an isolated private preview.");
  await guide(page);
  await page.getByRole("link", { name: "Prepare a trade appraisal", exact: true }).click();
  await expect(page.getByText("This appraisal is for your current vehicle, not the vehicle you are considering buying.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Enter VIN or vehicle details" }).click();
  await expect(page.getByLabel("Year", { exact: true })).toHaveValue("");
  await page.getByLabel("Year", { exact: true }).fill("2003");
  await page.getByLabel("Make", { exact: true }).fill("Honda");
  await page.getByLabel("Model", { exact: true }).fill("Accord");
  await page.getByLabel("I have reviewed and confirmed these vehicle details.").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (const group of ["Exterior damage", "Interior condition", "Technology issues", "Engine issues", "Mechanical or electrical issues"]) await choose(page, group, "Not sure");
  for (const group of ["Windshield condition", "Has the vehicle been modified?", "Can the vehicle be driven safely?", "Overall condition"]) await choose(page, group, "Not sure");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Current mileage", { exact: true }).fill("100000");
  for (const group of ["Known accident history", "Has it been smoked in?", "Tires replaced in the past 12 months", "How many keys do you have?"]) await choose(page, group, "Not sure");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Trade toward a purchase", exact: true })).toBeChecked();
  await page.getByRole("link", { name: "Back to my buying plan", exact: true }).click();
  await expect(page.getByLabel("Choose a vehicle", { exact: true })).toHaveValue("sample-rav4");
});

test("question/test-drive paths and edited preferences keep a safe return to the guide", async ({ page }) => {
  test.skip(!privateUrl, "Requires an isolated private preview.");
  await guide(page);
  await page.getByRole("link", { name: "Ask about this vehicle", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Your question", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to my buying plan", exact: true }).click();
  await page.getByRole("link", { name: "Prepare test-drive request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Request a test drive", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to my buying plan", exact: true }).click();
  await page.getByRole("link", { name: "Prepare preview purchase request", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Cash", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "My bank or credit union", exact: true }).check();
  await page.getByLabel("Have a trade-in?", { exact: false }).selectOption("no");
  await page.getByRole("link", { name: "Back to my buying plan", exact: true }).click();
  await expect(page.getByLabel("My bank or credit union", { exact: true })).toBeChecked();
  await expect(page.getByLabel("No trade-in", { exact: true })).toBeChecked();
});

test("unavailable selections do not unlock purchase preparation", async ({ page }) => {
  test.skip(!privateUrl, "Requires an isolated private preview.");
  for (const vehicle of ["missing-vehicle", "sample-coming-soon"]) {
    await page.goto(`${privateUrl}/how-it-works?vehicle=${vehicle}&paymentPath=cash&trade=no`);
    await expect(page.getByText("That vehicle is missing, unavailable or no longer current.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Prepare preview purchase request", exact: true })).toHaveCount(0);
  }
  await page.goto(`${privateUrl}/purchase?vehicle=sample-coming-soon&from=buying-guide`);
  await expect(page.getByRole("heading", { name: "Purchase preparation is unavailable.", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save preview request", exact: true })).toHaveCount(0);
});

test("public guide does not substitute samples or enable finance and checkout", async ({ page, request }) => {
  test.skip(!publicUrl, "Requires an isolated public runtime.");
  await page.goto(`${publicUrl}/how-it-works?${planQuery}&preview=1`);
  await expect(page.getByText("No connected inventory is available for selection.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Prepare preview purchase request", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Explore cash out-the-door estimate", exact: true })).toHaveCount(0);
  await expect(page.locator('img[src*="sample-media"]')).toHaveCount(0);
  expect((await request.post(`${publicUrl}/api/preview`, { headers: { Origin: publicUrl! }, data: {} })).status()).toBe(503);
});
