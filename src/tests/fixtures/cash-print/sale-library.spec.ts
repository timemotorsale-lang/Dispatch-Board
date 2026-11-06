import { expect, test } from "@playwright/test";
test("shared library save-and-return retains the selected form after a recoverable save failure", async ({ page }) => {
  await page.goto("/sale-library.html?pathway=finance");
  await page.getByRole("button", { name: "Open sale forms library", exact: true }).click();
  await page.evaluate(() => { (window as unknown as {__saleLibraryFixture:{fixture:{failSave:boolean}}}).__saleLibraryFixture.fixture.failSave = true; });
  await page.getByRole("button", { name: "Review populated Motor vehicle purchase agreement (front and reverse)", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Fixture save unavailable");
  await page.evaluate(() => { (window as unknown as {__saleLibraryFixture:{fixture:{failSave:boolean}}}).__saleLibraryFixture.fixture.failSave = false; });
  await page.getByRole("button", { name: "Save changes & return", exact: true }).click();
  await expect(page.getByTitle("Populated sale library forms", { exact: true })).toHaveAttribute("src", /^blob:/);
  await expect(page.getByRole("heading", { name: "Motor vehicle purchase agreement (front and reverse)", exact: true })).toBeVisible();
});
for (const pathway of ["finance", "outside-finance-one-pay", "bhph", "wholesale"]) test(`${pathway} opens the shared library by default and retains archived packs`, async ({ page }) => {
  await page.goto(`/sale-library.html?pathway=${pathway}`);
  await page.getByRole("button", { name: "Open sale forms library", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Vehicle sale forms library", exact: true });
  await expect(dialog.getByRole("tab", { name: "Document Library", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("tab", { name: "Archived packs", exact: true })).toBeVisible();
  if (pathway === "wholesale") {
    await expect(dialog.getByRole("button", { name: "Review populated Wholesale bill of sale", exact: true })).toBeEnabled();
    await dialog.getByRole("button", { name: "Review populated Wholesale bill of sale", exact: true }).click();
    await expect(dialog.getByTitle("Wholesale original document", { exact: true })).toHaveAttribute("src", /original-bill$/);
    expect(await page.evaluate(() => (window as unknown as {__saleLibraryFixture:{requests:unknown[]}}).__saleLibraryFixture.requests.length)).toBe(0);
    await expect(dialog.getByRole("button", { name: "Review populated Motor vehicle purchase agreement (front and reverse)", exact: true })).toHaveCount(0);
  } else {
    await dialog.getByRole("button", { name: "Review populated Motor vehicle purchase agreement (front and reverse)", exact: true }).click();
    await expect(dialog.getByTitle("Populated sale library forms", { exact: true })).toHaveAttribute("src", /^blob:/);
    await dialog.getByRole("tab", { name: "Archived packs", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Print selected forms", exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: /Review archived packet/ }).click();
    await expect(dialog.getByText("LEGACY-DEMO", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Open original documents and signed copies", exact: true })).toHaveAttribute("href", /sales-documents/);
  }
});
