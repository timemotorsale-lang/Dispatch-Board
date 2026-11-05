import { test, expect } from "@playwright/test";
type Fixture = { requests: Record<string, unknown>[]; failNext: boolean; delay: number };
test("a different pathway enables confirmation immediately with no reason or autosave lock", async ({ page }) => {
  await page.goto("/pathway.html");
  const confirm = page.getByRole("button", { name: "Confirm pathway change", exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByRole("combobox", { name: "New revenue pathway", exact: true }).selectOption("retail-sale");
  await expect(confirm).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Reason for change (optional)", exact: true })).not.toHaveAttribute("required");
  await confirm.click();
  await expect(page.getByRole("status")).toContainText("Pathway changed successfully");
  expect(await page.evaluate(() => (window as unknown as { __pathwayFixture: Fixture }).__pathwayFixture.requests)).toEqual([{ action: "CHANGE_PATHWAY", id: "fictional-draft", revision: 3, pathway: "retail-sale", reason: "" }]);
});
test("sold deals use the single move-to-Pending action without a mandatory reason", async ({ page }) => {
  await page.goto("/pathway.html");
  await page.getByRole("combobox", { name: "Fixture deal status", exact: true }).selectOption("SOLD");
  await page.getByRole("combobox", { name: "New revenue pathway", exact: true }).selectOption("retail-sale");
  const confirm = page.getByRole("button", { name: "Move to Pending & change pathway", exact: true });
  await expect(confirm).toBeEnabled(); await confirm.click();
  await expect(page.getByRole("status")).toContainText("Pathway changed successfully");
});
test("short optional notes survive an error and retries do not double-submit", async ({ page }) => {
  await page.goto("/pathway.html");
  await page.getByRole("combobox", { name: "New revenue pathway", exact: true }).selectOption("retail-sale");
  await page.getByRole("textbox", { name: "Reason for change (optional)", exact: true }).fill("Fix");
  await page.evaluate(() => { (window as unknown as { __pathwayFixture: Fixture }).__pathwayFixture.failNext = true; });
  const confirm = page.getByRole("button", { name: "Confirm pathway change", exact: true });
  await confirm.click(); await expect(page.getByRole("alert")).toContainText("Fixture conflict");
  await expect(confirm).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Reason for change (optional)", exact: true })).toHaveValue("Fix");
  await page.evaluate(() => { (window as unknown as { __pathwayFixture: Fixture }).__pathwayFixture.delay = 200; });
  await confirm.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByRole("status")).toContainText("Pathway changed successfully");
  expect(await page.evaluate(() => (window as unknown as { __pathwayFixture: Fixture }).__pathwayFixture.requests.length)).toBe(2);
});
test("genuine unsaved deal edits still require saving, and mobile confirmation remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/pathway.html");
  await page.getByRole("combobox", { name: "New revenue pathway", exact: true }).selectOption("retail-sale");
  await page.getByRole("textbox", { name: "Actual deal edit", exact: true }).fill("Unsaved terms");
  const confirm = page.getByRole("button", { name: "Confirm pathway change", exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByRole("button", { name: "Save actual deal edits", exact: true }).click();
  await expect(confirm).toBeEnabled(); await confirm.click();
  await expect(page.getByRole("status")).toContainText("Pathway changed successfully");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
