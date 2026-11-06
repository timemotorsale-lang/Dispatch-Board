import { test, expect, type Page } from "@playwright/test";
async function example(page: Page) {
  await page.goto("/bhph.html");
  await page.getByLabel("Fixture sale price").fill("28895");
  await page.getByLabel("Fixture down payment").fill("15000");
  return page.getByRole("region", { name: "Minnesota BHPH taxes and fees" });
}
test("the exact malformed registration entry is flagged and the error clears after correction", async ({ page }) => {
  const fees = await example(page), registration = fees.getByRole("textbox", { name: "Registration fee / tax", exact: true });
  await registration.fill("$417.00/0");
  await expect(registration).toHaveAttribute("aria-invalid", "true");
  await expect(registration).toHaveValue("$417.00/0");
  await expect(fees.getByRole("alert")).toContainText("Registration fee / tax: enter one amount");
  await registration.fill("$417.00");
  await expect(registration).toHaveAttribute("aria-invalid", "false");
  await expect(fees.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Calculated payment", exact: true })).toHaveValue("$694.03");
});
test("staff choose either term or fixed payment and saved mode and inputs resume accurately", async ({ page }) => {
  const fees = await example(page);
  await fees.getByRole("textbox", { name: "Registration fee / tax", exact: true }).fill("417.00");
  const calculator = page.getByRole("region", { name: "BHPH payment calculator" });
  await calculator.getByRole("spinbutton", { name: "Term (months)", exact: true }).fill("36");
  await expect(calculator.getByRole("textbox", { name: "Fixed payment amount", exact: true })).toHaveCount(0);
  await calculator.getByRole("combobox", { name: "Calculate using", exact: true }).selectOption("PAYMENT_AMOUNT");
  await expect(calculator.getByRole("spinbutton", { name: "Term (months)", exact: true })).toHaveCount(0);
  await expect(calculator.getByRole("textbox", { name: "Fixed payment amount", exact: true })).toHaveValue("500");
  await expect(calculator.getByRole("textbox", { name: "Calculated term", exact: true })).toHaveValue("34 monthly payments (about 34 months)");
  await expect(calculator.getByText("$156.53", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Reopen saved fields" }).click();
  await expect(calculator.getByRole("combobox", { name: "Calculate using", exact: true })).toHaveValue("PAYMENT_AMOUNT");
  await expect(calculator.getByRole("textbox", { name: "Calculated term", exact: true })).toHaveValue("34 monthly payments (about 34 months)");
  await calculator.getByRole("combobox", { name: "Calculate using", exact: true }).selectOption("TERM");
  await expect(calculator.getByRole("spinbutton", { name: "Term (months)", exact: true })).toHaveValue("36");
  await expect(calculator.getByRole("textbox", { name: "Calculated payment", exact: true })).toHaveValue("$462.69");
});
test("mobile staff can edit a fixed payment and review its computed final installment", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fees = await example(page);
  await fees.getByRole("textbox", { name: "Registration fee / tax", exact: true }).fill("417");
  const calculator = page.getByRole("region", { name: "BHPH payment calculator" });
  await calculator.getByRole("combobox", { name: "Calculate using", exact: true }).selectOption("PAYMENT_AMOUNT");
  await calculator.getByRole("textbox", { name: "Fixed payment amount", exact: true }).fill("750");
  await expect(calculator.getByRole("textbox", { name: "Calculated term", exact: true })).toHaveValue("23 monthly payments (about 23 months)");
  await expect(calculator.getByText("$156.53", { exact: true }).first()).toBeVisible();
  await calculator.getByText("Review calculated payments", { exact: true }).click();
  await expect(calculator.getByRole("row")).toHaveCount(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
