import { expect, test, type Page } from "@playwright/test";
async function open(page: Page, suffix = "") {
  await page.goto(`/${suffix}`); await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create pack from selected forms", exact: true })).toBeEnabled();
  return page.getByRole("region", { name: "Reusable print packs", exact: true });
}
test("staff can create, reload, edit another staff pack and adjust individual output without changing the pack", async ({ page }) => {
  let manager = await open(page, "?staff=1");
  await manager.getByLabel("Choose a print pack", { exact: true }).selectOption("delivery");
  await manager.getByRole("button", { name: "Use pack", exact: true }).click();
  await manager.getByRole("button", { name: "Create pack from selected forms", exact: true }).click();
  await manager.getByLabel("Pack name", { exact: true }).fill("Customer delivery copies");
  await manager.getByRole("checkbox", { name: "Pack form: Insurance record", exact: true }).uncheck();
  await manager.getByRole("button", { name: "Save print pack", exact: true }).click();
  await expect(manager.getByRole("status")).toContainText("saved for the team");
  const id = await manager.getByLabel("Choose a print pack", { exact: true }).inputValue();
  manager = await open(page, "?staff=1");
  await manager.getByLabel("Choose a print pack", { exact: true }).selectOption(id);
  await manager.getByRole("button", { name: "Use pack", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Select Insurance record", exact: true })).not.toBeChecked();
  await manager.getByRole("button", { name: "Edit shared pack", exact: true }).click();
  await manager.getByLabel("Pack name", { exact: true }).fill("Updated delivery copies");
  await manager.getByRole("button", { name: "Save print pack", exact: true }).click();
  await manager.getByRole("button", { name: "Use pack", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select Insurance record", exact: true }).check();
  await manager.getByRole("button", { name: "Use pack", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Select Insurance record", exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Preview selected forms", exact: true }).click();
  await expect(page.locator("dialog iframe")).toHaveAttribute("src", /^blob:/);
});
test("failed pack saves preserve the editor and can be retried", async ({ page }) => {
  const packs = await open(page);
  await packs.getByRole("button", { name: "Create pack from selected forms", exact: true }).click();
  await packs.getByLabel("Pack name", { exact: true }).fill("Retry pack");
  await page.evaluate(() => { (window as unknown as { __cashPrintFixture: { controls: { failPackSave: boolean } } }).__cashPrintFixture.controls.failPackSave = true; });
  await packs.getByRole("button", { name: "Save print pack", exact: true }).click();
  await expect(packs.getByRole("alert")).toContainText("entries are retained");
  await expect(packs.getByLabel("Pack name", { exact: true })).toHaveValue("Retry pack");
  await page.evaluate(() => { (window as unknown as { __cashPrintFixture: { controls: { failPackSave: boolean } } }).__cashPrintFixture.controls.failPackSave = false; });
  await packs.getByRole("button", { name: "Save print pack", exact: true }).click();
  await expect(packs.getByRole("region", { name: "Print pack editor", exact: true })).toHaveCount(0);
});
test("manager can restrict team pack changes while staff keep pack selection and individual printing", async ({ page }) => {
  const packs = await open(page);
  await packs.getByText("Manager settings — team print packs", { exact: true }).click();
  await packs.getByRole("checkbox", { name: "Allow staff to create, edit and remove shared print packs", exact: true }).uncheck();
  await expect(packs.getByRole("status")).toContainText("permissions saved");
  await page.goto("/?staff=1"); await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create pack from selected forms", exact: true })).toBeDisabled();
  await expect(page.getByText("Shared packs are currently managed by managers.", { exact: false })).toBeVisible();
  await expect(page.getByText("Manager settings — team print packs", { exact: true })).toHaveCount(0);
  await page.getByLabel("Choose a print pack", { exact: true }).selectOption("delivery");
  await page.getByRole("button", { name: "Use pack", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select Insurance record", exact: true }).uncheck();
  await page.getByRole("button", { name: "Preview selected forms", exact: true }).click();
  await expect(page.locator("dialog iframe")).toHaveAttribute("src", /^blob:/);
});
