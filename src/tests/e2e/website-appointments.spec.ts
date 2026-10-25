import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("website appointments separates fictitious demo changes from the shared backend", async ({ page }) => {
  test.skip(process.env.WEBSITE_APPOINTMENTS_E2E !== "true", "Requires the isolated local staff review server.");
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test");
  await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const login = page.waitForResponse(response => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await login).ok()).toBe(true);
  await page.goto("/website-console?section=appointments");
  const workspace = page.locator('section[aria-labelledby="website-appointments"]');
  await expect(workspace.getByRole("heading", { name: "Appointments", exact: true })).toBeVisible();
  await expect(workspace.getByText("Website appointment intake is not connected.", { exact: true })).toBeVisible();
  await expect(workspace.getByRole("link", { name: "Open shared Appointment Board", exact: true })).toHaveAttribute("href", "/appointments?view=board");

  const appointmentMutations: string[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method()) && (path.startsWith("/api/appointments") || path.startsWith("/api/website-console"))) appointmentMutations.push(request.url());
  });
  await workspace.getByRole("button", { name: "Isolated calendar demo", exact: true }).click();
  const selected = workspace.getByRole("region", { name: "Selected sample request", exact: true });
  await selected.getByRole("button", { name: "Start sample staff review", exact: true }).click();
  await selected.getByRole("combobox", { name: "Example time", exact: true }).selectOption("10:00");
  await selected.getByRole("button", { name: "Simulate confirmation", exact: true }).click();
  await expect(selected.getByRole("alert")).toContainText("Example conflict");
  await selected.getByRole("combobox", { name: "Example time", exact: true }).selectOption("11:00");
  await selected.getByRole("button", { name: "Simulate confirmation", exact: true }).click();
  await expect(selected.getByText("Demo updated only.", { exact: false })).toBeVisible();
  await expect(selected.getByText("Sample confirmed · 2026-11-02 · 11:00 America/Chicago", { exact: true })).toBeVisible();
  await selected.getByRole("combobox", { name: "Example date", exact: true }).selectOption("2026-11-03");
  await selected.getByLabel("Sample change reason (no personal information)", { exact: true }).fill("Sample shopper asked to change the day");
  await selected.getByRole("button", { name: "Simulate reschedule", exact: true }).click();
  await expect(selected.getByText("Sample confirmed · 2026-11-03 · 11:00 America/Chicago", { exact: true })).toBeVisible();
  await selected.getByRole("button", { name: "Simulate cancellation", exact: true }).click();
  await expect(selected.getByRole("alert")).toContainText("sample reason");
  await selected.getByLabel("Sample change reason (no personal information)", { exact: true }).fill("Sample shopper cancelled the example");
  await selected.getByRole("button", { name: "Simulate cancellation", exact: true }).click();
  await expect(selected.getByText("Sample cancelled · 2026-11-03 · 11:00 America/Chicago", { exact: true })).toBeVisible();
  await workspace.getByRole("button", { name: "Reset example calendar", exact: true }).click();
  await expect(selected.getByRole("button", { name: "Start sample staff review", exact: true })).toBeVisible();
  expect(appointmentMutations).toEqual([]);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('section[aria-labelledby="website-appointments"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    if (width !== 320) await page.screenshot({ path: test.info().outputPath(`appointment-demo-${width}.png`), fullPage: true });
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  const dismissReminder = page.getByRole("button", { name: "Dismiss reminder", exact: true });
  if (await dismissReminder.isVisible()) await dismissReminder.click();

  const native = await page.request.get("/api/website-console/appointments?date=2026-10-24");
  expect(native.status()).toBe(200);
  expect(native.headers()["cache-control"]).toBe("private, no-store");
  expect(await native.json()).toMatchObject({ source: "SHARED_STAFF_CALENDAR", websiteIntakeConnected: false, readOnly: true });

  let state = "loaded";
  await page.route("**/api/website-console/appointments?*", async route => {
    const date = new URL(route.request().url()).searchParams.get("date");
    if (state === "error") return route.fulfill({ status: 503, json: { error: "Synthetic backend outage. This is not an empty calendar." } });
    await route.fulfill({ json: { date, timezone: "America/Chicago", source: "SHARED_STAFF_CALENDAR", readOnly: true, websiteIntakeConnected: false, truncated: false, rows: state === "empty" ? [] : [{ id: "synthetic", appointmentNumber: "SYNTHETIC-APT", title: "Synthetic staff API row", startsAt: null, endsAt: null, bookingStatus: "DRAFT", confirmationStatus: "NOT_SENT", ownerName: "Synthetic staff" }] } });
  });
  await workspace.getByRole("button", { name: "Shared staff calendar", exact: true }).click();
  await expect(workspace.getByText("Synthetic staff API row", { exact: true })).toBeVisible();
  await expect(workspace.getByText("Unscheduled draft — no time booked · America/Chicago", { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).include('section[aria-labelledby="website-appointments"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  state = "error";
  await workspace.getByRole("button", { name: "Refresh shared calendar", exact: true }).click();
  await expect(workspace.getByRole("alert")).toContainText("Synthetic backend outage");
  await expect(workspace.getByText("Synthetic staff API row", { exact: true })).toHaveCount(0);
  state = "empty";
  await workspace.getByRole("button", { name: "Refresh shared calendar", exact: true }).click();
  await expect(workspace.getByText("No records were returned for this date.", { exact: false })).toBeVisible();
  await expect(workspace.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await workspace.getByRole("button", { name: "Isolated calendar demo", exact: true }).click();
  await expect(selected.getByRole("button", { name: "Start sample staff review", exact: true })).toBeVisible();
  expect(appointmentMutations).toEqual([]);
});

test("anonymous website calendar API does not reveal staff records", async ({ request }) => {
  test.skip(process.env.WEBSITE_APPOINTMENTS_E2E !== "true", "Requires the isolated local staff review server.");
  const response = await request.get("/api/website-console/appointments?date=2026-10-24");
  expect(response.status()).toBe(401);
  expect(await response.json()).not.toHaveProperty("rows");
  expect((await request.post("/api/website-console/appointments", { data: {} })).status()).toBe(405);
});

test("customer calendar preview never calls staff APIs or creates an appointment", async ({ page }) => {
  const origin = process.env.CUSTOMER_APPOINTMENTS_PREVIEW_URL;
  test.skip(!origin, "Requires the isolated loopback dealership sample-review server.");
  const requests: string[] = [];
  page.on("request", request => { if (request.method() !== "GET" || request.url().includes("/api/website-console/")) requests.push(request.url()); });
  await page.goto(`${origin}/appointments`);
  await expect(page.getByRole("heading", { name: "Appointment experience.", exact: true })).toBeVisible();
  await expect(page.getByText("Dates, times, people and capacity are invented.", { exact: false })).toBeVisible();
  const sample = page.getByRole("region", { name: "Selected sample request", exact: true });
  await sample.getByRole("button", { name: "Start sample staff review", exact: true }).click();
  await sample.getByRole("button", { name: "Simulate confirmation", exact: true }).click();
  await expect(sample.getByText("Demo updated only.", { exact: false })).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`customer-calendar-${width}.png`), fullPage: true });
  }
  await page.goto(`${origin}/garage/appointments`);
  await page.getByRole("link", { name: "Explore the isolated calendar demo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Appointment experience.", exact: true })).toBeVisible();
  await expect(sample.getByRole("button", { name: "Start sample staff review", exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});
