import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test.skip(!["http://127.0.0.1:3212", "http://localhost:3212"].includes(process.env.PLAYWRIGHT_BASE_URL ?? "") ||
  process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated", "Requires the seeded isolated camera preview on port 3212.");
test.setTimeout(75_000);

async function openCapture(page: Page, denyCamera = false, entry = "/capture", barcodePath?: string, subject = "id") {
  await page.setViewportSize({ width: 390, height: 520 });
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
  await page.addInitScript(({ deny, barcode, subject }) => {
    // Prove the shipped software decoder works even where BarcodeDetector is absent.
    if (barcode) Object.defineProperty(globalThis, "BarcodeDetector", { configurable: true, value: undefined });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: async () => {
      if (deny) throw new DOMException("Camera denied by fixture", "NotAllowedError");
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 720;
      const context = canvas.getContext("2d")!;
      const code = barcode ? new Image() : null;
      if (code) { code.src = "data:image/png;base64," + barcode; await code.decode(); }
      const draw = () => {
        context.fillStyle = "#28303a";
        context.fillRect(0, 0, 960, 720);
        if (code) {
          const scale = Math.min(830 / code.naturalWidth, 590 / code.naturalHeight);
          const width = Math.round(code.naturalWidth * scale), height = Math.round(code.naturalHeight * scale);
          context.drawImage(code, (960 - width) / 2, (720 - height) / 2, width, height);
          return;
        }
        context.fillStyle = "#fff";
        context.fillRect(150, 80, 660, 550);
        context.fillStyle = "#000";
        context.font = "bold 40px sans-serif";
        context.fillText(subject === "business" ? "WEST METRO TOWING LLC" : "SYNTHETIC CAMERA SAMPLE", 177, 180);
        context.font = "30px sans-serif";
        context.fillText(subject === "business" ? "24 hour towing and transport" : "Full name: TAYLOR EXAMPLE", 177, 250);
        context.fillText(subject === "business" ? "Phone: 612-555-0100" : "ID number: SYNTH1234", 177, 302);
        context.fillText(subject === "business" ? "office@example.test" : "Issuing state: MN", 177, 354);
      };
      draw();
      const stream = canvas.captureStream(15);
      const timer = window.setInterval(() => {
        if (stream.getVideoTracks()[0].readyState === "ended") window.clearInterval(timer);
        else draw();
      }, 67);
      return stream;
    } });
  }, { deny: denyCamera, barcode: barcodePath ? readFileSync(barcodePath).toString("base64") : undefined, subject });
  const login = await page.request.post("/api/auth/login", {
    data: { email: "morgan.manager@local.test", password: "dispatch123!" }
  });
  expect(login.ok()).toBe(true);
  await page.goto(entry);
  if (entry === "/capture") await expect(page.getByRole("heading", { name: "Scan or capture" })).toBeVisible();
}

const mobileReady = expect.configure({ timeout: 20000 });
const idBarcode = resolve(process.cwd(), "src/tests/e2e/fixtures/synthetic-id-pdf417.png");
const vinBarcode = resolve(process.cwd(), "src/tests/e2e/fixtures/synthetic-vin-code39.png");

test("reads a live Code 39 VIN without pressing a shutter", async ({ page }) => {
  await openCapture(page, false, "/capture/vehicle", vinBarcode);
  await page.getByRole("button", { name: "Scan VIN barcode" }).click();
  const scanner = page.getByRole("dialog", { name: "Scan vehicle VIN" });
  await expect(scanner.getByText("1HGCM82633A004352", { exact: true })).toBeVisible({ timeout: 3000 });
  await expect(scanner.getByRole("button", { name: "Use this VIN" })).toBeEnabled();
});

test("reads a live rotated PDF417 ID without pressing a shutter", async ({ page }) => {
  await openCapture(page, false, "/capture", idBarcode);
  await page.getByRole("button", { name: "Scan ID barcode", exact: true }).click();
  const scanner = page.getByRole("dialog", { name: "Scan ID barcode" });
  await expect(scanner.getByText("TAYLOR EXAMPLE")).toBeVisible({ timeout: 3000 });
  await expect(scanner.getByRole("button", { name: "Use reviewed ID" })).toBeDisabled();
});

