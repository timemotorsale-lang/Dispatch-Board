import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("all sample cards show guarded illustrative photos", async ({ page }) => {
  await page.goto("/shop");
  const images = page.locator(".vehicle-card img");
  await expect(images).toHaveCount(23);
  await images.evaluateAll(elements => elements.forEach(element => { (element as HTMLImageElement).loading = "eager"; }));
  await expect.poll(() => images.evaluateAll(elements => elements.every(element => (element as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect(page.locator(".vehicle-card .sample-photo-label")).toHaveCount(23);
});
test("heart opens the email dialog, validates, saves only the vehicle and supports removal", async ({ page }) => {
  await page.goto("/shop?q=rav4&max=20000");
  const heart = page.getByRole("button", { name: "Save 2021 Toyota RAV4", exact: true });
  await heart.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Continue — save in this browser", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Enter a valid sample email");
  await dialog.getByRole("textbox", { name: "Sample email address", exact: true }).fill("sample@example.com");
  const pending = page.waitForRequest(request => request.url().endsWith("/api/preview") && request.method() === "POST");
  await dialog.getByRole("button", { name: "Continue — save in this browser", exact: true }).click();
  expect((await pending).postDataJSON()).toMatchObject({ operation: "SAVE", value: "sample-rav4" });
  expect(JSON.stringify((await pending).postDataJSON())).not.toContain("sample@example.com");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Unsave 2021 Toyota RAV4", exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Remove from preview favorites", exact: true }).click();
  await expect(heart).toBeVisible();
});
test("favorites dialog is accessible, mobile-friendly and restores focus when dismissed", async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shop?q=rav4&max=20000");
    const heart = page.getByRole("button", { name: "Save 2021 Toyota RAV4", exact: true });
    await heart.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: /Google/ })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: /Apple/ })).toBeDisabled();
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(heart).toBeFocused();
  }
});
