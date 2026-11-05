// Runs only against the isolated cash-print fixture, never the authenticated CRM.
import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { CASH_PRINT_CATALOG } from "../../../lib/cash-sale-print-library";
type Fixture = { controls: { generations: number; failGeneration: boolean; delay: number }; fixture: { failSave: boolean; saveCalls: number } };
test("compact fee dropdown selects item/amount rows without stretching the price grid", async ({ page }) => {
  await page.goto("/");
  const price = page.getByLabel("Agreed vehicle price", { exact: true });
  const before = await price.boundingBox();
  await page.getByText("Choose fees", { exact: true }).click();
  await expect(page.getByLabel("Typical Minnesota title fee schedule", { exact: true })).toBeHidden();
  const title = page.getByRole("checkbox", { name: "Select Minnesota title fee", exact: true });
  await title.check();
  await page.getByLabel("Amount: Minnesota title fee", { exact: true }).fill("9.25");
  await title.uncheck(); await title.check();
  await expect(page.getByLabel("Amount: Minnesota title fee", { exact: true })).toHaveValue("9.25");
  await page.getByRole("checkbox", { name: "Select Regular / disability plates (double)", exact: true }).check();
  await expect(page.getByLabel("Title, transfer & plate fees", { exact: true })).toHaveValue("$24.75");
  await page.getByRole("checkbox", { name: "Select Regular / disability plate (single)", exact: true }).check();
  await expect(page.getByRole("checkbox", { name: "Select Regular / disability plates (double)", exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Title, transfer & plate fees", { exact: true })).toHaveValue("$22.75");
  expect((await price.boundingBox())!.height).toBe(before!.height);
  await page.getByLabel("Amount: Minnesota title fee", { exact: true }).press("Escape");
  await expect(title).toBeHidden();
  await expect(page.getByText("Choose fees", { exact: true })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText("Choose fees", { exact: true }).click();
  const menu = page.getByRole("group", { name: "Title fee item selector", exact: true });
  await expect(menu).toBeVisible();
  await expect.poll(async () => { const box = (await menu.boundingBox())!; return box.x >= -1 && box.x + box.width <= 391 && box.y >= -1 && box.y + box.height <= 845; }).toBe(true);
});
test("limited warranty fills missing terms inside the print workspace and preserves staff edits", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Covered systems", { exact: true }).fill("");
  await page.getByLabel("Warranty duration / mileage", { exact: true }).fill("");
  await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cash sale packet", exact: true });
  await dialog.getByText("Warranty & preparation details", { exact: true }).click();
  await dialog.getByRole("combobox", { name: "Warranty terms", exact: true }).selectOption("No dealer warranty - eligibility reviewed");
  await dialog.getByRole("combobox", { name: "Warranty terms", exact: true }).selectOption("Dealer limited warranty");
  await expect(dialog.getByLabel("Covered systems", { exact: true })).toHaveValue(/Powertrain.*Minnesota-required coverage/);
  await expect(dialog.getByLabel("Warranty duration / mileage", { exact: true })).toHaveValue("30 days or 1,000 miles, whichever occurs first");
  await dialog.getByLabel("Warranty duration / mileage", { exact: true }).fill("90 days or 3000 miles");
  await dialog.getByRole("combobox", { name: "Warranty terms", exact: true }).selectOption("No dealer warranty - eligibility reviewed");
  await dialog.getByRole("combobox", { name: "Warranty terms", exact: true }).selectOption("Dealer limited warranty");
  await expect(dialog.getByLabel("Warranty duration / mileage", { exact: true })).toHaveValue("90 days or 3000 miles");
  await dialog.getByRole("button", { name: "Save changes & return", exact: true }).click();
  await dialog.getByRole("button", { name: "Preview selected forms", exact: true }).click();
  await expect(dialog.locator("iframe")).toHaveAttribute("src", /^blob:/);
  const sent = await page.evaluate(() => (window as unknown as { __cashPrintFixture: { controls: { bodies: { retailCash: Record<string,string> }[] } } }).__cashPrintFixture.controls.bodies[0].retailCash);
  expect(sent.warrantyCoverage).toContain("Powertrain"); expect(sent.warrantyDuration).toBe("90 days or 3000 miles");
});
test("MN title fee selector sums schedules, edits and custom fees into the same saved title total", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Title, transfer & plate fees", { exact: true })).toHaveValue("$0.00");
  await page.getByText("Choose fees", { exact: true }).click();
  await page.getByText("More options", { exact: true }).click();
  await page.getByLabel("Typical Minnesota title fee schedule", { exact: true }).selectOption("one-lien");
  await page.getByRole("button", { name: "Use selected schedule — replace current fees", exact: true }).click();
  await expect(page.getByLabel("Title, transfer & plate fees", { exact: true })).toHaveValue("$38.00");
  await page.getByLabel("Amount: Title transaction filing fee", { exact: true }).fill("13.00");
  await page.getByLabel("Add Minnesota title or plate fee", { exact: true }).selectOption("custom");
  await page.getByRole("button", { name: "Add fee", exact: true }).click();
  await page.getByLabel("Amount: Other quoted title fee", { exact: true }).fill("4.25");
  await expect(page.getByLabel("Title, transfer & plate fees", { exact: true })).toHaveValue("$43.25");
  await page.getByRole("checkbox", { name: "Select Lien recording fee (per lien)", exact: true }).uncheck();
  await expect(page.getByLabel("Title, transfer & plate fees", { exact: true })).toHaveValue("$41.25");
  await page.getByLabel("Add Minnesota title or plate fee", { exact: true }).selectOption("plate-double");
  await page.getByRole("button", { name: "Add fee", exact: true }).click();
  await expect(page.getByLabel("Title, transfer & plate fees", { exact: true })).toHaveValue("$56.75");
  await page.getByRole("button", { name: "Done — use title fee total", exact: true }).click();
  await page.getByLabel("Registration fee / tax (tabs only)", { exact: true }).fill("417.00");
  await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  await page.getByRole("button", { name: "Preview selected forms", exact: true }).click();
  await expect(page.locator("dialog iframe")).toHaveAttribute("src", /^blob:/);
  const sent = await page.evaluate(() => (window as unknown as { __cashPrintFixture: { controls: { bodies: { retailCash: Record<string,string> }[] } } }).__cashPrintFixture.controls.bodies[0].retailCash);
  expect(sent.titleFee).toBe("56.75"); expect(sent.registrationFee).toBe("417.00");
  expect(JSON.parse(sent.titleFeeItems)).toHaveLength(7);
});
test("repairs masked restored contacts and a localized date before generating populated forms", async ({ page }) => {
  await page.goto("/?masked-contact=1");
  await expect(page.getByLabel("Buyer phone", { exact: true })).toHaveValue("6125550100");
  await expect(page.getByLabel("Buyer email", { exact: true })).toHaveValue("demo@example.test");
  await expect(page.getByLabel("Sale date", { exact: true })).toHaveValue("2026-11-05");
  await page.getByLabel("Buyer phone", { exact: true }).fill("6125550199");
  await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  await page.getByRole("button", { name: "Preview selected forms", exact: true }).click();
  await expect(page.locator("dialog iframe")).toHaveAttribute("src", /^blob:/);
  const sent = await page.evaluate(() => (window as unknown as { __cashPrintFixture: { controls: { bodies: { retailCash: Record<string,string> }[] } } }).__cashPrintFixture.controls.bodies[0].retailCash);
  expect(sent).toMatchObject({ buyerPhone: "6125550199", buyerEmail: "demo@example.test", saleDate: "2026-11-05" });
});
test("packet uses the displayed browser-filled sale date even without a change event", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Sale date", { exact: true }).evaluate((element: HTMLInputElement) => { element.value = "2026-11-05"; });
  await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  await page.getByRole("button", { name: "Preview selected forms", exact: true }).click();
  await expect(page.locator("dialog iframe")).toHaveAttribute("src", /^blob:/);
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: { controls: { bodies: { retailCash: {saleDate:string} }[] } } }).__cashPrintFixture.controls.bodies[0].retailCash.saleDate)).toBe("2026-11-05");
});
test("a blocked individual review can be corrected in place and opens that exact populated form", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Odometer reading", { exact: true }).fill("");
  await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cash sale packet", exact: true });
  await dialog.getByRole("button", { name: "Review populated Motor vehicle purchase agreement (front and reverse)", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Enter the odometer reading and mileage status.");
  await expect(dialog.getByRole("button", { name: "Review deal details", exact: true })).toHaveCount(0);
  await dialog.getByLabel("Packet odometer reading", { exact: true }).fill("45010");
  await dialog.getByRole("button", { name: "Save changes & return", exact: true }).click();
  await expect(dialog.locator('iframe[title="Motor vehicle purchase agreement (front and reverse)"]')).toHaveAttribute("src", /^blob:/);
  await expect(dialog.getByRole("combobox", { name: "Document", exact: true })).toHaveValue("sales-agreement");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(dialog.locator("details").first()).not.toHaveAttribute("open");
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.fixture.saveCalls)).toBeGreaterThan(0);
});
test("failed correction save keeps entries and lets staff retry without leaving the correction section", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Odometer reading", { exact: true }).fill("");
  await page.getByRole("button", { name: "Open cash sale packet", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cash sale packet", exact: true });
  await dialog.getByRole("button", { name: "Review populated Motor vehicle purchase agreement (front and reverse)", exact: true }).click();
  await dialog.getByLabel("Packet odometer reading", { exact: true }).fill("45100");
  await page.evaluate(() => { (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.fixture.failSave = true; });
  await dialog.getByRole("button", { name: "Save changes & return", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Fixture save unavailable");
  await expect(dialog.getByLabel("Packet odometer reading", { exact: true })).toHaveValue("45100");
  await expect(dialog.locator("details").first()).toHaveAttribute("open", "");
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.generations)).toBe(0);
  await page.evaluate(() => { (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.fixture.failSave = false; });
  await dialog.getByRole("button", { name: "Save changes & return", exact: true }).click();
  await expect(dialog.locator("iframe")).toHaveAttribute("src", /^blob:/);
});
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
  await dialog.getByLabel("Packet buyer address", { exact: true }).fill("200 Corrected Sample Street");
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

test("the forms workspace fills the page and lists every form without a nested vertical list", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const dialog = await open(page), box = await dialog.boundingBox();
  expect(box?.x).toBe(0); expect(box?.y).toBe(0); expect(box?.width).toBe(1440); expect(box?.height).toBe(1000);
  await expect(dialog.locator("tr[data-form-id]")).toHaveCount(CASH_PRINT_CATALOG.length);
  await expect(dialog.getByRole("tabpanel")).toHaveCSS("max-height", "none");
  await expect(dialog.getByRole("tabpanel")).toHaveCSS("overflow-y", "visible");
  await expect(dialog.getByText("Alex Demo Buyer", { exact: true })).toBeVisible();
  await expect(dialog.getByText("1NXBR32E85Z123456", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Print selected forms", exact: true })).toBeInViewport();
});

test("prepare all populates all applicable forms without selecting optional forms for print", async ({ page }) => {
  const dialog = await open(page), arbitration = dialog.getByRole("checkbox", { name: "Select Separate arbitration agreement (optional)", exact: true });
  const selectedBefore = await dialog.locator("tbody input:checked").count();
  await expect(arbitration).not.toBeChecked();
  await dialog.getByRole("button", { name: "Prepare all applicable forms", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("All applicable forms are populated");
  await expect(dialog.getByText("Populated copy available", { exact: true })).toHaveCount(CASH_PRINT_CATALOG.length - 2);
  await expect(arbitration).not.toBeChecked(); expect(await dialog.locator("tbody input:checked").count()).toBe(selectedBefore);
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.generations)).toBe(1);
});

test("reviewing a populated individual form preserves print choices and reuses its saved copy", async ({ page }) => {
  const dialog = await open(page), arbitration = dialog.getByRole("checkbox", { name: "Select Separate arbitration agreement (optional)", exact: true });
  await dialog.getByRole("button", { name: "Review populated Separate arbitration agreement (optional)", exact: true }).click();
  const preview = dialog.getByRole("region", { name: "Generated cash sale preview", exact: true });
  await expect(preview.locator("iframe")).toHaveAttribute("src", /^blob:/);
  await expect(preview.getByRole("combobox", { name: "Document", exact: true })).toHaveValue("arbitration-agreement");
  await expect(arbitration).not.toBeChecked();
  const body = await page.evaluate(() => (window as unknown as { __cashPrintFixture: { controls: { bodies: { customerName: string; vehicle: { vin: string }; retailCash: { buyerAddress: string } }[] } } }).__cashPrintFixture.controls.bodies.at(-1));
  expect(body).toMatchObject({ customerName: "Alex Demo Buyer", vehicle: { vin: "1NXBR32E85Z123456" }, retailCash: { buyerAddress: "100 Sample Street, Minneapolis MN" } });
  await preview.getByRole("checkbox", { name: "Include reviewed form in print selection", exact: true }).check();
  await expect(arbitration).toBeChecked();
  await preview.getByRole("button", { name: "Close preview", exact: true }).click();
  await dialog.getByRole("button", { name: "Review populated Separate arbitration agreement (optional)", exact: true }).click();
  await expect(preview.locator("iframe")).toHaveAttribute("src", /^blob:/);
  expect(await page.evaluate(() => (window as unknown as { __cashPrintFixture: Fixture }).__cashPrintFixture.controls.generations)).toBe(1);
});

test("mobile forms remain selectable and closing restores focus and page scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await open(page);
  await dialog.getByRole("button", { name: "Clear selection", exact: true }).click();
  await dialog.getByRole("button", { name: "Select all applicable", exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: "Select Separate arbitration agreement (optional)", exact: true })).toBeChecked();
  await dialog.getByRole("textbox", { name: "Search forms or packs", exact: true }).fill("odometer");
  await expect(dialog.locator("tr[data-form-id]")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(dialog.locator("tr[data-form-id]")).toHaveCount(CASH_PRINT_CATALOG.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open cash sale packet", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});
