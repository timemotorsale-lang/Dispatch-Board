import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";
type Fixture = { state: { failSave: boolean; failStatus: boolean; snapshot: Record<string, unknown> }; calls: Record<string, number> };
async function verify(page: Page) {
  await page.getByRole("button", { name: "Continue to verification", exact: true }).click();
  await expect(page.getByText("No accompanying employee is required.")).toBeVisible();
  await page.getByRole("button", { name: /Use my name/ }).click();
  await page.getByRole("checkbox", { name: /I reviewed the driver's license/ }).check();
  await page.getByRole("checkbox", { name: "I reviewed coverage for this drive" }).check();
  await page.getByRole("button", { name: "Continue to agreement", exact: true }).click();
}
async function attach(page: Page, label: string, signed = false) {
  const input = page.getByLabel(`Upload ${label}`, { exact: true });
  await expect(input).toBeEnabled();
  await input.setInputFiles({ name: `${label.replaceAll("/", "-")}.png`, mimeType: "image/png", buffer: Buffer.from("fixture-image") });
  await page.getByRole("button", { name: signed ? "I reviewed and verified the signatures" : "I reviewed this evidence", exact: true }).click();
}
async function agreement(page: Page) {
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Generate & print agreement", exact: true }).click();
  const viewer = await popup; await expect(page.getByText("Agreement saved. Print from the PDF viewer", { exact: false })).toBeVisible(); await viewer.close();
  await attach(page, "Signed agreement", true); await attach(page, "Driver license proof"); await attach(page, "Coverage proof");
  await page.getByRole("button", { name: "Continue to release photos", exact: true }).click();
}
async function photos(page: Page, returned = false) {
  const labels = returned ? ["Return front", "Return rear", "Return interior", "Return odometer & fuel", "Damage / no-damage review"] : ["Front", "Rear", "Both sides", "Interior", "Odometer & fuel"];
  for (let index = 0; index < labels.length; index++) {
    await attach(page, labels[index]);
    if (index < labels.length - 1) await page.getByRole("button", { name: "Next photo view", exact: true }).click();
  }
}
test.beforeEach(async ({ page }) => { await page.goto("/"); });
test("the signing step explains pending verification and lets staff complete it before printing", async ({ page }) => {
  await page.getByRole("button", { name: /Sign Agreement Pending/ }).click();
  const checks = page.getByRole("group", { name: "Complete checks to print", exact: true });
  await expect(checks).toBeVisible();
  const print = page.getByRole("button", { name: "Generate & print agreement", exact: true });
  await expect(print).toBeEnabled();
  await print.click();
  await expect(checks.getByLabel("Authorizing employee", { exact: true })).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { __driveFixture: Fixture }).__driveFixture.calls.GENERATE ?? 0)).toBe(0);
  await checks.getByRole("button", { name: /Use my name/ }).click();
  await checks.getByRole("checkbox", { name: /I reviewed the driver's license/ }).check();
  await checks.getByRole("checkbox", { name: "I reviewed coverage for this drive" }).check();
  await expect(checks.getByText("Verification complete. You can generate and print the agreement now.", { exact: true })).toBeVisible();
  const popup = page.waitForEvent("popup");
  await print.click();
  const viewer = await popup;
  await expect.poll(() => viewer.url()).toMatch(/^blob:/);
  await expect(page.getByRole("button", { name: "Print saved agreement", exact: true })).toBeVisible();
  await viewer.close();
});
test("staff can save, resume, verify and invalidate an agreement without re-entering facts", async ({ page }) => {
  await verify(page);
  if (process.env.TEST_DRIVE_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.TEST_DRIVE_SCREENSHOT_DIR, "test-drive-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Save & resume later", exact: true }).click();
  await expect(page.getByText("Saved. You can resume this step later.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign Agreement", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Driver & Vehicle.*Complete/ }).click();
  await expect(page.getByLabel("Driver license", { exact: true })).toHaveValue("DEMO-D123456");
  await page.getByLabel("Driver license", { exact: true }).fill("DEMO-UPDATED");
  await page.getByRole("button", { name: /Verify.*Current|Verify.*Complete|Verify.*Pending/ }).click();
  await expect(page.getByRole("checkbox", { name: /I reviewed the driver's license/ })).not.toBeChecked();
});
test("failed saving retains entries and retries the same draft", async ({ page }) => {
  await page.getByLabel("Driver phone", { exact: true }).fill("6125550199");
  await page.evaluate(() => { (window as unknown as { __driveFixture: Fixture }).__driveFixture.state.failSave = true; });
  await page.getByRole("button", { name: "Save & resume later", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Fixture save failed");
  await expect(page.getByLabel("Driver phone", { exact: true })).toHaveValue("6125550199");
  await page.evaluate(() => { (window as unknown as { __driveFixture: Fixture }).__driveFixture.state.failSave = false; });
  await page.getByRole("button", { name: "Save & resume later", exact: true }).click();
  await expect(page.getByText("Saved. You can resume this step later.")).toBeVisible();
});
test("reprinting a saved agreement opens the PDF without saving or generating again", async ({ page }) => {
  await verify(page);
  let popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Generate & print agreement", exact: true }).click();
  let viewer = await popup;
  await expect(page.getByRole("button", { name: "Print saved agreement", exact: true })).toBeVisible();
  await expect.poll(() => viewer.url()).toMatch(/^blob:/); await viewer.close();
  await page.evaluate(() => { (window as unknown as { __driveFixture: Fixture }).__driveFixture.state.failSave = true; });
  popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Print saved agreement", exact: true }).click();
  viewer = await popup; await expect.poll(() => viewer.url()).toMatch(/^blob:/); await viewer.close();
  expect(await page.evaluate(() => (window as unknown as { __driveFixture: Fixture }).__driveFixture.calls.GENERATE)).toBe(1);
  await expect(page.getByText("Fixture save failed", { exact: false })).toHaveCount(0);
});
test("generation still opens the archived PDF when status refresh fails", async ({ page }) => {
  await verify(page);
  await page.evaluate(() => { (window as unknown as { __driveFixture: Fixture }).__driveFixture.state.failStatus = true; });
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Generate & print agreement", exact: true }).click();
  const viewer = await popup; await expect.poll(() => viewer.url()).toMatch(/^blob:/);
  await expect(page.getByText("Agreement saved. The print/download copy is available.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download saved PDF", exact: true })).toBeVisible();
  expect(viewer.isClosed()).toBe(false); await viewer.close();
});
test("blocked popups leave a working PDF download instead of a refresh loop", async ({ page }) => {
  await page.evaluate(() => { window.open = () => null; });
  await verify(page);
  await page.getByRole("button", { name: "Generate & print agreement", exact: true }).click();
  await expect(page.getByText("The PDF window was blocked", { exact: false })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download saved PDF", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("fixture.pdf");
});
test("staff complete a solo drive with guided photos and a return exception", async ({ page }) => {
  await verify(page); await agreement(page); await photos(page);
  await page.getByRole("checkbox", { name: "Keys handed to the verified driver" }).check();
  await page.getByRole("checkbox", { name: "Vehicle is physically being released now" }).check();
  await page.getByRole("button", { name: "Confirm release & start test drive", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Due within 15 minutes", exact: true })).toBeVisible();
  await expect(page.getByLabel("Driver license", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Record return", exact: true }).click();
  await page.getByRole("button", { name: "Use current time & my name", exact: true }).click();
  await page.getByLabel("Return odometer", { exact: true }).fill("45010");
  await page.getByLabel("Fuel in", { exact: true }).fill("Full");
  await page.getByLabel("Return condition", { exact: true }).fill("New scratch recorded");
  await page.getByRole("checkbox", { name: "Damage, missing keys or another exception" }).check();
  await page.getByLabel("Exception and next action").fill("Spare key missing. Contact driver today.");
  await photos(page, true);
  await page.getByRole("button", { name: "Record return & keep vehicle on hold", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Returned · exception needs follow-up", exact: true })).toBeVisible();
  const counts = await page.evaluate(() => (window as unknown as { __driveFixture: Fixture }).__driveFixture.calls);
  expect(counts.GENERATE).toBe(1); expect(counts.RELEASE).toBe(1); expect(counts.RETURN).toBe(1);
  await page.getByLabel("Resolution and completed next action").fill("Spare key recovered and damage review completed.");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Confirm resolution & release hold", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Test drive returned", exact: true })).toBeVisible();
});
test("mobile workflow fits the screen and conditionally requests accompaniment", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Continue to verification", exact: true }).click();
  await page.getByLabel("Drive type", { exact: true }).selectOption("SUPERVISED");
  await expect(page.getByLabel("Accompanying employee", { exact: true })).toBeVisible();
  await page.getByLabel("Drive type", { exact: true }).selectOption("UNACCOMPANIED");
  await expect(page.getByLabel("Accompanying employee", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (process.env.TEST_DRIVE_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.TEST_DRIVE_SCREENSHOT_DIR, "test-drive-mobile.png"), fullPage: true });
});
