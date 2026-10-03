import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("staff can save, review, finalize and retrieve checkout and return packets", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test");
  await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const signedIn = page.waitForResponse((response) => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await signedIn).ok()).toBe(true);
  await page.goto("/sales-documents");
  await page.getByRole("button", { name: "New jacket" }).click();
  const dialog = page.getByRole("dialog", { name: "New deal jacket" });
  const customerName = `Sales Documents E2E ${Date.now()}`;
  await dialog.getByLabel("Pathway").selectOption("daily-rental");
  await dialog.getByLabel("Customer", { exact: true }).fill(customerName);
  await dialog.getByLabel("Vehicle", { exact: true }).fill("Verification vehicle");
  const created = page.waitForResponse((response) => response.url().endsWith("/api/sales-documents") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Create jacket" }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  let jacket = await response.json();
  const url = `/api/sales-documents/${jacket.id}`;
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText("Sales Documents E2E evidence");
  const bytes = Buffer.from(await pdf.save());
  const uploadForm = page.locator("form").filter({ has: page.getByRole("heading", { name: "Save document", exact: true }) });
  await uploadForm.getByLabel("Document type").selectOption("signed-agreement");
  await uploadForm.getByLabel("File", { exact: true }).setInputFiles({ name: "signed-agreement.pdf", mimeType: "application/pdf", buffer: bytes });
  await uploadForm.getByLabel("Signed copy").check();
  const uploaded = page.waitForResponse((result) => result.url().endsWith(`${url}/documents`));
  await uploadForm.getByRole("button", { name: "Save document", exact: true }).click();
  expect((await uploaded).status()).toBe(201);
  await page.getByRole("button", { name: "Review signed-agreement.pdf" }).click();
  await page.getByLabel("Required signatures verified").check();
  const reviewed = page.waitForResponse((result) => result.url().endsWith(url) && result.request().method() === "PATCH");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  jacket = await (await reviewed).json();
  const agreementId = jacket.documents[0].id;

  async function update(data: Record<string, unknown>, status = 200) {
    const result = await page.request.patch(url, { data: { ...data, revision: jacket.revision } });
    expect(result.status()).toBe(status);
    if (status === 200) jacket = await result.json();
  }
  async function saveAndReview(type: string) {
    const result = await page.request.post(`${url}/documents`, { multipart: { documentType: type, revision: String(jacket.revision), file: { name: `${type}.pdf`, mimeType: "application/pdf", buffer: bytes } } });
    expect(result.status()).toBe(201);
    jacket = await result.json();
    await update({ action: "REVIEW", documentId: jacket.documents[0].id, signed: false });
  }
  await update({ action: "FINALIZE" }, 409);
  for (const type of ["driver-license", "insurance-proof", "release-condition"]) await saveAndReview(type);
  await update({ action: "FINALIZE", note: "E2E checkout" });
  expect(jacket.state).toBe("CHECKED_OUT");
  expect(jacket.phase).toBe("RETURN");
  await update({ action: "REVIEW", documentId: agreementId }, 409);
  for (const type of ["return-condition", "return-receipt"]) await saveAndReview(type);
  await update({ action: "FINALIZE", note: "E2E return" });
  expect(jacket.state).toBe("CLOSED");
  expect(jacket.versions).toHaveLength(2);
  const exported = await page.request.get(`${url}/export?version=1&format=pdf`);
  expect(exported.ok()).toBe(true);
  expect((await PDFDocument.load(await exported.body())).getPageCount()).toBe(4);
  expect((await page.request.get(`${url}/export?version=2&format=zip`)).ok()).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: customerName, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Final Packets (2)" }).click();
  await expect(page.getByText("Version 1 · checkout", { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("sales-documents-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("sales-documents-mobile.png"), fullPage: true });
  await update({ action: "ADDENDUM", note: "E2E amendment" });
  await update({ action: "REVIEW", documentId: agreementId }, 409);
  expect(jacket.versions).toHaveLength(2);
});

test("anonymous requests cannot retrieve Sales Documents", async ({ request }) => {
  expect((await request.get("/api/sales-documents")).status()).toBe(401);
});
