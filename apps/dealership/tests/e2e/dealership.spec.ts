import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("approved shell works at desktop and mobile widths without horizontal overflow", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Find your next vehicle." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Shop vehicles" })).toBeVisible();
    const headerLogo = page.locator(".site-header").getByRole("img", { name: "Time Motor Sales", exact: true });
    await expect(headerLogo).toBeVisible();
    await expect(headerLogo).toHaveAttribute("src", "/brand/time-motor-sales-horizontal.png");
    expect(await headerLogo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator(".site-footer").getByRole("img", { name: "Time Motor Sales", exact: true })).toBeVisible();
    expect(await page.locator(".brand-logo").evaluateAll(images => images.every(image => Math.abs(image.getBoundingClientRect().width / image.getBoundingClientRect().height - 1200 / 225) < .05))).toBe(true);
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
  await page.getByRole("button", { name: "Continue to visit preferences", exact: true }).click();
  await page.getByRole("button", { name: "Review request" }).click();
  await expect(page.locator("main")).not.toContainText("paymentPath");
  await expect(page.locator("main")).not.toContainText("intent");
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
  await page.getByRole("textbox", { name: "Sample email address", exact: true }).fill("sample@example.com");
  await page.getByRole("button", { name: "Continue — save in this browser", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/garage/saved");
  await expect(page.getByRole("heading", { name: "2021 Toyota RAV4", exact: true })).toBeVisible();
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto(new URL("/garage/saved", page.url()).href);
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
  await page.getByRole("button", { name: "Review vehicle", exact: true }).click();
  await expect(page.getByText("2020 Example Owned vehicle", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Describe what you notice" })).toBeVisible();
});

test("cross-origin preview mutations are denied", async ({ request }) => {
  const response = await request.post("/api/preview", { headers: { Origin: "https://other.example" }, data: { operation: "SAVE", key: "12345678-1234-1234-1234-123456789abc", value: "sample-rav4" } });
  expect(response.status()).toBe(403);
});

test("vehicle discovery is aligned and accessible at desktop, tablet and phone widths", async ({ page }) => {
  for (const width of [1600, 1024, 820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/shop");
    await expect(page.getByRole("textbox", { name: "Search inventory", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/search-${width}.png`, fullPage: true });
    if (width === 390 || width === 1600) {
      const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(accessibility.violations).toEqual([]);
    }
  }
});

test("style discovery supports keyboard dismissal and honest empty results", async ({ page }) => {
  await page.goto("/shop?max=20000&sort=price-low");
  const opener = page.getByRole("textbox", { name: "Search inventory", exact: true });
  await opener.click();
  const dialog = page.getByRole("region", { name: "Vehicle search options" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Electric 0 sample vehicles/ })).toBeVisible();
  await page.screenshot({ path: "test-results/search-vehicle-styles.png", fullPage: true });
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByRole("button", { name: /Electric 0 sample vehicles/ }).click();
  await expect(page).toHaveURL(/max=20000.*sort=price-low.*fuel=Electric/);
  await expect(page.getByRole("heading", { name: "No matching vehicles" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Fuel: Electric" }).click();
  await expect(page.getByRole("link", { name: "View vehicle", exact: true })).toHaveCount(1);
});

test("search field and button open inline options without losing draft text or filters", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shop?max=20000&sort=price-low");
    const search = page.getByRole("textbox", { name: "Search inventory", exact: true });
    const dropdown = page.getByRole("region", { name: "Vehicle search options" });
    const button = page.getByRole("button", { name: "Search", exact: true });
    await button.click();
    await expect(dropdown).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(page).toHaveURL(/\/shop\?max=20000&sort=price-low$/);
    await search.fill("Toyota AWD");
    await search.press("Escape");
    await expect(dropdown).not.toBeVisible();
    await expect(search).toBeFocused();
    await search.press("ArrowDown");
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByRole("button", { name: "Toyota", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dropdown).not.toBeVisible();
    await search.click();
    await page.getByRole("heading", { name: "Find your next vehicle." }).click();
    await expect(dropdown).not.toBeVisible();
    await expect(search).toHaveValue("Toyota AWD");
    await search.click();
    await page.screenshot({ path: `test-results/search-dropdown-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await search.press("Enter");
    await expect(page).toHaveURL(/max=20000.*sort=price-low.*q=Toyota\+AWD/);
    await expect(dropdown).not.toBeVisible();
    await expect(page.getByRole("link", { name: "View vehicle", exact: true })).toHaveCount(1);
  }
});

test("mobile filters preserve keyword and sorting through details and browser back", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop?q=Toyota+AWD&sort=price-low");
  await page.getByRole("button", { name: /^Filters/ }).click();
  const dialog = page.getByRole("dialog", { name: "Refine your search" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Maximum cash price", { exact: true }).fill("20000");
  await expect(page).toHaveURL(/max=20000/);
  await dialog.getByRole("button", { name: "Close filters", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/q=Toyota\+AWD.*sort=price-low.*max=20000/);
  await page.getByRole("link", { name: "View vehicle", exact: true }).click();
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(page).toHaveURL(/q=Toyota\+AWD.*sort=price-low.*max=20000/);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(dialog.getByLabel("Maximum cash price", { exact: true })).toHaveValue("20000");
  await page.keyboard.press("Escape");
});

test("expanded sidebar exposes the requested groups and keeps unknown specifications honest", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/shop?q=Toyota&sort=price-low");
  const sidebar = page.getByRole("complementary", { name: "Inventory filters" });
  for (const title of ["Make & model", "Body type", "Year & mileage", "Delivery & deals", "Fuel type", "MPG", "Features", "Exterior color", "Interior color", "Seating capacity", "Drivetrain", "Transmission", "Cylinders"]) {
    await expect(sidebar.locator("summary").filter({ hasText: new RegExp(`^${title.replace(/[&]/g, "\\&")}$`) })).toHaveCount(1);
  }
  await sidebar.locator("summary").filter({ hasText: /^Features$/ }).click();
  await expect(sidebar.getByRole("checkbox", { name: /^Apple CarPlay/ })).toBeVisible();
  await sidebar.locator("summary").filter({ hasText: /^MPG$/ }).click();
  await sidebar.getByLabel("Minimum combined MPG", { exact: true }).fill("30");
  await expect(sidebar.getByRole("status")).toHaveText("0 matching vehicles");
  await expect(page).toHaveURL(/q=Toyota.*sort=price-low.*mpg=30/);
  await expect(page.getByRole("heading", { name: "No matching vehicles" })).toBeVisible();
  await sidebar.getByRole("button", { name: "Reset mpg", exact: true }).click();
  await expect(sidebar.getByRole("status")).toHaveText("2 matching vehicles");
  await expect(page.getByRole("link", { name: "View vehicle", exact: true })).toHaveCount(2);
});

test("industry makes and models remain selectable without stock and survive option searches", async ({ page }) => {
  await page.route("**/api/vehicle-catalog**", async route => {
    const params = new URL(route.request().url()).searchParams;
    await route.fulfill({ json: params.has("makeId") ? { models: [{ makeId: 474, name: "Civic" }, { makeId: 474, name: "Accord" }, { makeId: 448, name: "RAV4" }] } : { makes: [{ id: 474, name: "HONDA" }, { id: 448, name: "TOYOTA" }, { id: 452, name: "BMW" }] } });
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/shop?q=AWD&sort=price-low");
    if (width === 390) await page.getByRole("button", { name: /^Filters/ }).click();
    const filters = width === 390 ? page.getByRole("dialog", { name: "Refine your search" }) : page.getByRole("complementary", { name: "Inventory filters" });
    await filters.locator("summary").filter({ hasText: /^Make & model$/ }).click();
    await expect(filters.getByRole("checkbox", { name: /^HONDA/ })).toBeVisible();
    await filters.getByRole("searchbox", { name: "Find a make", exact: true }).fill("Honda");
    await filters.getByRole("checkbox", { name: /^HONDA/ }).check();
    await expect(filters.getByRole("checkbox", { name: /^Civic/ })).toBeVisible();
    await filters.getByRole("checkbox", { name: /^Civic/ }).check();
    await filters.getByRole("searchbox", { name: "Find a make", exact: true }).fill("Toyota");
    await filters.getByRole("checkbox", { name: /^TOYOTA|^Toyota/ }).check();
    await expect(page).toHaveURL(url => url.searchParams.getAll("make").length === 2 && url.searchParams.get("model") === "Civic");
    if (width === 390) await filters.getByRole("button", { name: "Close filters", exact: true }).click();
    expect(new URL(page.url()).searchParams.get("q")).toBe("AWD");
    expect(new URL(page.url()).searchParams.get("sort")).toBe("price-low");
    await expect(page.getByRole("heading", { name: "No matching vehicles" })).toBeVisible();
  }
});

test("multi-select choices survive apply and removing one chip keeps other selections", async ({ page }) => {
  await page.goto("/shop?make=Toyota&make=Honda&q=AWD&sort=price-low");
  await page.getByRole("button", { name: "Remove Make: Honda", exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.getAll("make").length === 1 && url.searchParams.get("make") === "Toyota");
  expect(new URL(page.url()).searchParams.getAll("make")).toEqual(["Toyota"]);
  await expect(page.getByRole("textbox", { name: "Search inventory", exact: true })).toHaveValue("AWD");
  const sidebar = page.getByRole("complementary", { name: "Inventory filters" });
  await expect(sidebar.getByRole("checkbox", { name: /^Toyota/ })).toBeChecked();
  await sidebar.getByRole("switch", { name: /Available now/ }).check();
  await expect(page).toHaveURL(/available=1/);
  expect(new URL(page.url()).searchParams.getAll("make")).toEqual(["Toyota"]);
  expect(new URL(page.url()).searchParams.get("sort")).toBe("price-low");
});

test("automatic filters preserve expanded panels, scroll and browser history without an apply footer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/vehicle-catalog**", route => route.fulfill({ json: { makes: Array.from({ length: 250 }, (_, index) => ({ id: index + 1000, name: `Example make ${String(index).padStart(3, "0")}` })) } }));
  await page.goto("/shop?q=Toyota&sort=price-low");
  const sidebar = page.getByRole("complementary", { name: "Inventory filters" });
  await expect(page.getByRole("button", { name: "Apply filters", exact: true })).toHaveCount(0);
  const makeSummary = sidebar.locator("summary").filter({ hasText: /^Make & model$/ });
  await makeSummary.click();
  await expect(sidebar.getByRole("checkbox", { name: /^Example make 249/ })).toHaveCount(1);
  expect(await sidebar.locator(".facet-options").first().evaluate(element => getComputedStyle(element).maxHeight)).toBe("none");
  expect(await sidebar.evaluate(element => element.scrollHeight > element.clientHeight * 3)).toBe(true);
  await sidebar.locator("summary").filter({ hasText: /^Transmission$/ }).click();
  const automatic = sidebar.getByRole("checkbox", { name: /^Automatic\b/ });
  await automatic.scrollIntoViewIfNeeded();
  const before = await sidebar.evaluate(element => element.scrollTop);
  await automatic.check();
  await expect(page).toHaveURL(/transmission=Automatic/);
  expect(Math.abs(await sidebar.evaluate(element => element.scrollTop) - before)).toBeLessThan(10);
  await automatic.uncheck();
  await expect(page).toHaveURL(url => !url.searchParams.has("transmission"));
  await expect(automatic).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/transmission=Automatic/);
  await expect(automatic).toBeChecked();
  expect(new URL(page.url()).searchParams.get("q")).toBe("Toyota");
});

test("clear all cancels a pending numeric update even when the URL is already unfiltered", async ({ page }) => {
  await page.goto("/shop");
  await page.clock.install();
  const sidebar = page.getByRole("complementary", { name: "Inventory filters" });
  const maximum = sidebar.getByLabel("Maximum cash price", { exact: true });
  await maximum.fill("20000");
  await sidebar.getByRole("button", { name: "Clear all filters", exact: true }).click();
  await page.clock.fastForward(600);
  await expect(maximum).toHaveValue("");
  expect(new URL(page.url()).searchParams.has("max")).toBe(false);
  await expect(page.getByRole("link", { name: "View vehicle", exact: true })).toHaveCount(23);
});
