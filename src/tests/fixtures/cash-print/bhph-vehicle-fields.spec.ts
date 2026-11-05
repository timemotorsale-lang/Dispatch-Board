import { test, expect } from "@playwright/test";
test("linked vehicle populates every recorded identity field and survives resumption", async ({ page }) => {
  await page.goto("/bhph.html");
  const expected = { VIN: "2T3W1RFVXRW333586", "Stock no.": "STOCK-42", Year: "2024", Make: "Toyota", Model: "RAV4", Trim: "XLE", Color: "Silver", Plate: "DEMO42", Mileage: "54000" };
  for (const [name, value] of Object.entries(expected)) await expect(page.getByRole("textbox", { name, exact: true })).toHaveValue(value);
  await expect(page.getByRole("combobox", { name: "Odometer status", exact: true })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Lot / key location", exact: true })).toHaveValue("Key tag 42");
  await page.getByRole("textbox", { name: "Lot / key location", exact: true }).fill("Bay 3 / tag 19");
  await page.getByRole("button", { name: "Reopen saved fields" }).click();
  await expect(page.getByRole("textbox", { name: "Lot / key location", exact: true })).toHaveValue("Bay 3 / tag 19");
  await expect(page.getByRole("textbox", { name: "Year", exact: true })).toHaveValue("2024");
});
test("changing vehicle clears prior vehicle notes and does not invent missing details", async ({ page }) => {
  await page.goto("/bhph.html");
  await page.getByRole("button", { name: "Switch vehicle" }).click();
  await expect(page.getByRole("textbox", { name: "VIN", exact: true })).toHaveValue("1NXBR32E85Z123456");
  for (const name of ["Plate", "Mileage", "Trim", "Lot / key location"]) await expect(page.getByRole("textbox", { name, exact: true })).toHaveValue("");
  await page.getByRole("textbox", { name: "Trim", exact: true }).fill("Recorded by staff");
  await page.getByRole("button", { name: "Reopen saved fields" }).click();
  await expect(page.getByRole("textbox", { name: "Trim", exact: true })).toHaveValue("Recorded by staff");
});
