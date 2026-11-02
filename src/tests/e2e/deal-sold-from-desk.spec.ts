import { test, expect } from "@playwright/test";

test("staff mark an existing lease sold from its desk before generating any packet", async ({ page }) => {
  test.setTimeout(120000); page.setDefaultTimeout(15000);
  let saved = { id: "sold-first-draft", revision: 1, status: "IN_PROGRESS", pathway: "lease-to-own", customerName: "Sample sold-first buyer", vehicleReference: "Sample vehicle", updatedAt: new Date().toISOString(), snapshot: { "desk:workflowId": "lease-to-own", "desk:executionOpen": true, "desk:manualCustomerName": "Sample sold-first buyer", "desk:form": { customerId: "__manual_customer__", vehicle: "Sample vehicle" } } };
  let generations = 0;
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside sold-first test" } }));
  await page.route("**/api/crm/v1/contract-packets**", route => { generations++; return route.fulfill({ status: 500, json: { error: "Marking sold must not generate paperwork" } }); });
  await page.route("**/api/crm/v1/deal-drafts*", route => {
    const request = route.request();
    if (request.method() === "PATCH") {
      const body = request.postDataJSON();
      expect(body.action).toBe("MARK_SOLD"); expect(body.id).toBe(saved.id); expect(body.revision).toBe(saved.revision);
      saved = { ...saved, status: "SOLD", revision: saved.revision + 1 };
      return route.fulfill({ json: { id: saved.id, status: saved.status, state: null, jacketId: null, revision: saved.revision } });
    }
    if (request.method() === "POST") {
      expect(request.postDataJSON().id).toBe(saved.id);
      saved = { ...request.postDataJSON(), revision: saved.revision + 1, updatedAt: new Date().toISOString() };
    }
    return route.fulfill({ json: request.method() === "POST" || new URL(request.url()).searchParams.has("id") ? saved : [saved] });
  });
  await page.goto("/login"); await page.getByLabel("Email").fill("morgan.manager@local.test"); await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const login = page.waitForResponse(response => response.url().endsWith("/api/auth/login")); await page.getByRole("button", { name: "Sign in", exact: true }).click(); expect((await login).ok()).toBe(true);
  await page.goto("/crm-next/deals/start?draftId=sold-first-draft");
  const toolbar = page.getByRole("region", { name: "Saved deal drafts", exact: true });
  await toolbar.getByRole("button", { name: "Mark sold", exact: true }).click();
  const sold = page.getByRole("dialog", { name: "Mark deal sold", exact: true });
  await expect(sold).toContainText("Signed documents, insurance, DMV/title paperwork and other required items can be completed afterward");
  await sold.getByRole("checkbox").check(); await sold.getByRole("button", { name: "Mark deal sold", exact: true }).click();
  await expect(toolbar.getByRole("combobox", { name: "Current saved deal status", exact: true })).toHaveValue("SOLD");
  await expect(toolbar.getByRole("button", { name: "Sold · complete paperwork", exact: true })).toHaveAttribute("data-completion", "pending");
  expect(generations).toBe(0);
});
