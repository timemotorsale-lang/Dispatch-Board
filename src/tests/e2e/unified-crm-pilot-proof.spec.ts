import { expect, test, type Page } from "@playwright/test";

const managerEmail = "morgan.manager@local.test";
const password = "dispatch123!";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(managerEmail);
  await page.getByLabel("Password").fill(password);

  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  const response = await loginResponse;

  expect(response.ok()).toBe(true);
  await page.goto("/crm");
  await expect(page.getByText("Unified CRM").first()).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function expectCrmMainContent(page: Page) {
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.getByText("Loading your CRM workspace")).toHaveCount(0, { timeout: 15_000 });
  const mainText = await page.locator("main").first().innerText();

  expect(mainText).toMatch(/crm|customer|opportunity|quote|pipeline|conversation|insight|more/i);
  await expect(page.getByText("This page could not be found")).toHaveCount(0);
}

test.describe("Unified CRM pilot proof gates", () => {
  test("loads supported CRM review routes without 404s, console errors, or responsive overflow", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await login(page);

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);

      for (const path of [
        "/crm",
        "/crm?view=work",
        "/crm?view=customers",
        "/crm?view=pipeline",
        "/crm?view=conversations",
        "/crm?view=insights",
        "/crm?view=more",
        "/crm/opportunities",
        "/crm/quotes"
      ]) {
        await page.goto(path);
        await expectCrmMainContent(page);
        await expectNoHorizontalOverflow(page);
      }
    }

    expect(consoleErrors).toEqual([]);
  });

  test("supports keyboard traversal through the CRM shell navigation and work controls", async ({ page }) => {
    await login(page);

    const focusedLabels: string[] = [];

    for (let index = 0; index < 60; index += 1) {
      await page.keyboard.press("Tab");
      const activeLabel = await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (!activeElement) return "";
        return [
          activeElement.getAttribute("aria-label"),
          activeElement.getAttribute("placeholder"),
          activeElement.textContent
        ]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      });
      if (activeLabel) focusedLabels.push(activeLabel);
    }

    expect(focusedLabels.some((label) => label.includes("Home"))).toBe(true);
    expect(focusedLabels.some((label) => label.includes("Customers"))).toBe(true);
    expect(focusedLabels.some((label) => label.includes("Pipeline"))).toBe(true);
    expect(focusedLabels.some((label) => label.includes("Filter owned work") || label.includes("Filter"))).toBe(true);
    expect(focusedLabels.some((label) => label.includes("New"))).toBe(true);
  });
});
