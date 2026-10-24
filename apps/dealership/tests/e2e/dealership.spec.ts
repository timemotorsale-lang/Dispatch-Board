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
  await dialog.getByLabel("Maximum", { exact: true }).fill("20000");
  await dialog.getByRole("button", { name: "Apply filters" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/q=Toyota\+AWD.*sort=price-low.*max=20000/);
  await page.getByRole("link", { name: "View vehicle", exact: true }).click();
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(page).toHaveURL(/q=Toyota\+AWD.*sort=price-low.*max=20000/);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(dialog.getByLabel("Maximum", { exact: true })).toHaveValue("20000");
  await page.keyboard.press("Escape");
});
