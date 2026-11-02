import { test, expect } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { CASH_SALE_FORM_IDS, CASH_SALE_LABELS, EMPTY_CASH_SALE } from "../../lib/cash-retail-sale";

test("cash sale uses the same deal for sold-first, selected PDF forms and paperwork follow-up", async ({ page }) => {
  test.setTimeout(120000);
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText("Synthetic cash sale document", { x: 50, y: 700, font });
  const contentBase64 = Buffer.from(await pdf.save()).toString("base64");
  const facts = { ...EMPTY_CASH_SALE, buyerAddress: "100 Sample Street, Minneapolis, MN 55407", dealerLicense: "SAMPLE-1234", saleDate: "2026-11-01", mileage: "53421", odometerStatus: "Actual", titleBrand: "None", damageDisclosure: "None known", authorizedAgent: "Sample Title Clerk", poaExpiration: "2026-12-01", warrantyType: "Dealer limited warranty", warrantyCoverage: "Engine and transmission; statutory coverage preserved", warrantyDuration: "30 days or 1,000 miles" };
  let saved = { id: "cash-sample-draft", revision: 1, status: "IN_PROGRESS", pathway: "retail-sale", customerName: "Sample Cash Buyer", vehicleReference: "Sample Toyota RAV4", updatedAt: new Date().toISOString(), snapshot: { "desk:workflowId": "retail-sale", "desk:selectedPresetId": "retail-cash-one-pay", "desk:executionOpen": true, "desk:manualCustomerName": "Sample Cash Buyer", "desk:form": { customerId: "__manual_customer__", vehicle: "Sample Toyota RAV4", amount: "20000" }, "retail-sale:cashSaleFacts": facts, "retail-sale:vehicleFacts": { year: "2024", make: "Toyota", model: "RAV4", vin: "2T3W1RFVXRW333586", stockNumber: "333586", color: "Silver" } } as Record<string, unknown> };
  let generations = 0;
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside cash packet test" } }));
  const packet = { packetId: "sample-cash-packet", jacketId: "sample-cash-jacket", packetNumber: "CASH-SAMPLE", generatedAt: new Date().toISOString(), documents: CASH_SALE_FORM_IDS.map(formId => ({ formId, label: CASH_SALE_LABELS[formId], contentType: "application/pdf", contentBase64, signatureStatus: "UNSIGNED" })) };
  await page.route("**/api/crm/v1/contract-packets**", route => {
    if (route.request().method() !== "POST") return route.fulfill({ json: packet });
    generations++;
    const body = route.request().postDataJSON();
    expect(body.retailCash.authorizedAgent).toBe("Sample Title Clerk"); expect(body.vehicle.vin).toBe("2T3W1RFVXRW333586");
    expect(body.preparedFormIds).toEqual(CASH_SALE_FORM_IDS);
    return route.fulfill({ status: 201, json: packet });
  });
  await page.route("**/api/crm/v1/deal-drafts*", route => {
    const request = route.request();
    if (request.method() === "PATCH") {
      const body = request.postDataJSON(); expect(body.action).toBe("MARK_SOLD"); expect(body.id).toBe(saved.id);
      saved = { ...saved, revision: saved.revision + 1, status: "SOLD" };
      return route.fulfill({ json: { id: saved.id, revision: saved.revision, status: "SOLD", jacketId: null, state: null } });
    }
    if (request.method() === "POST") saved = { ...saved, ...request.postDataJSON(), revision: saved.revision + 1, updatedAt: new Date().toISOString() };
    if (new URL(request.url()).searchParams.get("view") === "operations") return route.fulfill({ json: { draftRevision: saved.revision } });
    return route.fulfill({ json: request.method() === "POST" || new URL(request.url()).searchParams.has("id") ? saved : [saved] });
  });
  await page.goto("/login"); await page.getByLabel("Email").fill("morgan.manager@local.test"); await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const login = page.waitForResponse(r => r.url().endsWith("/api/auth/login")); await page.getByRole("button", { name: "Sign in", exact: true }).click(); expect((await login).ok()).toBe(true);
  await page.goto("/crm-next/deals/start?draftId=cash-sample-draft");
  const cash = page.getByLabel("Cash retail sale workflow");
  await expect(cash).toBeVisible(); await cash.getByRole("button", { name: "Mark deal sold", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Mark deal sold", exact: true }); await dialog.getByRole("checkbox").check(); await dialog.getByRole("button", { name: "Mark deal sold", exact: true }).click();
  await expect(cash.getByRole("button", { name: "Sold · complete paperwork", exact: true })).toHaveAttribute("data-completion", "pending");
  expect(generations).toBe(0);
  await cash.getByRole("button", { name: "Open cash sale packet" }).click();
  const drawer = page.getByRole("dialog", { name: "Cash sale packet", exact: true });
  await expect(drawer.getByRole("button", { name: "Preview generated packet" })).toBeDisabled();
  await drawer.getByRole("button", { name: "Generate cash sale packet", exact: true }).click();
  await expect(drawer.getByRole("status")).toContainText("Packet saved on this deal");
  await drawer.getByRole("button", { name: "Preview generated packet" }).click();
  await expect(drawer.locator("iframe")).toHaveAttribute("src", /^blob:/);
  await drawer.getByRole("combobox", { name: "Document", exact: true }).selectOption("power-of-attorney");
  await expect(drawer.locator("iframe")).toHaveAttribute("title", "Limited motor vehicle power of attorney");
  await page.screenshot({ path: test.info().outputPath("cash-packet-preview.png") });
  const download = page.waitForEvent("download"); await drawer.getByRole("button", { name: "Download print packet (PDF)", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("cash-sale-CASH-SAMPLE.pdf"); expect(generations).toBe(1); expect(saved.status).toBe("SOLD");
  await drawer.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("region", { name: "Saved deal drafts", exact: true }).getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await expect(cash.getByRole("button", { name: "Sold · complete paperwork", exact: true })).toBeVisible();
  await cash.getByRole("button", { name: "Open cash sale packet" }).click();
  await expect(drawer.getByRole("button", { name: "Preview generated packet" })).toBeEnabled();
  expect(generations).toBe(1);
  await drawer.getByRole("button", { name: "Close", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await cash.scrollIntoViewIfNeeded();
  expect(await cash.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("cash-mobile.png") });
});
