import { test, expect } from "@playwright/test";

test("exterior and interior color labels have matching right-aligned swatches on desktop and mobile", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/shop");
    if (width === 390) await page.getByRole("button", { name: /^Filters/ }).click();
    const filters = width === 390 ? page.getByRole("dialog") : page.getByRole("complementary", { name: "Inventory filters" });
    for (const title of ["Exterior color", "Interior color"]) {
      const section = filters.locator("details").filter({ has: page.locator("summary").filter({ hasText: title }) });
      await section.locator("summary").click();
      const options = section.locator(".facet-option");
      expect(await options.count()).toBeGreaterThan(10);
      for (const option of await options.all()) {
        const swatch = option.locator(".facet-color-swatch");
        await expect(swatch).toHaveAttribute("aria-hidden", "true");
        expect(await swatch.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
        expect(await option.evaluate(element => { const label = element.querySelector("span")!; const swatch = element.querySelector(".facet-color-swatch")!; return swatch.getBoundingClientRect().left > label.getBoundingClientRect().right; })).toBe(true);
      }
      await expect(section.locator('.facet-option').filter({ has: page.locator('input[value="White"]') }).locator(".facet-color-swatch")).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(section.locator('.facet-option').filter({ has: page.locator('input[value="Black"]') }).locator(".facet-color-swatch")).toHaveCSS("background-color", "rgb(23, 23, 23)");
      await section.locator("summary").click();
    }
    const exterior = filters.locator("details").filter({ has: page.locator("summary").filter({ hasText: "Exterior color" }) });
    await exterior.locator("summary").click();
    await exterior.locator('input[value="Blue"]').check();
    await expect(page).toHaveURL(/exterior=Blue/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
