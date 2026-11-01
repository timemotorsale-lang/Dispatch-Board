import { test, expect } from "@playwright/test";

for (const saveError of [null, "This draft was changed in another window. Reopen the saved draft before continuing; your current entries have not been replaced."]) {
test(saveError ? "lease preview displays the exact save conflict inside the drawer, including on retry" : "lease preview generates once and opens the document", async ({ page }) => {
  test.setTimeout(120000);
  let generated = 0;
  let saved = {
    id: "lease-preview-draft", revision: 1, status: "IN_PROGRESS", pathway: "lease-to-own", customerName: "Preview buyer", vehicleReference: "Preview vehicle", updatedAt: new Date().toISOString(),
    snapshot: { "desk:workflowId": "lease-to-own", "desk:executionOpen": true, "lease-to-own:leaseInputs": { wholesaleCost: "$10000.00", capitalizedCostReduction: "$3000.00" } },
  };
  const packet = { packetId: "preview-packet", packetNumber: "PREVIEW-1", generatedAt: new Date().toISOString(), documents: [{ formId: "lease-summary", label: "Lease summary preview", html: "<h1>Preview buyer lease summary</h1>" }], delivery: { downloadReady: true, printReady: true, textReady: false, emailReady: false } };
  await page.route("**/api/crm/v1/deal-drafts*", route => {
    const request = route.request();
    if (request.method() === "POST" && saveError) return route.fulfill({ status: 409, json: { error: saveError } });
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
  await page.getByRole("button", { name: "Generate and preview packet", exact: true }).click();
  if (saveError) {
    const drawer = page.getByRole("complementary", { name: "Lease-to-own packet drawer", exact: true });
    await expect(drawer.getByRole("alert")).toContainText(saveError);
    await page.getByRole("button", { name: "Generate and preview packet", exact: true }).click();
    await expect(drawer.getByRole("alert")).toContainText(saveError);
    expect(generated).toBe(0);
    return;
  }
  const preview = page.getByRole("complementary", { name: "Lease packet preview", exact: true });
  await expect(preview).toBeVisible();
  await expect(page.frameLocator('iframe[title="Lease summary preview"]').getByRole("heading", { name: "Preview buyer lease summary" })).toBeVisible();
  expect(generated).toBe(1);
  await preview.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Preview generated packet", exact: true }).click();
  await expect(preview).toBeVisible();
  expect(generated).toBe(1);
});
}
