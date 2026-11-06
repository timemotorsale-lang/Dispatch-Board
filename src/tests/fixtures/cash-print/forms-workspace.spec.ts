import { expect, test } from "@playwright/test";

test("full catalog clearly distinguishes blank templates and requires a selected saved deal", async ({ page }) => {
  await page.goto("/forms-workspace.html");
  await expect(page.getByRole("heading", { name: "Forms Library", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open deal forms & review", exact: true })).toBeDisabled();
  await expect(page.getByRole("link", { name: /View blank template: Motor vehicle purchase agreement/ })).toHaveAttribute("href", "/api/crm/v1/cash-sale-forms?id=sales-agreement");
  await page.getByLabel("Search forms", { exact: true }).fill("purchase agreement (front");
  await page.getByRole("checkbox", { name: /Motor vehicle purchase agreement/ }).check();
  await page.getByLabel("Find your saved deal").fill("Demo"); await page.getByRole("button", { name: "Find deal", exact: true }).click();
  await page.getByRole("radio", { name: /Demo Buyer/ }).check();
  await expect(page.getByRole("link", { name: "Open deal forms & review", exact: true })).toHaveAttribute("href", /draftId=fictional-draft&formsLibrary=1&printForms=sales-agreement$/);
});
test("staff can save packs without a deal and conditional forms are retained", async ({ page }) => {
  await page.goto("/forms-workspace.html?staff=1");
  await page.getByRole("tab", { name: "Team print packs", exact: true }).click();
  await page.getByLabel("Choose a print pack", { exact: true }).selectOption("cash-signing");
  await page.getByRole("button", { name: "Use pack", exact: true }).click();
  await page.getByRole("button", { name: "Create pack from selected forms", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Pack form: Conditional As Is acknowledgment", exact: true })).toBeChecked();
  await page.getByLabel("Pack name", { exact: true }).fill("Team signing choice");
  await page.getByRole("button", { name: "Save print pack", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("saved for the team");
  await page.reload(); await page.getByRole("tab", { name: "Team print packs", exact: true }).click();
  await expect(page.getByLabel("Choose a print pack", { exact: true }).locator("option", { hasText: "Team signing choice" })).toHaveCount(1);
});
test("manager restrictions apply on the standalone page and selection remains usable", async ({ page }) => {
  await page.goto("/forms-workspace.html"); await page.getByRole("tab", { name: "Team print packs", exact: true }).click();
  await page.getByText("Manager settings — team print packs", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Allow staff to create, edit and remove shared print packs", exact: true }).uncheck();
  await expect(page.getByRole("status")).toContainText("permissions saved");
  await page.goto("/forms-workspace.html?staff=1"); await page.getByRole("tab", { name: "Team print packs", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create pack from selected forms", exact: true })).toBeDisabled();
  await page.getByLabel("Choose a print pack", { exact: true }).selectOption("title-dmv");
  await page.getByRole("button", { name: "Use pack", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("forms selected");
});
test("failed deal searches retain form choices and can be retried", async ({ page }) => {
  await page.goto("/forms-workspace.html");
  await page.getByLabel("Search forms", { exact: true }).fill("purchase agreement (front");
  const checkbox = page.getByRole("checkbox", { name: /Motor vehicle purchase agreement/ }); await checkbox.check();
  await page.evaluate(() => { (window as unknown as { __formsWorkspace: { failSearch: boolean } }).__formsWorkspace.failSearch = true; });
  await page.getByRole("button", { name: "Find deal", exact: true }).click(); await expect(page.getByRole("alert")).toContainText("Retry the search");
  await expect(checkbox).toBeChecked();
  await page.evaluate(() => { (window as unknown as { __formsWorkspace: { failSearch: boolean } }).__formsWorkspace.failSearch = false; });
  await page.getByRole("button", { name: "Find deal", exact: true }).click(); await expect(page.getByRole("radio", { name: /Demo Buyer/ })).toBeVisible();
});
test("mobile archive reference and keyboard tab navigation keep all choices accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/forms-workspace.html");
  const forms = page.getByRole("tab", { name: "All forms", exact: true }); await forms.focus(); await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Archived packs", exact: true })).toBeFocused();
  await page.getByText("Previous BHPH packet", { exact: false }).click();
  await expect(page.getByRole("tabpanel", { name: "Archived packs", exact: true }).getByText("BHPH retail installment contract support", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
for (const [route, dialog] of [["/?draftId=fictional-draft&formsLibrary=1&printForms=sales-agreement", "Cash sale packet"], ["/sale-library.html?pathway=finance&draftId=fictional-draft&formsLibrary=1&printForms=sales-agreement", "Vehicle sale forms library"]]) test(`handoff opens ${dialog} with the requested selection without generating`, async ({ page }) => {
  await page.goto(route); const modal = page.getByRole("dialog", { name: dialog, exact: true }); await expect(modal).toBeVisible();
  await expect(modal.getByRole("checkbox", { name: "Select Motor vehicle purchase agreement (front and reverse)", exact: true })).toBeChecked();
  await expect(modal.getByRole("checkbox", { name: "Select Insurance record", exact: true })).not.toBeChecked();
  expect(await page.evaluate(() => {
    const fixtures = window as unknown as { __cashPrintFixture?: { controls: { generations: number } }; __saleLibraryFixture?: { requests: unknown[] } };
    return fixtures.__cashPrintFixture?.controls.generations ?? fixtures.__saleLibraryFixture?.requests.length;
  })).toBe(0);
  await modal.getByRole("button", { name: "Close", exact: true }).click(); await expect(modal).toHaveCount(0);
});
