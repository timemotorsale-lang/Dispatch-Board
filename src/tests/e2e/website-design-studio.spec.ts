import { expect, test } from "@playwright/test";
import review from "../../features/website-console/design-studio/homepage-review.json";

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.setContent('<iframe title="Homepage template review" sandbox="allow-scripts" style="width:100%;height:1100px;border:0"></iframe>');
  await page.locator("iframe").evaluate((frame, document) => { frame.srcdoc = document; }, review.document);
});

for (const concept of ["Search First", "Premium Showroom", "Guided Shopping", "Signature Showroom", "Simple Hybrid"]) {
  test(`${concept}: permanent review controls, search, states and mobile layout`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const frame = page.frameLocator("iframe");
    await frame.getByRole("combobox", { name: "Concept", exact: true }).selectOption(concept);
    const active = frame.locator("[data-variant]:not([hidden])");
    await expect(active).toHaveAttribute("data-variant", concept);
    const input = active.locator("input");
    await input.click();
    await expect(active.locator(".suggestions")).toBeVisible();
    await input.press("ArrowDown");
    await expect(active.locator('.suggestions [data-action="pick:SUV"]')).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("SUV");
    await expect(active.locator(".selected-chips")).toBeVisible();
    await input.fill("spaceship");
    await input.press("Enter");
    await expect(active.getByRole("heading", { name: "Finding your fit…" })).toBeVisible();
    await page.clock.runFor(900);
    await expect(active.getByRole("heading", { name: "No sample vehicles match yet." })).toBeVisible();
    await active.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(input).toHaveValue("");
    for (const state of ["open", "selected", "loading", "empty", "returning"]) {
      await frame.getByRole("combobox", { name: "Experience state", exact: true }).selectOption(state);
      if (state === "returning") {
        await expect(active.locator(".returning")).toBeVisible();
        await expect(active.locator('[data-action="save"]')).toHaveAttribute("aria-pressed", "true");
      }
    }
    await frame.getByRole("combobox", { name: "Screen", exact: true }).selectOption("mobile");
    await expect(active.locator(".site")).toHaveClass(/phone/);
    await page.setViewportSize({ width: 390, height: 850 });
    const overflow = await active.locator(".site").evaluate(element => element.scrollWidth > element.clientWidth + 1);
    expect(overflow).toBe(false);
    await page.setViewportSize({ width: 320, height: 850 });
    expect(await active.locator(".site").evaluate(element => element.scrollWidth > element.clientWidth + 1)).toBe(false);
    expect(await active.locator("img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("review cannot read staff context or reach the network", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  const frame = page.frames().find(candidate => candidate.parentFrame());
  expect(frame).toBeDefined();
  await expect(page.frameLocator("iframe").getByRole("combobox", { name: "Concept", exact: true })).toBeVisible();
  const isolation = await frame!.evaluate(async () => {
    let parentBlocked = false;
    let storageBlocked = false;
    let networkBlocked = false;
    try { void parent.document.body; } catch { parentBlocked = true; }
    try { void localStorage.length; } catch { storageBlocked = true; }
    try { await fetch("https://example.test/review-probe"); } catch { networkBlocked = true; }
    return { parentBlocked, storageBlocked, networkBlocked };
  });
  expect(isolation).toEqual({ parentBlocked: true, storageBlocked: true, networkBlocked: true });
  expect(requests).toEqual([]);
});

for (const concept of ["Signature Showroom", "Simple Hybrid"]) {
  test(`${concept}: rotates distinct vehicles, pauses, and supports manual navigation`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    const frame = page.frameLocator("iframe");
    await frame.getByRole("combobox", { name: "Concept", exact: true }).selectOption(concept);
    const active = frame.locator("[data-variant]:not([hidden])");
    const image = active.locator(".slide-image");
    const region = active.getByRole("region", { name: "Illustrative vehicle highlights" });
    await region.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute("data-slide-index", "0");
    const originalSource = await image.getAttribute("src");
    await page.mouse.move(0, 0);
    await page.clock.runFor(6100);
    await expect(image).toHaveAttribute("data-slide-index", "1");
    expect(await image.getAttribute("src")).not.toBe(originalSource);
    await active.getByRole("button", { name: "Pause slideshow", exact: true }).click();
    await active.locator("input").focus();
    await page.mouse.move(0, 0);
    await page.clock.runFor(12000);
    await expect(image).toHaveAttribute("data-slide-index", "1");
    await active.getByRole("button", { name: "Next", exact: true }).click();
    await expect(image).toHaveAttribute("data-slide-index", "2");
    await expect(image).toHaveAttribute("alt", /blue pickup/);
    await active.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(image).toHaveAttribute("data-slide-index", "1");
    await active.getByRole("button", { name: "Play slideshow", exact: true }).click();
    await active.locator("input").focus();
    await page.mouse.move(0, 0);
    await page.clock.runFor(6100);
    await expect(image).toHaveAttribute("data-slide-index", "2");
    await active.getByRole("button", { name: "Next", exact: true }).focus();
    await page.clock.runFor(12000);
    await expect(image).toHaveAttribute("data-slide-index", "2");
    await page.screenshot({ path: testInfo.outputPath("desktop-review.png"), fullPage: true });
    await frame.getByRole("combobox", { name: "Screen", exact: true }).selectOption("mobile");
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(active.locator(".site")).toHaveClass(/phone/);
    await page.frames().find(candidate => candidate.parentFrame())!.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath("mobile-review.png"), fullPage: true });
  });
}

test("reduced motion disables automatic rotation but preserves manual browsing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const frame = page.frameLocator("iframe");
  await frame.getByRole("combobox", { name: "Concept", exact: true }).selectOption("Simple Hybrid");
  const active = frame.locator("[data-variant]:not([hidden])");
  await active.locator(".vehicle-rotator").scrollIntoViewIfNeeded();
  await expect(active.getByRole("button", { name: "Autoplay off", exact: true })).toBeDisabled();
  await page.clock.runFor(18000);
  await expect(active.locator(".slide-image")).toHaveAttribute("data-slide-index", "0");
  await active.getByRole("button", { name: "Next", exact: true }).click();
  await expect(active.locator(".slide-image")).toHaveAttribute("data-slide-index", "1");
});

test("unselected templates do not keep rotating in the background", async ({ page }) => {
  const frame = page.frameLocator("iframe");
  const picker = frame.getByRole("combobox", { name: "Concept", exact: true });
  await picker.selectOption("Simple Hybrid");
  const hybrid = frame.locator('[data-variant="Simple Hybrid"]');
  await hybrid.locator(".vehicle-rotator").scrollIntoViewIfNeeded();
  await expect(hybrid.locator(".slide-image")).toHaveAttribute("data-slide-index", "0");
  await picker.selectOption("Search First");
  await page.clock.runFor(18000);
  await picker.selectOption("Simple Hybrid");
  await expect(hybrid.locator(".slide-image")).toHaveAttribute("data-slide-index", "0");
});
