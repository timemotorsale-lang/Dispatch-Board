import { expect, test } from "@playwright/test";
import { disconnectDailyWorkflowDatabase, resetDailyWorkflowState } from "./daily-workflow.setup";

// These checks exercise real authenticated pages against disposable fixtures.
// They establish layout coverage, not transactional workflow signoff.
test.beforeAll(async () => {
  const database = new URL(process.env.DATABASE_URL!);
  if (!database.searchParams.get("schema")?.startsWith("dispatch_board_e2e_")) {
    throw new Error("Enterprise layout checks require an isolated e2e schema.");
  }
  await resetDailyWorkflowState();
});
test.afterAll(disconnectDailyWorkflowDatabase);

const routes = [
  "/board", "/appointments", "/tasks", "/projects", "/crm-next",
  "/customers", "/vehicles", "/reports", "/settings", "/staff",
  "/document-library", "/time-attendance", "/growth", "/website-console",
  "/sales", "/money-resources", "/compliance", "/customers/vendors",
  "/administration", "/integrations", "/activity", "/capture",
  "/manager-workspace", "/inventory-manager", "/diagnostics/labor-guide"
];

for (const route of routes) {
  test(`${route} stays usable at desktop, tablet and phone widths`, async ({ page }) => {
    test.setTimeout(120_000);
    const login = await page.request.post("/api/auth/login", {
      data: { email: "morgan.manager@local.test", password: "dispatch123!" }
    });
    expect(login.ok()).toBeTruthy();
    const rhythm = await (await page.request.get("/api/coo-workbook/rhythm")).json();
    const explanation = await page.request.post("/api/coo-workbook/rhythm", {
      data: { workbookId: rhythm.workbookId, action: "START_DELAY_EXPLAINED", reason: "Isolated enterprise layout verification; not starting an operational day.", sourcePath: route }
    });
    expect(explanation.ok()).toBeTruthy();
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
      const canonicalRoutes: Record<string, string> = {
        "/document-library": "/documents",
        "/inventory-manager": "/vehicles",
        "/diagnostics/labor-guide": "/prototype/repair-explorer"
      };
      await expect.poll(() => new URL(page.url()).pathname).toBe(canonicalRoutes[route] ?? route);
      await expect(page.getByText("Customer Console is protected right now.", { exact: true })).toHaveCount(0);
      await expect(page.getByText("This shortcut is no longer available.", { exact: true })).toHaveCount(0);
      await page.screenshot({ path: `test-results/enterprise-${route.slice(1).replaceAll("/", "-")}-${width}.png`, fullPage: true, caret: "initial" });
      await test.info().attach(`overflow-${width}`, { body: JSON.stringify(await page.evaluate(() =>
        Array.from(document.querySelectorAll("body *")).filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.right > window.innerWidth + 1;
        }).slice(0, 20).map(element => ({ tag: element.tagName, classes: element.className, right: element.getBoundingClientRect().right }))
      )), contentType: "application/json" });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), {
        message: `${route} must contain its content at ${width}px`
      }).toBeLessThanOrEqual(1);
      if (route === "/settings" && width === 390) {
        const directory = page.locator("summary").filter({ hasText: "Settings directory" });
        await expect(directory).toBeVisible();
        await directory.focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("details[open]").getByRole("link", { name: /Vehicle Operations/ })).toBeVisible();
        await page.keyboard.press("Enter");
        await expect(page.locator("details[open]").getByRole("link", { name: /Vehicle Operations/ })).toHaveCount(0);
      }
    }
  });
}
