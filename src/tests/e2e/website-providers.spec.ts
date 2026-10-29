import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";

const reviewUrl = process.env.WEBSITE_PROVIDERS_REVIEW_URL;

test("provider directory supports review, filtering, safe links and complete checklist export", async ({ page }) => {
  test.skip(!reviewUrl, "Requires the isolated provider-component review harness; server authorization is covered by unit tests.");
  await page.goto(reviewUrl!);
  await expect(page.getByRole("heading", { name: "Provider & Integration Directory", exact: true })).toBeVisible();
  await expect(page.getByText("22 of 22 capabilities shown.", { exact: false })).toBeVisible();
  await page.getByLabel("Find a provider or capability", { exact: true }).fill("Stripe");
  await expect(page.getByText("1 of 22 capabilities shown.", { exact: false })).toBeVisible();
  await page.getByText("Why we need it & how to configure it", { exact: true }).click();
  await expect(page.getByText("ACH is delayed and can fail or be disputed.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /Review Stripe ACH/ })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: /Review Stripe ACH/ })).toHaveAttribute("rel", "noopener noreferrer");
  await page.getByLabel("Requirement", { exact: true }).selectOption("Foundation");
  await expect(page.getByRole("heading", { name: "No matching capabilities", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show all capabilities", exact: true }).click();
  await expect(page.getByText("22 of 22 capabilities shown.", { exact: false })).toBeVisible();
  await page.getByLabel("Requirement", { exact: true }).selectOption("Deferred");
  await expect(page.getByRole("heading", { name: "AI agents & advanced automation", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset filters", exact: true }).click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('section[aria-labelledby="website-provider-directory"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
  }
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download full setup checklist", exact: true }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("time-motor-sales-provider-setup-checklist-v1.txt");
  const content = await fs.readFile((await file.path())!, "utf8");
  expect(content).toContain("No vendor selected");
  expect(content).toContain("Licensed VIN-associated vehicle imagery");
  expect(content).toContain("AI agents & advanced automation");
  expect(content).toContain("Decision notes");
  await expect(page.getByText("Checklist downloaded.", { exact: false })).toBeVisible();
});
