import { test, expect } from "@playwright/test";

test("staff can set a timed reminder from the extra customer actions", async ({ page }) => {
  test.setTimeout(120000);
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside reminder test" } }));
  const requests: Array<{ action: string; dueAt: string; title: string; idempotencyKey: string }> = [];
  await page.route("**/api/crm-next/customers/*/actions", route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { task: { href: "/tasks/sample-reminder", title: "Sample reminder" } } });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test");
  await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const signedIn = page.waitForResponse(response => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await signedIn).ok()).toBe(true);
  await page.goto("/crm-next/customers");
  const customerLink = page.locator('a[href^="/crm-next/customers/"]').first();
  await expect(customerLink).toBeVisible();
  const customerHref = await customerLink.getAttribute("href");
  const customerId = decodeURIComponent(customerHref!.split("/").pop()!.split("?")[0]);
  await page.goto(`/crm-next/actions/new-task?customerId=${encodeURIComponent(customerId)}`);
  await page.getByRole("link", { name: "Set Reminder Task", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Set customer reminder", exact: true })).toBeVisible();
  await page.getByLabel("Reminder note", { exact: true }).fill("Follow up on insurance documents");
  await page.getByLabel("Reminder", { exact: true }).fill("2020-01-01T09:00");
  await page.getByRole("button", { name: "Save Reminder", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Enter a reminder note" })).toContainText("future date and time");
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Tomorrow", exact: true }).click();
  await page.getByRole("button", { name: "Save Reminder", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Reminder saved" })).toBeVisible();
  expect(requests[0].action).toBe("new-task");
  expect(requests[0].title).toBe("Reminder: Follow up on insurance documents");
  expect(new Date(requests[0].dueAt).getTime()).toBeGreaterThan(Date.now());
  await page.getByRole("button", { name: "Save Reminder", exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].idempotencyKey).toBe(requests[0].idempotencyKey);
});
