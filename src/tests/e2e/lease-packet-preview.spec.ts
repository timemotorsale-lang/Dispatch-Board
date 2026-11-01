import { test, expect } from "@playwright/test";

for (const saveError of [null, "This draft was changed in another window. Reopen the saved draft before continuing; your current entries have not been replaced.", "Saving timed out while checking the deal. Retry saving this same deal."]) {
test(saveError?.includes("timed out") ? "lease save retry recovers without generating a duplicate deal" : saveError ? "lease preview displays the exact save conflict inside the drawer, including on retry" : "lease forms generate first and preview opens separately", async ({ page }) => {
  test.setTimeout(120000);
  let generated = 0;
  let failing = Boolean(saveError);
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside preview test" } }));
  let saved = {
    id: "lease-preview-draft", revision: 1, status: "IN_PROGRESS", pathway: "lease-to-own", customerName: "Preview buyer", vehicleReference: "Preview vehicle", updatedAt: new Date().toISOString(),
    snapshot: { "desk:workflowId": "lease-to-own", "desk:executionOpen": true, "lease-to-own:leaseInputs": { wholesaleCost: "$10000.00", capitalizedCostReduction: "$3000.00" } },
  };
  const packet = { packetId: "preview-packet", packetNumber: "PREVIEW-1", generatedAt: new Date().toISOString(), documents: [{ formId: "lease-summary", label: "Lease summary preview", html: "<h1>Preview buyer lease summary</h1>" }], delivery: { downloadReady: true, printReady: true, textReady: false, emailReady: false } };
  await page.route("**/api/crm/v1/deal-drafts*", route => {
    const request = route.request();
    if (request.method() === "POST" && failing) return route.fulfill({ status: saveError?.includes("timed out") ? 503 : 409, json: { error: saveError } });
    if (request.method() === "POST") saved = { ...request.postDataJSON(), revision: saved.revision + 1, updatedAt: new Date().toISOString() };
    return route.fulfill({ json: request.method() === "POST" || new URL(request.url()).searchParams.has("id") ? saved : [saved] });
  });
  await page.route("**/api/crm/v1/contract-packets", route => { generated += 1; return route.fulfill({ status: 201, json: packet }); });
  await page.route("**/api/crm/v1/contract-packets/preview-packet", route => route.fulfill({ json: packet }));
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test");
  await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const signedIn = page.waitForResponse(response => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await signedIn).ok()).toBe(true);
  await page.goto("/crm-next/deals/start?draftId=lease-preview-draft");
  await page.getByRole("button", { name: "Open lease packet", exact: true }).click();
  await expect(page.getByRole("button", { name: "Preview generated packet", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Generate lease packet", exact: true }).click();
  if (saveError) {
    const drawer = page.getByRole("complementary", { name: "Lease-to-own packet drawer", exact: true });
    await expect(drawer.getByRole("alert")).toContainText(saveError);
    if (saveError.includes("timed out")) {
      failing = false;
      await page.getByRole("button", { name: "Retry saving this deal", exact: true }).click();
      await expect(drawer.getByRole("status")).toContainText("Deal saved.");
      expect(generated).toBe(0);
      await page.getByRole("button", { name: "Generate lease packet", exact: true }).click();
    } else {
    await page.getByRole("button", { name: "Retry saving this deal", exact: true }).click();
    await expect(drawer.getByRole("alert")).toContainText(saveError);
    expect(generated).toBe(0);
    return;
    }
  }
  const preview = page.getByRole("complementary", { name: "Lease packet preview", exact: true });
  await expect(preview).toHaveCount(0);
  await page.getByRole("button", { name: "Preview generated packet", exact: true }).click();
  await expect(preview).toBeVisible();
  await expect(page.frameLocator('iframe[title="Lease summary preview"]').getByRole("heading", { name: "Preview buyer lease summary" })).toBeVisible();
  expect(generated).toBe(1);
  await preview.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Preview generated packet", exact: true }).click();
  await expect(preview).toBeVisible();
  expect(generated).toBe(1);
});
}

for (const mode of ["closed", "load-error", "load-timeout", "legacy-link", "legacy-reference", "changed-forms"]) {
  test(`lease saved preview: ${mode}`, async ({ page }) => {
    test.setTimeout(120000); page.setDefaultTimeout(15000);
    let generations = 0, saves = 0, failLoad = mode === "load-error" || mode === "load-timeout";
    if (mode === "load-timeout") await page.addInitScript(() => {
      const timeout = AbortSignal.timeout.bind(AbortSignal);
      AbortSignal.timeout = milliseconds => timeout(milliseconds === 30000 ? 250 : milliseconds);
    });
    let selectedForms: string[] = [];
    const snapshot: Record<string, unknown> = { "desk:workflowId": "lease-to-own", "desk:executionOpen": true, "lease-to-own:leaseInputs": { wholesaleCost: "$10000.00", capitalizedCostReduction: "$3000.00" }, ...(mode === "legacy-link" ? { jackets: { "lease-to-own": "existing-jacket" } } : mode === "legacy-reference" ? { references: { "crm-next:document-jacket:buyer:lease-to-own:vehicle": "old-reference" } } : { "lease-to-own:generatedPacketId": "preview-packet" }) };
    let saved = { id: "lease-preview-draft", revision: 1, status: mode === "closed" ? "SOLD" : "IN_PROGRESS", pathway: "lease-to-own", customerName: "Preview buyer", vehicleReference: "Preview vehicle", updatedAt: new Date().toISOString(), snapshot };
    const packet = { packetId: "preview-packet", packetNumber: "PREVIEW-1", generatedAt: new Date().toISOString(), documents: [{ formId: "lease-summary", label: "Lease summary preview", html: "<h1>Previous saved lease</h1>" }], delivery: { downloadReady: true, printReady: true, textReady: false, emailReady: false } };
    await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside preview test" } }));
    await page.route("**/api/sales-documents/existing-jacket", route => route.fulfill({ json: { documents: [] } }));
    await page.route("**/api/crm/v1/deal-drafts*", route => {
      const request = route.request();
      if (request.method() === "POST") {
        saves++;
        if (mode === "closed") return route.fulfill({ status: 409, json: { error: "Final paperwork is preserved. Reopen for corrections." } });
        saved = { ...request.postDataJSON(), revision: saved.revision + 1, updatedAt: new Date().toISOString() };
      }
      return route.fulfill({ json: request.method() === "POST" || new URL(request.url()).searchParams.has("id") ? saved : [saved] });
    });
    await page.route("**/api/crm/v1/contract-packets**", async route => {
      if (route.request().method() === "POST") {
        generations++; selectedForms = route.request().postDataJSON().preparedFormIds;
        return route.fulfill({ status: 201, json: { ...packet, packetId: "updated-preview", packetNumber: "PREVIEW-2", documents: [{ ...packet.documents[0], html: "<h1>Updated lease preview</h1>" }] } });
      }
      if (failLoad && mode === "load-timeout") await new Promise(resolve => setTimeout(resolve, 1200));
      return failLoad ? route.fulfill({ status: 503, json: { error: "Saved preview archive is temporarily unavailable." } }) : route.fulfill({ json: packet });
    });
    await page.goto("/login"); await page.getByLabel("Email").fill("morgan.manager@local.test"); await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
    const login = page.waitForResponse(response => response.url().endsWith("/api/auth/login")); await page.getByRole("button", { name: "Sign in", exact: true }).click(); expect((await login).ok()).toBe(true);
    await page.goto("/crm-next/deals/start?draftId=lease-preview-draft");
    await page.getByRole("button", { name: "Open lease packet", exact: true }).click();
    const drawer = page.getByRole("complementary", { name: "Lease-to-own packet drawer", exact: true });
    if (failLoad) {
      await expect(drawer.getByRole("alert")).toContainText(mode === "load-timeout" ? "taking too long to open" : "Saved preview archive is temporarily unavailable.");
      await expect(drawer.getByRole("button", { name: "Preview generated packet", exact: true })).toBeDisabled();
      expect(generations).toBe(0); failLoad = false;
      await drawer.getByRole("button", { name: "Retry opening saved packet", exact: true }).click();
    }
    await drawer.getByRole("button", { name: "Preview generated packet", exact: true }).click();
    const preview = page.getByRole("complementary", { name: "Lease packet preview", exact: true });
    await expect(page.frameLocator('iframe[title="Lease summary preview"]').getByRole("heading", { name: "Previous saved lease" })).toBeVisible();
    expect(generations).toBe(0);
    if (mode === "closed") {
      expect(saves).toBe(0);
      await preview.getByRole("button", { name: "Close", exact: true }).click();
      await drawer.getByRole("button", { name: "Generate lease packet", exact: true }).click();
      await expect(drawer.getByRole("alert")).toContainText("Final paperwork is preserved");
      await expect(drawer.getByRole("link", { name: "Open deal actions", exact: true })).toBeVisible();
      expect(generations).toBe(0);
      await drawer.getByRole("button", { name: "Preview generated packet", exact: true }).click();
      await expect(preview).toBeVisible();
    }
    if (mode !== "changed-forms") return;
    await preview.getByRole("button", { name: "Close", exact: true }).click();
    const addendum = drawer.locator("label").filter({ hasText: "Excluded Driver" }).getByRole("checkbox");
    await expect(addendum).toBeChecked(); await addendum.uncheck();
    await expect(drawer.getByRole("status").filter({ hasText: "Deal details or selected forms have changed" })).toBeVisible();
    await drawer.getByRole("button", { name: "Preview generated packet", exact: true }).click();
    await expect(preview).toContainText("Previous saved copy"); expect(generations).toBe(0);
    await preview.getByRole("button", { name: "Close", exact: true }).click();
    await drawer.getByRole("button", { name: "Generate lease packet", exact: true }).click();
    await expect(drawer.locator('[aria-label="Generated lease packet archive"]')).toContainText("PREVIEW-2");
    await expect(preview).toHaveCount(0);
    await drawer.getByRole("button", { name: "Preview generated packet", exact: true }).click();
    await expect(page.frameLocator('iframe[title="Lease summary preview"]').getByRole("heading", { name: "Updated lease preview" })).toBeVisible();
    expect(generations).toBe(1); expect(selectedForms).not.toContain("excluded-driver");
  });
}
