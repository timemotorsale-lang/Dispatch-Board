import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyServiceConcern } from "../../src/lib/service-intake";

const privateUrl = process.env.DEALERSHIP_PRIVATE_TEST_URL;
const publicUrl = process.env.DEALERSHIP_PUBLIC_TEST_URL;
async function vehicle(page: Page, drivingConcern = "Not sure") {
  await page.goto(`${privateUrl}/service`);
  await page.getByRole("combobox", { name: /Any concern about driving/ }).selectOption(drivingConcern);
  await page.getByLabel("Year", { exact: true }).fill("2021");
  await page.getByLabel("Make", { exact: true }).fill("Example");
  await page.getByLabel("Model", { exact: true }).fill("Service test");
  await page.getByRole("button", { name: "Review vehicle", exact: true }).click();
}
test("service request preserves edits and saves structured concerns without authorizing work", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  await vehicle(page, "Not drivable");
  await page.getByRole("combobox", { name: "Concern area", exact: true }).selectOption("Brakes");
  await page.getByLabel("Describe what you notice", { exact: true }).fill("Synthetic sound when stopping.");
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await page.getByRole("combobox", { name: /Preferred response method/ }).selectOption("Phone call");
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await page.getByRole("button", { name: "Edit vehicle", exact: true }).click();
  await expect(page.getByLabel("Make", { exact: true })).toHaveValue("Example");
  await page.getByRole("button", { name: "Review vehicle", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Concern area", exact: true })).toHaveValue("Brakes");
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await page.getByLabel("Phone number", { exact: true }).fill("612-555-0142");
  await page.getByRole("checkbox", { name: /private preview/ }).check();
  const request = page.waitForRequest(value => value.url().endsWith("/api/preview") && value.method() === "POST");
  await page.getByRole("button", { name: "Save preview request", exact: true }).click();
  expect((await request).postDataJSON().value).toMatchObject({ kind: "SERVICE", details: { serviceVersion: "2", categories: "Brakes", drivability: "Not drivable", contactMethod: "Phone call" } });
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
  await page.getByRole("combobox", { name: "Concern area", exact: true }).selectOption("Other / not sure");
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await page.getByLabel("I'm flexible — contact me", { exact: true }).uncheck();
  await page.getByLabel("Preferred date", { exact: true }).fill("2027-01-20");
  await page.getByLabel("Preferred time or alternative", { exact: true }).fill("Morning");
  await page.getByLabel("I'm flexible — contact me", { exact: true }).check();
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await expect(page.locator("main")).not.toContainText("2027-01-20");
  await expect(page.locator("main")).not.toContainText("Morning");
});
test("VIN lookup failure keeps manual entry available", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  await page.route("**/api/vin-decode", route => route.fulfill({ status: 503, json: { error: "Test lookup unavailable. Continue manually." } }));
  await page.goto(`${privateUrl}/service`);
  await page.getByRole("radio", { name: "Scan or enter VIN", exact: true }).check();
  await page.getByRole("textbox", { name: "VIN (optional for manual entry)", exact: true }).fill("1HGCM82633A004352");
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
  test.setTimeout(60000);
  await page.goto(`${privateUrl}/service`);
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.screenshot({ path: "test-results/service-intake-vehicle-mobile.png", fullPage: true });
  await vehicle(page);
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  }
  await page.getByRole("combobox", { name: "Concern area", exact: true }).selectOption("Brakes");
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
  await page.getByRole("combobox", { name: "Concern area", exact: true }).selectOption("Brakes");
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

test("structured intake keeps separate concerns, flags advisor reviews and saves a truthful receipt", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${privateUrl}/service`);
  await page.screenshot({ path: "test-results/service-intake-vehicle-desktop.png", fullPage: true });
  await page.getByRole("combobox", { name: "Any concern about driving?", exact: true }).selectOption("Not drivable");
  await expect(page.getByText("Do not drive a vehicle you believe is unsafe.", { exact: false })).toBeVisible();
  await page.getByLabel("Year", { exact: true }).fill("2021");
  await page.getByLabel("Make", { exact: true }).fill("Example");
  await page.getByLabel("Model", { exact: true }).fill("Review vehicle");
  await page.getByLabel("I don't know the mileage", { exact: true }).check();
  await page.getByRole("combobox", { name: "Odometer units", exact: true }).selectOption("kilometers");
  await page.getByRole("button", { name: "Review vehicle", exact: true }).click();
  await page.getByRole("combobox", { name: "Concern area", exact: true }).selectOption("Brakes");
  await page.getByLabel("Describe what you notice", { exact: true }).fill("Grinding when stopping. Sample details only.");
  await page.getByText("Add details about when it happens (optional)", { exact: true }).click();
  await page.getByRole("combobox", { name: "When did it start?", exact: true }).selectOption("This week");
  await page.getByRole("combobox", { name: "How often?", exact: true }).selectOption("Sometimes");
  await page.getByRole("combobox", { name: "When does it happen?", exact: true }).selectOption("Braking");
  await page.getByRole("combobox", { name: "Could this relate to a previous repair?", exact: true }).selectOption("Yes");
  await page.getByLabel("Previous work (optional)", { exact: true }).fill("Synthetic brake service last month.");
  await page.getByRole("button", { name: "Add another concern", exact: true }).click();
  await page.getByRole("combobox", { name: "Concern area — concern 2", exact: true }).selectOption("Electrical / battery");
  await page.getByLabel("Describe what you notice — concern 2", { exact: true }).fill("Slow starting in the morning.");
  await page.getByRole("button", { name: "Make concern 2 the main concern", exact: true }).click();
  await page.screenshot({ path: "test-results/service-intake-concerns-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/service-intake-concerns-mobile.png", fullPage: true });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await expect(page.getByRole("option", { name: "Wait if available", exact: true })).toHaveCount(0);
  await page.getByText("Contact role, coverage and access preferences (optional)", { exact: true }).click();
  await page.getByRole("combobox", { name: "I am requesting as", exact: true }).selectOption("Fleet / company contact");
  await page.getByRole("combobox", { name: "Warranty or service contract", exact: true }).selectOption("Warranty / service contract review requested");
  await page.getByRole("combobox", { name: "Transportation preference", exact: true }).selectOption("Discuss transportation options");
  await page.getByLabel("Communication or access preferences (optional)", { exact: true }).fill("Sample: prefer email and step-free access.");
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await page.getByText("Advisor handoff preview", { exact: true }).click();
  await expect(page.getByText("Staff must verify the authorized approver", { exact: true })).toBeVisible();
  await expect(page.getByText("Staff must verify coverage", { exact: true })).toBeVisible();
  await page.getByLabel("Email address", { exact: true }).fill("review@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/service-intake-review-desktop.png", fullPage: true });
  await page.getByRole("checkbox", { name: /private preview/ }).check();
  await page.getByRole("button", { name: "Save preview request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Request saved.", exact: true })).toBeVisible();
  const response = await page.request.get(`${privateUrl}/api/preview`);
  const result = await response.json();
  const saved = result.records.find((record: { data: { kind: string } }) => record.data.kind === "SERVICE");
  expect(JSON.parse(saved.data.details.concerns)).toMatchObject([{ category: "Brakes", primary: false }, { category: "Electrical / battery", primary: true }]);
  expect(saved.data.serviceHandoff).toMatchObject({ concernCount: 2, relatedRepairReview: true, coverageReview: true, authorityReview: true, delivery: "NOT_CONNECTED", appointment: "NOT_BOOKED", repairAuthorization: "NOT_GRANTED" });
  await page.screenshot({ path: "test-results/service-intake-receipt-desktop.png", fullPage: true });
});

test("removing the main concern promotes a remaining concern and preserves edits", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  await vehicle(page, "No known driving concern");
  await page.getByRole("combobox", { name: "Concern area", exact: true }).selectOption("Brakes");
  await page.getByRole("button", { name: "Add another concern", exact: true }).click();
  await page.getByRole("combobox", { name: "Concern area — concern 2", exact: true }).selectOption("Tires / wheels");
  await page.getByRole("button", { name: "Remove concern 1", exact: true }).click();
  await expect(page.getByRole("group", { name: "Concern 1 · Main concern", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Concern area", exact: true })).toHaveValue("Tires / wheels");
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await page.getByRole("combobox", { name: "Arrival preference", exact: true }).selectOption("Wait if available");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("combobox", { name: "Any concern about driving?", exact: true }).selectOption("Not sure");
  await page.getByRole("button", { name: "Review vehicle", exact: true }).click();
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Arrival preference", exact: true })).toHaveValue("Discuss with an advisor");
  await expect(page.getByRole("option", { name: "Wait if available", exact: true })).toHaveCount(0);
});

test("manual entry cancels a pending VIN lookup and clears its hidden value", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  let releaseLookup: () => void = () => {};
  const released = new Promise<void>(resolve => { releaseLookup = resolve; });
  await page.route("**/api/vin-decode", async route => {
    await released;
    await route.fulfill({ json: { vehicle: { year: "2003", make: "Honda", model: "Accord" } } }).catch(() => {});
  });
  await page.goto(`${privateUrl}/service`);
  await page.getByRole("radio", { name: "Scan or enter VIN", exact: true }).check();
  await page.getByRole("textbox", { name: "VIN (optional for manual entry)", exact: true }).fill("1HGCM82633A004352");
  const lookupStarted = page.waitForRequest(request => request.url().endsWith("/api/vin-decode"));
  await page.getByRole("button", { name: "Look up VIN", exact: true }).click();
  await lookupStarted;
  await page.getByRole("radio", { name: "Enter vehicle details", exact: true }).check();
  await page.getByLabel("Year", { exact: true }).fill("2020");
  await page.getByLabel("Make", { exact: true }).fill("Example");
  await page.getByLabel("Model", { exact: true }).fill("Manual entry");
  releaseLookup();
  await page.getByRole("button", { name: "Review vehicle", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Service request summary" })).toContainText("2020 Example Manual entry");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("radio", { name: "Scan or enter VIN", exact: true }).check();
  await expect(page.getByRole("textbox", { name: "VIN (optional for manual entry)", exact: true })).toHaveValue("");
});

test("concern entry is bounded and each editing action preserves one main concern", async ({ page }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  await vehicle(page);
  await page.getByRole("combobox", { name: "Concern area", exact: true }).selectOption("Other / not sure");
  for (let count = 2; count <= 5; count += 1) {
    await page.getByRole("button", { name: "Add another concern", exact: true }).click();
    await page.getByRole("combobox", { name: `Concern area — concern ${count}`, exact: true }).selectOption("Other / not sure");
  }
  await expect(page.getByRole("button", { name: "Add another concern", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Make concern 5 the main concern", exact: true }).click();
  await page.getByRole("button", { name: "Remove concern 5", exact: true }).click();
  await expect(page.getByRole("group", { name: "Concern 1 · Main concern", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add another concern", exact: true })).toBeEnabled();
});

test("bounded multi-language concerns fit the intake API and oversized bodies are rejected", async ({ request }) => {
  test.skip(!privateUrl, "Requires isolated private runtime.");
  const concerns = Array.from({ length: 5 }, (_, index) => ({ ...emptyServiceConcern(index === 0), category: "Brakes", description: "測".repeat(600), warningMessage: "測".repeat(150), previousRepair: "Yes", previousWork: "測".repeat(250) }));
  const payload = { operation: "REQUEST", key: crypto.randomUUID(), value: { kind: "SERVICE", vehicleId: "", name: "Sample", email: "sample@example.com", phone: "", notes: "測".repeat(2500), details: { serviceVersion: "2", year: "2021", make: "Example", model: "Synthetic", vin: "", mileage: "", mileageUnit: "miles", concerns: JSON.stringify(concerns), drivability: "Not sure", flexible: "yes", date: "", alternateDate: "", window: "", contactMethod: "Either", visitType: "Discuss with an advisor", requesterRole: "Owner / personal vehicle", coverage: "Not sure", transport: "No assistance requested", accommodations: "" } } };
  expect(Buffer.byteLength(JSON.stringify(payload))).toBeGreaterThan(16000);
  const response = await request.post(`${privateUrl}/api/preview`, { headers: { Origin: privateUrl! }, data: payload });
  expect(response.status()).toBe(200);
  const oversized = await request.post(`${privateUrl}/api/preview`, { headers: { Origin: privateUrl! }, data: { extra: "x".repeat(48001) } });
  expect(oversized.status()).toBe(413);
});
