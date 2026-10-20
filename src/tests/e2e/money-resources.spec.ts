import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test.skip(process.env.RUN_MONEY_BROWSER !== "1", "Requires an isolated money review database and staff sessions.");
test("staff record a receipt-backed purchase and management matches the actual card statement", async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  const fixture = JSON.parse(readFileSync("tmp/money-resources/browser-fixture.json", "utf8"));
  const manager = await browser.newContext(), worker = await browser.newContext();
  manager.setDefaultTimeout(15000); worker.setDefaultTimeout(15000);
  await manager.addCookies([{ name: "dispatch-board-session", value: fixture.managerToken, url: baseURL! }]);
  await worker.addCookies([{ name: "dispatch-board-session", value: fixture.workerToken, url: baseURL! }]);
  const management = await manager.newPage(), staff = await worker.newPage();
  const errors: string[] = [];
  for (const page of [management, staff]) {
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Operating rhythm outside this isolated money test." } }));
  }
  try {
    await management.goto(`${baseURL}/money-resources`);
    await management.getByLabel("Amount ($)", { exact: true }).fill("108");
    await management.getByLabel("Paid to", { exact: true }).fill("Amazon");
    await management.getByLabel("Business purpose", { exact: true }).fill("Manager-entered staff fender purchase");
    await management.getByLabel("Paid using").selectOption("CARD");
    await management.getByRole("button", { name: "+ Add company card", exact: true }).click();
    const addCard = management.getByRole("region", { name: "Add company card", exact: true });
    await addCard.getByLabel("Card name", { exact: true }).fill("Browser review card");
    await addCard.getByLabel("Cardholder", { exact: true }).selectOption(fixture.workerId);
    await addCard.getByLabel("Last four digits", { exact: true }).fill("7788");
    const accountSaved = management.waitForResponse(response => response.url().endsWith("/api/money-resources") && response.request().method() === "POST");
    await addCard.getByRole("button", { name: "Save card & select" }).click();
    const accountResponse = await accountSaved; const card = await accountResponse.json(); expect(accountResponse.status(), card.error).toBe(200);
    await expect(management.getByLabel("Funding source", { exact: true })).toHaveValue(card.id);
    await expect(management.getByLabel("Amount ($)", { exact: true })).toHaveValue("108");
    await expect(management.getByLabel("Business purpose", { exact: true })).toHaveValue("Manager-entered staff fender purchase");
    await expect(management.getByText(/Responsible staff:/)).toBeVisible();
    const proxySaved = management.waitForResponse(response => response.url().endsWith("/api/money-resources") && response.request().method() === "POST");
    await management.getByRole("button", { name: "Save spending", exact: true }).click();
    const proxyResponse = await proxySaved;
    expect(proxyResponse.status()).toBe(200);
    expect((await proxyResponse.json()).employeeId).toBe(fixture.workerId);

    await staff.goto(`${baseURL}/money-resources`);
    await expect(staff.getByRole("heading", { name: "Record spending", exact: true })).toBeVisible();
    await expect(staff.getByRole("button", { name: "+ Add company card", exact: true })).toHaveCount(0);
    await staff.getByLabel("Paid using").selectOption("CARD");
    await staff.getByLabel("Funding source", { exact: true }).selectOption(card.id, { timeout: 15000 });
    await staff.getByLabel("Amount ($)", { exact: true }).fill("45.67");
    await staff.getByLabel("Paid to", { exact: true }).fill("Browser Parts");
    await staff.getByLabel("Business purpose", { exact: true }).fill("Browser-tested company card purchase");
    await staff.getByLabel("Receipt (optional now)").setInputFiles({ name: "receipt.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nIsolated browser receipt\n%%EOF") });
    const spendingSaved = staff.waitForResponse(response => response.url().endsWith("/api/money-resources") && response.request().method() === "POST");
    await staff.getByRole("button", { name: "Save spending", exact: true }).click();
    const spendingResponse = await spendingSaved; expect(spendingResponse.status()).toBe(200);
    const spending = await spendingResponse.json();
    await expect(staff.getByRole("status")).toContainText("Spending and receipt saved");
    const receipt = await worker.request.get(`${baseURL}/api/money-resources/${spending.id}/receipt`);
    expect(receipt.status()).toBe(200); expect((await receipt.body()).toString()).toContain("Isolated browser receipt");
    expect((await worker.request.get(`${baseURL}/api/money-resources/journal?date=${fixture.day}`)).status()).toBe(403);

    await management.reload();
    await management.getByRole("button", { name: "Review", exact: true }).click();
    const purchase = management.locator("article").filter({ hasText: "Browser-tested company card purchase" });
    await purchase.getByRole("button", { name: "Review", exact: true }).click();
    const review = management.getByRole("region", { name: "Selected money action" });
    await review.getByLabel("Note / reason").fill("Receipt verified against actual card purchase");
    await review.getByRole("button", { name: "Confirm action" }).click();
    await expect(management.getByRole("status")).toContainText("Action recorded");

    await management.getByRole("button", { name: "Card transactions", exact: true }).click();
    const importer = management.locator("section").filter({ has: management.getByRole("heading", { name: "Import posted card transactions", exact: true }) });
    await importer.getByLabel("Funding source", { exact: true }).selectOption(card.id);
    await importer.getByLabel("Statement CSV").setInputFiles({ name: "statement.csv", mimeType: "text/csv", buffer: Buffer.from(`transaction_id,date,merchant,amount\nBROWSER-${spending.id},${fixture.day},Browser Parts,45.67`) });
    await importer.getByRole("button", { name: "Import statement" }).click();
    await expect(management.getByRole("status")).toContainText("1 statement lines imported");
    const charge = management.locator("article").filter({ hasText: `BROWSER-${spending.id}` });
    await charge.getByLabel("Approved matching record").selectOption(spending.id);
    await charge.getByRole("button", { name: "Match transaction", exact: true }).click();
    await expect(management.getByRole("status")).toContainText("no new expense created");
    await expect(charge).toContainText("Matched");

    await staff.setViewportSize({ width: 390, height: 844 });
    await staff.reload();
    const form = staff.getByRole("heading", { name: "Record spending", exact: true });
    await expect(form).toBeVisible();
    await staff.getByLabel("Amount ($)", { exact: true }).fill("10.00");
    await staff.getByLabel("Business purpose", { exact: true }).fill("Independent second browser purchase");
    await staff.getByRole("button", { name: "Save & add another", exact: true }).click();
    await expect(staff.getByRole("status")).toContainText("Receipt pending");
    await expect(staff.getByLabel("Amount ($)", { exact: true })).toHaveValue("");
    await staff.screenshot({ path: test.info().outputPath("money-resources-mobile.png"), fullPage: true });
    expect(await staff.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
    expect(errors).toEqual([]);
  } catch (error) {
    await test.info().attach("manager-form", { body: await management.locator("main").last().innerText({ timeout: 1000 }), contentType: "text/plain" });
    await management.screenshot({ path: test.info().outputPath("manager-form-failure.png"), fullPage: true });
    if (staff.url() !== "about:blank") {
      await test.info().attach("staff-form", { body: await staff.locator("main").last().innerText({ timeout: 1000 }), contentType: "text/plain" });
      await staff.screenshot({ path: test.info().outputPath("staff-form-failure.png"), fullPage: true });
    }
    throw error;
  } finally { await manager.close(); await worker.close(); }
});
