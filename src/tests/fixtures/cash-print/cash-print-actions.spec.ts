// Runs only against the isolated cash-print fixture, never the authenticated CRM.
import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
type Fixture = { controls: { generations: number; failGeneration: boolean; delay: number }; fixture: { failSave: boolean; saveCalls: number } };
async function open(page: Page) {
  await page.goto("/"); await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  return page.getByRole("dialog", { name: "Cash sale packet", exact: true });
}
test("preview generates the selection automatically and subsequent download reuses it", async ({ page }) => {
  const dialog = await open(page);
  await expect(dialog.getByRole("button", { name: "Preview selected forms", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Preview selected forms", exact: true }).click();
  await expect(dialog.locator("iframe")).toHaveAttribute("src", /^blob:/);
  await page.evaluate(() => { (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.fixture.failSave = true; });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download selected PDF", exact: true }).click();
  const file = await download; expect(file.suggestedFilename()).toBe("cash-sale-CASH-FIXTURE.pdf");
  expect((await PDFDocument.load(await readFile((await file.path())!))).getPageCount()).toBeGreaterThan(1);
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.generations)).toBe(1);
});
test("print generates once and opens selected PDF bytes in the reserved viewer", async ({ page }) => {
  const dialog = await open(page);
  await page.addInitScript(() => { window.print = () => {}; });
  const popup = page.waitForEvent("popup");
  await dialog.getByRole("button", { name: "Print selected forms", exact: true }).click();
  const viewer = await popup; await expect.poll(() => viewer.url()).toMatch(/^blob:/);
  await expect(dialog.getByText("Selected forms opened in the PDF print viewer.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.generations)).toBe(1);
  await viewer.close();
});
test("generation errors are visible beside the actions and retry retains the selection", async ({ page }) => {
  const dialog = await open(page);
  await page.evaluate(() => { (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.failGeneration = true; });
  await dialog.getByRole("button", { name: "Download selected PDF", exact: true }).click();
  const alert = dialog.getByRole("alert");
  await expect(alert).toContainText("Fixture document service unavailable"); await expect(alert).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Print selected forms", exact: true })).toBeEnabled();
  await page.evaluate(() => { (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.failGeneration = false; });
  const download = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Download selected PDF", exact: true }).click(); await download;
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});
test("blocked print popups prepare a downloadable PDF instead of a dead end", async ({ page }) => {
  const dialog = await open(page); await page.evaluate(() => { window.open = () => null; });
  await dialog.getByRole("button", { name: "Print selected forms", exact: true }).click();
  await expect(dialog.getByText("The browser blocked or closed the print window.", { exact: false })).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveAttribute("src", /^blob:/);
  const download = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Download selected PDF", exact: true }).click(); await download;
});
test("rapid repeated clicks do not create duplicate generations", async ({ page }) => {
  const dialog = await open(page);
  await page.evaluate(() => { (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.delay = 300; });
  await dialog.getByRole("button", { name: "Preview selected forms", exact: true }).dblclick();
  await expect(dialog.locator("iframe")).toHaveAttribute("src", /^blob:/);
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.generations)).toBe(1);
});
test("a changed print pack reuses generated forms and prints only the chosen subset", async ({ page }) => {
  const dialog = await open(page);
  await dialog.getByRole("button", { name: "Generate selected pack", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Packet saved on this deal");
  await dialog.getByRole("tab", { name: "Print Packs", exact: true }).click();
  await dialog.getByRole("checkbox", { name: /Delivery & promises pack/ }).check();
  const download = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Download selected PDF", exact: true }).click();
  const file = await download; expect((await PDFDocument.load(await readFile((await file.path())!))).getPageCount()).toBe(7);
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.generations)).toBe(1);
});
test("missing deal details are explained in the dialog and can be corrected without losing selection", async ({ page }) => {
  await page.goto("/"); await page.getByLabel("Buyer address", { exact: true }).fill("");
  await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cash sale packet", exact: true });
  await dialog.getByRole("button", { name: "Preview selected forms", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Enter the buyer's address");
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.generations)).toBe(0);
  await dialog.getByRole("button", { name: "Review deal details", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("Buyer address", { exact: true }).fill("200 Corrected Sample Street");
  await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  const download = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Download selected PDF", exact: true }).click(); await download;
});
test("no-warranty printing can be corrected inside the print window", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Warranty terms", exact: true }).selectOption("No dealer warranty - eligibility reviewed");
  await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cash sale packet", exact: true });
  await dialog.getByRole("button", { name: "Preview selected forms", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Complete the warranty details above");
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.generations)).toBe(0);
  await dialog.getByLabel("Reviewed no-warranty reason", { exact: true }).fill("Fictional reviewed basis for fixture only");
  const popup = page.waitForEvent("popup");
  await dialog.getByRole("button", { name: "Print selected forms", exact: true }).click();
  const viewer = await popup; await expect.poll(() => viewer.url()).toMatch(/^blob:/);
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: { controls: { bodies: { retailCash: { warrantyExemption: string } }[] } } }).__cashPrintFixture.controls.bodies.at(-1)?.retailCash.warrantyExemption)).toBe("Fictional reviewed basis for fixture only");
  await expect(dialog.getByRole("alert")).toHaveCount(0); await viewer.close();
});

test("mobile errors remain visible beside enabled retry actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await open(page);
  await page.evaluate(() => { (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.fixture.failSave = true; });
  await dialog.getByRole("button", { name: "Download selected PDF", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Fixture save unavailable");
  await expect(dialog.getByRole("alert")).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Download selected PDF", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
