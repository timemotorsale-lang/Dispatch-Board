import { test, expect } from "@playwright/test";

for (const legacyFee of [undefined, "$375.00"]) {
  test(`compact lease shares detailed calculations and preserves insurance (saved fee: ${legacyFee || "new default"})`, async ({ page }) => {
    test.setTimeout(120000); page.setDefaultTimeout(20000);
    let saved: { id: string; revision: number; status: string; pathway: string; customerName: string; vehicleReference: string; updatedAt: string; snapshot: Record<string, unknown> } = { id: "compact-lease-draft", revision: 1, status: "IN_PROGRESS", pathway: "lease-to-own", customerName: "Sample buyer", vehicleReference: "Sample vehicle", updatedAt: new Date().toISOString(), snapshot: { "desk:workflowId": "lease-to-own", "desk:executionOpen": true, "desk:manualCustomerName": "Sample buyer", "lease-to-own:leaseInputs": { wholesaleCost: "10000", capitalizedCostReduction: "3000", ...(legacyFee ? { documentPreparationFee: legacyFee } : {}) } } };
    let generated = 0;
    const packet = { packetId: "compact-preview", packetNumber: "COMPACT-SAMPLE", generatedAt: new Date().toISOString(), documents: [{ formId: "lease-summary", label: "Sample lease summary", html: "<h1>Sample lease</h1>" }], delivery: { downloadReady: true, printReady: true, emailReady: false, textReady: false } };
    await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside compact calculator test" } }));
    await page.route("**/api/crm/v1/deal-drafts*", route => {
      if (route.request().method() === "POST") saved = { ...route.request().postDataJSON(), revision: saved.revision + 1, updatedAt: new Date().toISOString() };
      return route.fulfill({ json: route.request().method() === "POST" || new URL(route.request().url()).searchParams.has("id") ? saved : [saved] });
    });
    await page.route("**/api/crm/v1/contract-packets**", route => {
      if (route.request().method() === "POST") {
        generated++;
        const body = route.request().postDataJSON();
        expect(body.leaseCalculator.agreedPriceCents).toBe(3000000); expect(body.leaseCalculator.targetPaymentCents).toBe(50000);
        expect(body.leaseCalculator.documentPreparationFeeCents).toBe(legacyFee ? 37500 : 30000);
        expect(body.leaseCalculator.registrationFeeCents).toBe(41700); expect(body.leaseCalculator.signingPaymentMode).toBe("DOWN_PAYMENT"); expect(body.leaseCalculator.downPaymentCents).toBe(1500000);
        expect(body.leaseFacts.insurancePolicyNumber).toBe("POLICY-SAMPLE-123"); expect(body.leaseFacts.insuranceExpirationDate).toBe("2027-11-01");
      }
      return route.fulfill({ status: route.request().method() === "POST" ? 201 : 200, json: packet });
    });
    await page.goto("/login"); await page.getByLabel("Email").fill("morgan.manager@local.test"); await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
    const login = page.waitForResponse(response => response.url().endsWith("/api/auth/login")); await page.getByRole("button", { name: "Sign in", exact: true }).click(); expect((await login).ok()).toBe(true);
    await page.goto("/crm-next/deals/start?draftId=compact-lease-draft");
    const calculator = page.locator("#lease-calculator");
    await expect(calculator.getByRole("button", { name: "Compact", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(calculator.getByLabel("Agreed price", { exact: true })).toHaveValue("$20,000.00");
    await expect(calculator.getByLabel("Wholesale cost", { exact: true })).toHaveCount(0);
    await page.getByLabel("Insurance company", { exact: true }).fill("Example Insurance");
    await page.getByLabel("Insurance policy number", { exact: true }).fill("POLICY-SAMPLE-123"); await page.getByLabel("Insurance expiration date", { exact: true }).fill("2027-11-01");
    await calculator.getByLabel("Agreed price", { exact: true }).fill("30000"); await calculator.getByLabel("Down payment", { exact: true }).fill("5000");
    await calculator.getByRole("radio", { name: "By payment amount", exact: true }).check();
    await calculator.getByLabel("Lease date", { exact: true }).fill("2026-11-01");
    const regular = calculator.locator("span").filter({ hasText: /^Base payment$/ }).locator("..").locator("strong");
    for (const amount of ["300", "500.00"]) { await calculator.getByLabel("Target payment amount", { exact: true }).fill(amount); await expect(regular).toHaveText(`$${Number(amount).toFixed(2)}`); }
    await calculator.getByText("Adjust fees and payment schedule", { exact: true }).click();
    await calculator.getByLabel("Registration fee", { exact: true }).fill("417");
    await expect(calculator.getByLabel("Sales tax rate", { exact: true })).toHaveValue("6.875"); await expect(calculator.getByLabel("Title fee", { exact: true })).toHaveValue("$102.80");
    await calculator.getByRole("button", { name: "Detailed", exact: true }).click();
    await expect(calculator.getByLabel("Calculation base (agreed price ÷2)", { exact: true })).toHaveValue("$15,000.00");
    await expect(calculator.getByLabel("Document prep fee", { exact: true })).toHaveValue(legacyFee || "$300.00"); await expect(regular).toHaveText("$500.00");
    await calculator.getByRole("button", { name: "Compact", exact: true }).click(); await expect(regular).toHaveText("$500.00");
    await calculator.getByRole("combobox", { name: "Signing amount entry", exact: true }).selectOption("DOWN_PAYMENT"); await calculator.getByLabel("Total cash at signing", { exact: true }).fill("15000"); await expect(regular).toHaveText("$500.00");
    await page.getByRole("button", { name: "Open lease packet", exact: true }).click(); await page.getByRole("button", { name: "Generate lease packet", exact: true }).click();
    await expect(page.locator('[aria-label="Generated lease packet archive"]')).toContainText("COMPACT-SAMPLE");
    await expect.poll(() => saved.snapshot["lease-to-own:generatedPacketId"]).toBe("compact-preview"); expect(generated).toBe(1);
    await page.reload(); await expect(page.getByLabel("Insurance policy number", { exact: true })).toHaveValue("POLICY-SAMPLE-123");
    await expect(page.getByLabel("Insurance expiration date", { exact: true })).toHaveValue("2027-11-01");
    await expect(calculator.getByLabel("Target payment amount", { exact: true })).toHaveValue("500.00"); await expect(regular).toHaveText("$500.00");
  });
}
