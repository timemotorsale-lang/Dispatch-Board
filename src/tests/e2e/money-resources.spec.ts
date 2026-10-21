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

test("vendor purchasing authorization, prior approval and complete expense reporting work together", async ({ browser, baseURL }) => {
  test.setTimeout(120000);
  const fixture = JSON.parse(readFileSync("tmp/money-resources/browser-fixture.json", "utf8"));
  const manager = await browser.newContext(), worker = await browser.newContext();
  manager.setDefaultTimeout(15000); worker.setDefaultTimeout(15000);
  await manager.addCookies([{ name: "dispatch-board-session", value: fixture.managerToken, url: baseURL! }]);
  await worker.addCookies([{ name: "dispatch-board-session", value: fixture.workerToken, url: baseURL! }]);
  const management = await manager.newPage(), staff = await worker.newPage();
  for (const page of [management, staff]) await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside isolated money review." } }));
  const post = (page: typeof staff) => page.waitForResponse(response => response.url().endsWith("/api/money-resources") && response.request().method() === "POST");
  try {
    await management.goto(`${baseURL}/money-resources`);
    await management.getByRole("button", { name: "Purchasing authorizations", exact: true }).click();
    await management.getByLabel("Authorized employee", { exact: true }).selectOption(fixture.workerId);
    await management.getByLabel("Approved vendor", { exact: true }).selectOption(fixture.vendorId);
    await management.getByLabel("Stored company card", { exact: true }).selectOption(fixture.vendorCardId);
    await management.getByLabel("Per-purchase limit ($)", { exact: true }).fill("100");
    await management.getByLabel("Expires on", { exact: true }).fill(fixture.expiresOn);
    await management.getByLabel("Permitted business purposes", { exact: true }).fill("Browser-reviewed parts for recon");
    await management.getByRole("checkbox", { name: "Parts", exact: true }).check();
    await management.getByRole("checkbox", { name: "Prior approval required for every purchase", exact: true }).check();
    const authorizationSaved = post(management);
    await management.getByRole("button", { name: "Save purchasing authorization", exact: true }).click();
    const authorizationResponse = await authorizationSaved, policy = await authorizationResponse.json();
    expect(authorizationResponse.status(), policy.error).toBe(200);
    await staff.goto(`${baseURL}/money-resources`);
    await staff.getByRole("button", { name: "Purchasing authorizations", exact: true }).click();
    await expect(staff.getByRole("button", { name: "Save purchasing authorization", exact: true })).toHaveCount(0);
    await staff.getByLabel("Purchasing authorization", { exact: true }).selectOption(policy.id);
    await staff.getByLabel("Purchase amount ($)", { exact: true }).fill("75");
    await staff.getByLabel("Purchase purpose", { exact: true }).fill("Browser authorized vendor purchase");
    const approvalRequested = post(staff);
    await staff.getByRole("button", { name: "Request prior approval", exact: true }).click();
    const requestResponse = await approvalRequested, approval = await requestResponse.json();
    expect(requestResponse.status(), approval.error).toBe(200);
    await management.reload();
    await management.getByRole("button", { name: "Purchasing authorizations", exact: true }).click();
    const requestRow = management.locator("article").filter({ hasText: "Browser authorized vendor purchase" });
    await requestRow.getByLabel("Decision reason", { exact: true }).fill("Exact parts purchase reviewed before buying");
    const approvalSaved = post(management);
    await requestRow.getByRole("button", { name: "Save purchase decision", exact: true }).click();
    expect((await approvalSaved).status()).toBe(200);
    await staff.reload();
    await staff.getByLabel("Vendor purchasing authorization", { exact: true }).selectOption(policy.id);
    await expect(staff.getByLabel("Funding source", { exact: true })).toHaveValue(fixture.vendorCardId);
    await staff.getByLabel("Prior approval", { exact: true }).selectOption(approval.id);
    await expect(staff.getByLabel("Amount ($)", { exact: true })).toHaveValue("75.00");
    await staff.getByLabel("Receipt (optional now)").setInputFiles({ name: "vendor.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nAuthorized browser purchase\n%%EOF") });
    const purchaseSaved = post(staff);
    await staff.getByRole("button", { name: "Save spending", exact: true }).click();
    const purchaseResponse = await purchaseSaved, purchase = await purchaseResponse.json();
    expect(purchaseResponse.status(), purchase.error).toBe(200); expect(purchase.employeeId).toBe(fixture.workerId); expect(purchase.purchasingSnapshot.flags).toEqual([]);
    await expect(staff.getByRole("status")).toContainText("Spending and receipt saved");
    await staff.getByRole("button", { name: "Expense report", exact: true }).click();
    const report = staff.getByRole("region", { name: "Expense report", exact: true });
    await report.getByLabel("Vendor", { exact: true }).selectOption(fixture.vendorId);
    await report.getByLabel("Card / funding source", { exact: true }).selectOption(fixture.vendorCardId);
    await report.getByRole("button", { name: "View expense report", exact: true }).click();
    await expect(report.getByRole("status")).toContainText("1 records");
    await expect(report.getByRole("status")).toContainText("$75.00");
    await expect(report.getByRole("link", { name: "View receipt", exact: true })).toBeVisible();
    const csvResponse = await worker.request.get(`${baseURL}${await report.getByRole("link", { name: "Export complete report CSV", exact: true }).getAttribute("href")}`);
    expect(csvResponse.status()).toBe(200); expect(await csvResponse.text()).toContain("Browser authorized vendor purchase");
    const print = await worker.newPage();
    await print.goto(`${baseURL}${await report.getByRole("link", { name: "Print complete report", exact: true }).getAttribute("href")}`);
    await expect(print.getByRole("heading", { name: "Expense report", exact: true })).toBeVisible();
    await expect(print.getByText("Browser authorized vendor purchase", { exact: true })).toBeVisible();
    await print.screenshot({ path: test.info().outputPath("expense-report-print.png"), fullPage: true });
    expect((await worker.request.get(`${baseURL}/api/money-resources/reports?employeeId=${fixture.managerId}`)).status()).toBe(403);
    await staff.setViewportSize({ width: 390, height: 844 });
    await staff.screenshot({ path: test.info().outputPath("expense-report-mobile.png"), fullPage: true });
    expect(await staff.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
  } catch (error) {
    for (const [name, page] of [["manager", management], ["staff", staff]] as const) if (page.url() !== "about:blank") { await test.info().attach(`${name}-form`, { body: await page.locator("main").last().innerText({ timeout: 1000 }), contentType: "text/plain" }); await page.screenshot({ path: test.info().outputPath(`${name}-failure.png`), fullPage: true }); }
    throw error;
  } finally { await manager.close(); await worker.close(); }
});