test("auto-captures a clear document and keeps the crop review before accepting the page", async ({ page }) => {
  await openCapture(page);
  await page.getByRole("button", { name: "Scan document", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Scan a document" });
  await expect(review.getByRole("button", { name: "Keep page" })).toBeEnabled({ timeout: 8000 });
  await expect(review.getByRole("list", { name: "Scanned pages" })).toHaveCount(0);
});

test("an unreadable back barcode can be retained for manual review without claiming a verified read", async ({ page }) => {
  await openCapture(page);
  await page.getByRole("button", { name: "Scan ID barcode", exact: true }).click();
  const scanner = page.getByRole("dialog", { name: "Scan ID barcode" });
  await scanner.getByRole("button", { name: "Capture barcode" }).click();
  await scanner.getByRole("button", { name: "Keep back photo without barcode" }).click();
  const preview = page.getByRole("dialog", { name: "Capture preview" });
  await expect(preview.getByRole("status")).toContainText("without reading the barcode");
  await preview.getByRole("button", { name: "Add to batch" }).click();
  await page.getByRole("button", { name: "Review batch" }).click();
  await expect(page.getByLabel("Description (optional)")).toHaveValue("Back photo kept. Barcode unread. Manual review required.");
});

test("document scan opens into the full camera without hiding the shutter or losing a retained page", async ({ page }) => {
  await openCapture(page);
  await page.setViewportSize({ width: 1180, height: 560 });
  await page.getByRole("button", { name: "Scan document", exact: true }).click();
  const camera = page.getByRole("dialog", { name: "Document camera" });
  await camera.getByRole("button", { name: "Auto on" }).click();
  const shutter = camera.getByRole("button", { name: "Capture page" });
  await expect(shutter).toBeEnabled();
  const bounds = await camera.boundingBox();
  expect(bounds).toMatchObject({ x: 0, y: 0, width: 1180, height: 560 });
  await page.setViewportSize({ width: 375, height: 570 });
  await expect(shutter).toBeInViewport({ ratio: 1 });
  await shutter.click();
  const review = page.getByRole("dialog", { name: "Scan a document" });
  await review.getByRole("button", { name: "Keep page" }).click();
  await expect(review.getByRole("list", { name: "Scanned pages" }).getByRole("listitem")).toHaveCount(1);
  await review.getByRole("button", { name: "Add page with camera" }).click();
  await camera.getByRole("button", { name: "Auto on" }).click();
  await expect(shutter).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(camera).toBeHidden();
  await expect(review.getByRole("list", { name: "Scanned pages" }).getByRole("listitem")).toHaveCount(1);
});

test("photo shutter stays reachable, retakes, and never auto-uploads", async ({ page }) => {
  await openCapture(page);
  let uploads = 0;
  await page.route("**/api/capture-archive", route => {
    uploads += 1;
    return route.abort();
  });
  await page.getByRole("region", { name: "Capture actions" }).getByRole("button", { name: "Photo", exact: true }).click();
  const camera = page.getByRole("dialog", { name: "Take a photo" });
  const shutter = camera.getByRole("button", { name: "Capture photo" });
  await expect(shutter).toBeEnabled();
  await expect(shutter).toBeInViewport({ ratio: 1 });
  await page.setViewportSize({ width: 700, height: 375 });
  await expect(shutter).toBeInViewport({ ratio: 1 });
  await shutter.click();
  const preview = page.getByRole("dialog", { name: "Capture preview" });
  await expect(preview.getByRole("img", { name: "Captured scan preview" })).toBeVisible();
  await expect(preview.getByRole("button", { name: "Add to batch" })).toBeInViewport({ ratio: 1 });
  await preview.getByRole("button", { name: "Retake" }).click();
  await expect(shutter).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(camera).toBeHidden();
  expect(uploads).toBe(0);
});

test("Document Library opens the shared shutter and waits before sending to OCR", async ({ page }) => {
  await openCapture(page, false, "/documents");
  const intake = page.getByRole("region", { name: "Smart document intake" });
  let uploads = 0;
  await page.route("**/api/document-library/uploads", route => {
    uploads += 1;
    return route.fulfill({ status: 503, json: { error: "Reading service unavailable. Try again." } });
  });
  await intake.getByRole("button", { name: "Scan", exact: true }).click();
  const camera = page.getByRole("dialog", { name: "Scan a document" });
  await camera.getByRole("button", { name: "Auto on" }).click();
  const shutter = camera.getByRole("button", { name: "Capture document" });
  await expect(shutter).toBeEnabled();
  await expect(shutter).toBeInViewport({ ratio: 1 });
  await shutter.click();
  await expect(intake.getByRole("img", { name: "Captured document preview" })).toBeVisible();
  expect(uploads).toBe(0);
  await intake.getByRole("button", { name: "Send to OCR" }).click();
  await expect(intake.getByRole("status").filter({ hasText: "Reading service unavailable" })).toBeVisible();
  await expect(intake.getByRole("img", { name: "Captured document preview" })).toBeVisible();
  expect(uploads).toBe(1);
});

test("manual ID barcode capture recovers from no read and verifies a rotated PDF417 photo", async ({ page }) => {
  await openCapture(page);
  await page.getByRole("button", { name: "Scan ID barcode", exact: true }).click();
  const scanner = page.getByRole("dialog", { name: "Scan ID barcode" });
  const shutter = scanner.getByRole("button", { name: "Capture barcode" });
  await expect(shutter).toBeEnabled();
  await expect(shutter).toBeInViewport({ ratio: 1 });
  await shutter.click();
  await expect(scanner.getByRole("status")).toContainText("No readable code");
  await expect(shutter).toBeEnabled();
  await scanner.locator('input[type="file"]:not([capture])').setInputFiles(idBarcode);
  await expect(scanner.getByText("TAYLOR EXAMPLE")).toBeVisible();
  await expect(scanner.getByText("•••• 1234")).toBeVisible();
  await expect(scanner.getByText("SYNTH1234", { exact: true })).toHaveCount(0);
  await expect(scanner.getByRole("button", { name: "Use reviewed ID" })).toBeDisabled();
  await scanner.getByRole("checkbox", { name: /checked these details/ }).check();
  await scanner.getByRole("button", { name: "Use reviewed ID" }).click();
  await expect(page.getByRole("dialog", { name: "Capture preview" }).getByText(/ending 1234/)).toBeVisible();
});

test("ID front captures before OCR and keeps editable fields on reader failure", async ({ page }) => {
  await openCapture(page);
  let reads = 0;
  await page.route("**/api/document-library/id-front", route => {
    reads += 1;
    expect(route.request().postData()).toContain('filename="id-front.jpg"');
    return route.fulfill({ status: 422, json: { error: "Text could not be read. Enter fields manually." } });
  });
  await page.getByRole("button", { name: "Capture ID front / back" }).click();
  await page.getByRole("button", { name: "Auto on" }).click();
  const shutter = page.getByRole("button", { name: "Capture ID front", exact: true });
  await expect(shutter).toBeEnabled();
  await expect(shutter).toBeInViewport({ ratio: 1 });
  await shutter.click();
  const keep = page.getByRole("button", { name: "Use front photo" });
  await expect(keep).toBeEnabled();
  expect(reads).toBe(0);
  await keep.click();
  const review = page.getByRole("dialog", { name: "Review front-of-ID details" });
  await expect(review.getByRole("status")).toContainText("Enter fields manually");
  await review.getByLabel("Full name").fill("TAYLOR EXAMPLE");
  await expect(review.getByRole("button", { name: "Use reviewed ID capture" })).toBeDisabled();
  await review.getByRole("checkbox", { name: /checked the fields/ }).check();
  await review.getByRole("button", { name: "Use reviewed ID capture" }).click();
  await expect(page.getByRole("dialog", { name: "Capture preview" })).toBeVisible();
  expect(reads).toBe(1);
});

test("ID front suggests fields from the real OCR service and still requires confirmation", async ({ page }) => {
  await openCapture(page);
  await page.getByRole("button", { name: "Capture ID front / back" }).click();
  // Auto capture must advance to review without a shutter press.
  await page.getByRole("button", { name: "Full photo" }).click();
  const request = page.waitForResponse(response => response.url().endsWith("/api/document-library/id-front"));
  await page.getByRole("button", { name: "Use front photo" }).click();
  const result = await request;
  expect(result.ok()).toBe(true);
  expect(await result.json()).toMatchObject({ method: "OCR_TEXT", needsReview: true });
  const review = page.getByRole("dialog", { name: "Review front-of-ID details" });
  await mobileReady(review.getByLabel("Full name")).toHaveValue("TAYLOR EXAMPLE");
  await expect(review.getByLabel("Issuing state")).toHaveValue("MN");
  await expect(review.getByRole("button", { name: "Use reviewed ID capture" })).toBeDisabled();
});

test("permission recovery and a scan that survives a fresh document queue read", async ({ page, playwright, baseURL }) => {
  await openCapture(page, true);
  const anonymous = await playwright.request.newContext({ baseURL });
  try {
    expect((await anonymous.post("/api/document-library/id-front")).status()).toBe(401);
  } finally { await anonymous.dispose(); }
  await page.getByRole("region", { name: "Capture actions" }).getByRole("button", { name: "Photo", exact: true }).click();
  const camera = page.getByRole("dialog", { name: "Take a photo" });
  await expect(camera.getByRole("status")).toContainText("Camera access is blocked");
  await expect(camera.getByRole("button", { name: "Capture photo" })).toBeDisabled();
  await expect(camera.getByRole("button", { name: "Use device camera" })).toBeInViewport({ ratio: 1 });
  await camera.getByRole("button", { name: "Close camera" }).click();

  const reference = `Synthetic document ${Date.now()}`;
  await page.getByRole("button", { name: "Scan document", exact: true }).click();
  const scanner = page.getByRole("dialog", { name: "Scan a document" });
  const documentCamera = page.getByRole("dialog", { name: "Document camera" });
  await expect(documentCamera.getByRole("status")).toContainText("Camera access is blocked");
  await documentCamera.getByRole("button", { name: "Close camera" }).click();
  for (let pageNumber = 1; pageNumber <= 2; pageNumber += 1) {
    await scanner.locator('input[type="file"]:not([capture])').setInputFiles(idBarcode);
    await scanner.getByRole("button", { name: "Full photo" }).click();
    await scanner.getByRole("button", { name: "Keep page" }).click();
    await expect(scanner.getByRole("list", { name: "Scanned pages" }).getByRole("listitem")).toHaveCount(pageNumber);
  }
  await scanner.getByRole("button", { name: "Rotate page 2" }).click();
  await scanner.getByRole("button", { name: "Create PDF · 2 pages" }).click();
  const preview = page.getByRole("dialog", { name: "Capture preview" });
  await expect(preview.locator('iframe[title="Document PDF preview"]')).toBeVisible();
  await preview.getByRole("button", { name: "Add to batch" }).click();
  await page.getByRole("button", { name: "Review batch" }).click();
  await page.getByLabel("Description (optional)").fill(reference);
  await page.getByRole("button", { name: "Accept batch" }).click();
  const send = page.getByRole("button", { name: "Send batch" });
  await page.route("**/api/capture-archive", route => route.fulfill({ status: 503, json: { error: "Preview storage unavailable. Retry the upload." } }), { times: 1 });
  await send.click();
  await expect(page.getByRole("region", { name: "Capture batch" }).getByRole("status")).toContainText("Preview storage unavailable");
  const upload = page.waitForResponse(response => response.url().endsWith("/api/capture-archive") && response.request().method() === "POST");
  await send.click();
  const response = await upload;
  expect(response.ok(), await response.text()).toBe(true);
  const receipt = await response.json();
  const queue = await page.request.get("/api/capture-archive?q=" + encodeURIComponent(reference));
  expect(queue.ok()).toBe(true);
  expect((await queue.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({ id: receipt.items[0].id, description: reference, destination: null })]));
});

test("auto-captures a business card, adds another photo, and prints before and after filing", async ({ page }) => {
  await openCapture(page, false, "/capture", undefined, "business");
  await page.getByRole("button", { name: "Capture business card" }).click();
  const preview = page.getByRole("dialog", { name: "Capture preview" });
  await expect(preview.getByRole("img", { name: "Captured scan preview" })).toBeVisible({ timeout: 5000 });
  const firstPopup = page.waitForEvent("popup");
  await preview.getByRole("button", { name: "Print now" }).click();
  const before = await firstPopup;
  await expect(before.getByRole("button", { name: "Print", exact: true })).toBeEnabled();
  await before.close();
  await preview.getByRole("button", { name: "Add to batch" }).click();
  const actions = page.getByRole("region", { name: "Capture actions" });
  await actions.getByRole("button", { name: "Photo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Capture photo", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Auto off" }).click();
  await expect(preview.getByRole("img", { name: "Captured scan preview" })).toBeVisible({ timeout: 8000 });
  await preview.getByRole("button", { name: "Add to batch" }).click();
  const batch = page.getByRole("region", { name: "Capture batch" });
  await expect(batch.getByRole("listitem")).toHaveCount(2);
  await batch.getByRole("button", { name: "Review batch" }).click();
  await expect(batch.getByRole("button", { name: "Send batch" })).toHaveCount(0);
  await batch.getByRole("button", { name: "Accept batch" }).click();
  await batch.getByRole("button", { name: "Send batch" }).click();
  const saved = page.getByRole("region", { name: "Capture result" });
  await expect(saved.getByRole("heading", { name: "2 files saved" })).toBeVisible({ timeout: 20000 });
  const laterPopup = page.waitForEvent("popup");
  await saved.getByRole("button", { name: "Print business-card.jpg" }).click();
  const later = await laterPopup;
  await expect(later.getByRole("button", { name: "Print", exact: true })).toBeEnabled();
  await later.close();
  await saved.getByRole("link", { name: "Open saved batch" }).click();
  await expect(page.getByRole("list", { name: "Saved captures" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Business cards", exact: true }).click();
  await expect(page.getByRole("list", { name: "Saved captures" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText(/Towing & transport · Unfiled/)).toBeVisible();
  await expect(page.getByText("WEST METRO TOWING LLC", { exact: true })).toBeVisible();
});

test("preselected vehicle and master resolve the same original, with idempotent retries and refiling", async ({ page, playwright, baseURL }) => {
  const connection = new URL(process.env.DATABASE_URL!);
  if (connection.hostname !== "127.0.0.1" || connection.port !== "55435" || connection.pathname !== "/camera_preview") throw new Error("Isolated capture database required.");
  const db = new PrismaClient();
  const id = randomUUID();
  const stock = `CAM-${id.slice(0, 8)}`;
  try {
    await db.vehicle.create({ data: { id, organizationId: "org-time-motor-sales", vehicleNumber: stock, stockNumber: stock, vinState: "NON_VIN_EXCEPTION", nonVinReason: "Synthetic capture test", vinValidationSource: "LOCAL_PREVIEW" } });
  } finally { await db.$disconnect(); }
  const query = new URLSearchParams({ destination: "VEHICLE", ownerId: id });
  await openCapture(page, false, `/capture?${query}`);
  await expect(page.getByRole("group", { name: "Filing destination" }).getByText(stock, { exact: true })).toBeVisible();
  await page.locator('input[type="file"][multiple]').setInputFiles(vinBarcode);
  await page.getByRole("button", { name: "Review batch" }).click();
  await page.getByRole("button", { name: "Accept batch" }).click();
  const upload = page.waitForResponse(response => response.url().endsWith("/api/capture-archive") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Send batch" }).click();
  const response = await upload;
  expect(response.ok(), await response.text()).toBe(true);
  const receipt = await response.json();
  const originalManifest = response.request().postData()?.match(/\r\n\r\n(\{"key":[^\r\n]*\})\r\n/)?.[1];
  expect(originalManifest).toBeTruthy();
  const replayBatch = () => page.request.post("/api/capture-archive", { multipart: {
    manifest: originalManifest!, file: { name: "synthetic-vin-code39.png", mimeType: "image/png", buffer: readFileSync(vinBarcode) }
  } });
  const replay = await replayBatch();
  expect(replay.ok(), await replay.text()).toBe(true);
  expect(await replay.json()).toEqual(receipt);
  const original = receipt.items[0].id;
  const destination = await page.request.get(`/api/capture-archive?ownerType=VEHICLE&ownerId=${id}`);
  const master = await page.request.get(`/api/capture-archive?batch=${receipt.batchId}`);
  expect((await destination.json()).items).toMatchObject([{ id: original, destination: { id } }]);
  const entries = (await master.json()).items;
  expect(entries).toMatchObject([{ id: original, destination: { id } }]);
  const bytes = await page.request.get(`/api/capture-archive/file?id=${original}`);
  expect(await bytes.body()).toEqual(readFileSync(vinBarcode));
  const anonymous = await playwright.request.newContext({ baseURL });
  try { expect((await anonymous.get(`/api/capture-archive/file?id=${original}`)).status()).toBe(401); }
  finally { await anonymous.dispose(); }
  const denied = await page.request.patch("/api/capture-archive", { data: { id: original, revision: 0, destination: { type: "VEHICLE", id: randomUUID() }, description: "Blocked move" } });
  expect(denied.status()).toBe(403);
  expect((await (await page.request.get(`/api/capture-archive?batch=${receipt.batchId}`)).json()).items).toEqual(entries);
  const dbAgain = new PrismaClient();
  try {
    await dbAgain.vehicle.update({ where: { id }, data: { status: "SOLD" } });
    expect((await page.request.get(`/api/capture-archive/file?id=${original}`)).ok()).toBe(true);
    await dbAgain.vehicle.update({ where: { id }, data: { status: "INACTIVE" } });
  }
  finally { await dbAgain.$disconnect(); }
  const lostResponseReplay = await replayBatch();
  expect(await lostResponseReplay.json()).toEqual(receipt);
  expect((await (await page.request.get(`/api/capture-archive?batch=${receipt.batchId}`)).json()).items).toMatchObject([{ id: original, originalAvailable: false }]);
  const moved = await page.request.patch("/api/capture-archive", { data: { id: original, revision: 0, destination: null, description: "Refiled to archive" } });
  expect(moved.ok(), await moved.text()).toBe(true);
  expect((await moved.json()).id).toBe(original);
  expect((await (await page.request.get(`/api/capture-archive?batch=${receipt.batchId}`)).json()).items).toMatchObject([{ id: original, destination: null }]);
  expect(await (await page.request.get(`/api/capture-archive/file?id=${original}`)).body()).toEqual(readFileSync(vinBarcode));
});

test("uses staff description when card text has no category and rejects a broken PDF", async ({ page, playwright, baseURL }) => {
  await openCapture(page);
  const card = await page.request.post("/api/capture-archive", { multipart: {
    manifest: JSON.stringify({ key: randomUUID(), destination: null, items: [{ kind: "BUSINESS_CARD", description: "Supplier of repair parts and supplies" }] }),
    file: { name: "card-needs-description.png", mimeType: "image/png", buffer: readFileSync(vinBarcode) }
  } });
  expect(card.ok(), await card.text()).toBe(true);
  const receipt = await card.json();
  const master = await page.request.get(`/api/capture-archive?batch=${receipt.batchId}`);
  expect((await master.json()).items).toMatchObject([{ category: "Parts & supplies", destination: null }]);
  const other = await playwright.request.newContext({ baseURL });
  try {
    const login = await other.post("/api/auth/login", { data: { email: "jordan.sales@local.test", password: "dispatch123!" } });
    expect(login.ok()).toBe(true);
    const otherList = await other.get(`/api/capture-archive?batch=${receipt.batchId}`);
    expect(otherList.ok()).toBe(true);
    expect((await otherList.json()).items).toEqual([]);
    expect((await other.get(`/api/capture-archive/file?id=${receipt.items[0].id}`)).status()).toBe(404);
  } finally { await other.dispose(); }
  const failed = await page.request.post("/api/capture-archive", { multipart: {
    manifest: JSON.stringify({ key: randomUUID(), destination: null, items: [{ kind: "DOCUMENT" }] }),
    file: { name: "truncated-proof.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\ntruncated") }
  } });
  expect(failed.status()).toBe(400);
  expect((await failed.json()).error).toContain("PDF could not be opened");
  expect((await (await page.request.get("/api/capture-archive?q=truncated-proof")).json()).items).toEqual([]);
});

test("customer captures reuse one restricted original on the saved deal", async ({ page, playwright, baseURL }) => {
  test.setTimeout(150_000);
  // Keep the independent staff reminder from covering the review in the newly opened tab.
  await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
  const connection = new URL(process.env.DATABASE_URL!);
  if (connection.hostname !== "127.0.0.1" || connection.port !== "55435" || connection.pathname !== "/camera_preview") throw new Error("Isolated capture database required.");
  const db = new PrismaClient();
  const id = randomUUID();
  const leadId = randomUUID();
  const name = "Capture Review " + id.slice(0, 8);
  const organizationId = "org-time-motor-sales";
  try {
    const owner = await db.user.findFirstOrThrow({ where: { email: "morgan.manager@local.test" }, select: { id: true } });
    await db.customer.create({ data: { id, organizationId, customerNumber: "CAP-" + id.slice(0, 8), displayName: name, ownerUserId: owner.id } });
    await db.customerLead.create({ data: { id: leadId, organizationId, customerId: id, leadNumber: "LEAD-" + id.slice(0, 8), idempotencyKey: id, requestHash: id, sourceCode: "WALK_IN", ownerUserId: owner.id, createdByUserId: owner.id, nextActionCode: "REVIEW", nextActionAt: new Date(), priority: "NORMAL", score: 0, confidence: "LOW", qualificationSnapshot: {} } });
  } finally { await db.$disconnect(); }

  await openCapture(page, false, "/crm-next/work/attn-michael-overdue-follow-up");
  await expect(page.getByRole("link", { name: "Find a customer", exact: true })).toHaveAttribute("href", "/crm-next/customers");
  await page.goto("/crm-next/customers/attn-michael-overdue-follow-up");
  await expect(page.getByRole("heading", { name: "Customer record unavailable" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Customer capture" })).toHaveCount(0);
  await page.goto(`/capture?destination=CUSTOMER&ownerId=${randomUUID()}&requireDestination=1&tool=id-front`);
  await mobileReady(page.getByRole("button", { name: "Retry customer lookup" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add files" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const wrongTarget = await page.request.post("/api/capture-archive", { multipart: {
    manifest: JSON.stringify({ key: randomUUID(), requiredCustomerId: id, destination: null, items: [{ kind: "ID" }] }),
    file: { name: "synthetic.png", mimeType: "image/png", buffer: readFileSync(idBarcode) }
  } });
  expect(wrongTarget.status()).toBe(400);

  await page.goto(`/crm-next/customers/${id}`);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const customerShortcut = page.getByRole("link", { name: "Capture", exact: true }).first();
  await expect(customerShortcut).toBeVisible();
  await expect(customerShortcut).toHaveAttribute("href", new RegExp("ownerId=" + id));
  expect((await customerShortcut.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("navigation", { name: "Customer tools" }).getByRole("link", { name: "Documents" }).click();
  const captureLink = page.getByRole("link", { name: "Scan ID front / back" });
  await expect(captureLink).toBeVisible();
  await captureLink.click();
  const frontShutter = page.getByRole("button", { name: "Capture ID front", exact: true });
  await expect.poll(async () => await frontShutter.isVisible() || await page.getByRole("button", { name: "Full photo" }).isVisible(), { timeout: 15000 }).toBe(true);
  if (await frontShutter.isVisible()) await frontShutter.click();
  await page.getByRole("button", { name: "Full photo" }).click();
  await page.getByRole("button", { name: "Use front photo" }).click();
  const review = page.getByRole("dialog", { name: "Review front-of-ID details" });
  await mobileReady(review.getByLabel("Full name")).toHaveValue("TAYLOR EXAMPLE");
  await review.getByRole("button", { name: "Scan back barcode · optional" }).click();
  const back = page.getByRole("dialog", { name: "Scan ID barcode" });
  await back.locator('input[type="file"]:not([capture])').setInputFiles(idBarcode);
  await back.getByRole("checkbox", { name: /checked these details/ }).check();
  await back.getByRole("button", { name: "Use reviewed ID" }).click();
  await review.getByRole("checkbox", { name: /checked the fields/ }).check();
  await review.getByRole("button", { name: "Use reviewed ID capture" }).click();
  const preview = page.getByRole("dialog", { name: "Capture preview" });
  await expect(preview.getByRole("button", { name: /Add customer/ })).toHaveCount(0);
  await preview.getByRole("button", { name: "Add to batch" }).click();
  await expect(page.getByRole("region", { name: "Customer filing" })).toContainText(name);
  await page.getByRole("button", { name: "Review batch" }).click();
  await page.getByRole("button", { name: "Accept batch" }).click();
  const send = page.waitForResponse(response => response.url().endsWith("/api/capture-archive") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Send batch" }).click();
  const result = await send;
  expect(result.ok(), await result.text()).toBe(true);
  const receipt = await result.json();
  const originalId = receipt.items[0].id;
  const customerFiles = await page.request.get(`/api/capture-archive?ownerType=CUSTOMER&ownerId=${id}`);
  expect(customerFiles.ok()).toBe(true);
  const originalRows = (await customerFiles.json()).items;
  expect(originalRows).toMatchObject([{ id: originalId, kind: "ID", contentType: "application/pdf" }]);
  await page.getByRole("link", { name: "Back to customer" }).click();
  await expect(page.locator("#documents-held").getByRole("link", { name: /Open original/ }))
    .toHaveAttribute("href", `/api/capture-archive/file?id=${originalId}`, { timeout: 20000 });

  const adopted = await page.request.post("/api/crm-next/pipeline", { data: {
    action: "ADOPT_LEAD", idempotencyKey: randomUUID(), leadId, pathway: "retail-sale"
  } });
  expect(adopted.ok(), await adopted.text()).toBe(true);
  const opportunity = await adopted.json();
  const converted = await page.request.post("/api/crm-next/pipeline", { data: {
    action: "CONVERT", idempotencyKey: randomUUID(), id: opportunity.id, expectedVersion: opportunity.version
  } });
  expect(converted.ok(), await converted.text()).toBe(true);
  const { dealId } = await converted.json();
  expect(dealId).toBeTruthy();
  await page.goto(`/crm-next/deals/start?draftId=${dealId}`);
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(page.getByRole("region", { name: "Customer files" }).getByRole("link", { name: /Open original/ }))
    .toHaveAttribute("href", `/api/capture-archive/file?id=${originalId}`, { timeout: 20000 });
  const dealFiles = await page.request.get(`/api/capture-archive?dealId=${dealId}`);
  expect((await dealFiles.json()).items).toEqual(originalRows);
  const original = await page.request.get(`/api/capture-archive/file?id=${originalId}`);
  expect(original.ok()).toBe(true);
  const { PDFDocument } = await import("pdf-lib");
  expect((await PDFDocument.load(await original.body())).getPageCount()).toBe(2);
  expect((await page.request.get(`/api/capture-archive?dealId=${dealId}&ownerId=${id}`)).status()).toBe(400);
  const other = await playwright.request.newContext({ baseURL });
  try {
    expect((await other.post("/api/auth/login", { data: { email: "jordan.sales@local.test", password: "dispatch123!" } })).ok()).toBe(true);
    expect((await other.get(`/api/capture-archive?dealId=${dealId}`)).status()).toBe(404);
    expect((await other.get(`/api/capture-archive/file?id=${originalId}`)).status()).toBe(404);
  } finally { await other.dispose(); }

  const dealShortcut = page.getByRole("link", { name: "Capture (new tab)", exact: true });
  await expect(dealShortcut).toBeVisible();
  const opened = page.waitForEvent("popup");
  await dealShortcut.click();
  const capture = await opened;
  await mobileReady(capture.getByRole("region", { name: "Customer filing" })).toContainText(name);
  await expect(capture.getByText("These are shared customer files, not signed deal paperwork.")).toBeVisible();
  const wrongLookup = await page.request.get(`/api/capture-archive?lookup=1&type=CUSTOMER&id=${randomUUID()}&dealId=${dealId}`);
  expect(wrongLookup.status()).toBe(409);
  const wrongId = randomUUID();
  const wrongDealUpload = await page.request.post("/api/capture-archive", { multipart: {
    manifest: JSON.stringify({ key: randomUUID(), requiredDealId: dealId, requiredCustomerId: wrongId,
      destination: { type: "CUSTOMER", id: wrongId }, items: [{ kind: "PHOTO" }] }),
    file: { name: "synthetic.png", mimeType: "image/png", buffer: readFileSync(vinBarcode) }
  } });
  expect(wrongDealUpload.status()).toBe(409);
  await capture.locator('input[type="file"][multiple]').setInputFiles(vinBarcode);
  await capture.getByRole("button", { name: "Review batch" }).click();
  await capture.getByRole("button", { name: "Accept batch" }).click();
  await capture.getByRole("button", { name: "Send batch" }).click();
  await expect(capture.getByRole("heading", { name: "1 file saved" })).toBeVisible();
  await capture.getByRole("link", { name: "Back to deal" }).click();
  await expect(capture.getByRole("tab", { name: "Documents", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(capture.getByRole("region", { name: "Customer files" })).toContainText("synthetic-vin-code39.png", { timeout: 20000 });
  console.log("[customer-capture-preview]", JSON.stringify({ customerId: id, dealId, name }));
});

test("customer capture cannot carry an unsent draft into another customer's session", async ({ page }) => {
  const connection = new URL(process.env.DATABASE_URL!);
  if (connection.hostname !== "127.0.0.1" || connection.port !== "55435" || connection.pathname !== "/camera_preview") throw new Error("Isolated capture database required.");
  const db = new PrismaClient();
  const [first, second] = [randomUUID(), randomUUID()];
  const path = (id: string) => `/capture?destination=CUSTOMER&ownerId=${id}&requireDestination=1`;
  try {
    const owner = await db.user.findFirstOrThrow({ where: { email: "morgan.manager@local.test" }, select: { id: true } });
    await db.customer.createMany({ data: [first, second].map(id => ({ id, organizationId: "org-time-motor-sales",
      customerNumber: "SWITCH-" + id.slice(0, 8), displayName: "Capture Switch " + id.slice(0, 8), ownerUserId: owner.id })) });
  } finally { await db.$disconnect(); }
  await openCapture(page, false, path(first));
  const filing = page.getByRole("region", { name: "Customer filing" });
  await mobileReady(filing).toContainText(first.slice(0, 8));
  await page.locator('input[type="file"][multiple]').setInputFiles(vinBarcode);
  await page.getByRole("button", { name: "Review batch" }).click();
  await expect(page.getByRole("button", { name: "Accept batch" })).toBeEnabled();
  await page.evaluate(href => window.history.pushState(null, "", href), path(second));
  await mobileReady(filing).toContainText(second.slice(0, 8));
  await expect(page.getByRole("region", { name: "Capture batch" })).toHaveCount(0);
  const archive = () => page.request.get(`/api/capture-archive?ownerType=CUSTOMER&ownerId=${second}`);
  expect((await (await archive()).json()).items).toEqual([]);

  const { PDFDocument } = await import("pdf-lib");
  const document = await PDFDocument.create();
  document.addPage();
  await page.locator('input[type="file"][multiple]').setInputFiles([
    { name: "synthetic-document.pdf", mimeType: "application/pdf", buffer: Buffer.from(await document.save()) },
    { name: "synthetic-photo.png", mimeType: "image/png", buffer: readFileSync(vinBarcode) }
  ]);
  await page.getByRole("button", { name: "Review batch" }).click();
  await page.getByRole("button", { name: "Accept batch" }).click();
  await page.getByRole("button", { name: "Send batch" }).click();
  await expect(page.getByRole("heading", { name: "2 files saved" })).toBeVisible();
  const files = (await (await archive()).json()).items;
  expect(files).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: "DOCUMENT", fileName: "synthetic-document.pdf" }),
    expect.objectContaining({ kind: "PHOTO", fileName: "synthetic-photo.png" })
  ]));
});

test("camera shortcut files photos to inventory and customer vehicle records", async ({ page }) => {
  test.setTimeout(150_000);
  const connection = new URL(process.env.DATABASE_URL!);
  if (connection.hostname !== "127.0.0.1" || connection.port !== "55435" || connection.pathname !== "/camera_preview") throw new Error("Isolated capture database required.");
  const db = new PrismaClient();
  const [inventoryId, customerVehicleId, customerId] = [randomUUID(), randomUUID(), randomUUID()];
  const organizationId = "org-time-motor-sales";
  const stock = (id: string) => "PHONE-CAM-" + id.slice(0, 8);
  try {
    await db.customer.create({ data: { id: customerId, organizationId, customerNumber: stock(customerId), displayName: "Synthetic Vehicle Owner" } });
    await db.vehicle.createMany({ data: [inventoryId, customerVehicleId].map(id => ({
      id, organizationId, vehicleNumber: stock(id), stockNumber: stock(id), year: 2021, make: "Honda", model: "Civic",
      vinState: "NON_VIN_EXCEPTION", nonVinReason: "Synthetic camera preview", vinValidationSource: "LOCAL_PREVIEW"
    })) });
    await db.vehicleRelationship.createMany({ data: [
      { organizationId, vehicleId: inventoryId, relationshipType: "DEALERSHIP_OWNED", effectiveFrom: new Date(), sourceCode: "LOCAL_PREVIEW" },
      { organizationId, customerId, vehicleId: customerVehicleId, relationshipType: "CUSTOMER_OWNER", effectiveFrom: new Date(), sourceCode: "LOCAL_PREVIEW" }
    ] });
  } finally { await db.$disconnect(); }

  await openCapture(page, false, `/vehicles/${inventoryId}/details`);
  for (const [id, href] of [[inventoryId, `/vehicles/${inventoryId}/details`], [customerVehicleId, `/vehicles/${customerVehicleId}/workbench`]]) {
    await page.goto(href);
    const shortcut = page.getByRole("link", { name: "Capture", exact: true }).first();
    await expect(shortcut).toBeVisible({ timeout: 20000 });
    expect((await shortcut.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await shortcut.click();
    await mobileReady(page.getByRole("region", { name: "Vehicle filing" })).toContainText(stock(id));
    await expect(page.getByRole("button", { name: "Capture ID front / back" })).toHaveCount(0);
    await page.locator('input[type="file"][multiple]').setInputFiles(vinBarcode);
    await page.getByRole("button", { name: "Review batch" }).click();
    await page.getByRole("button", { name: "Accept batch" }).click();
    await page.getByRole("button", { name: "Send batch" }).click();
    await expect(page.getByRole("heading", { name: "1 file saved" })).toBeVisible();
    const files = await page.request.get(`/api/capture-archive?ownerType=VEHICLE&ownerId=${id}`);
    expect(files.ok()).toBe(true);
    expect((await files.json()).items).toMatchObject([{ kind: "PHOTO", destination: { type: "VEHICLE", id } }]);
    await page.getByRole("link", { name: "Back to vehicle" }).click();
    await expect(page).toHaveURL(url => url.pathname === href);
  }
  await page.goto(`/vehicles/360/${customerVehicleId}`);
  await expect(page.getByRole("link", { name: "Capture", exact: true })).toBeVisible();
  console.log("[vehicle-capture-preview]", JSON.stringify({ inventoryId, customerVehicleId }));
});
