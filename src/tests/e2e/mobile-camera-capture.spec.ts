import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test.skip(!["http://127.0.0.1:3211", "http://localhost:3211"].includes(process.env.PLAYWRIGHT_BASE_URL ?? "") ||
  process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated", "Requires the seeded isolated camera preview on port 3211.");
test.setTimeout(75_000);

async function openCapture(page: Page, denyCamera = false, entry = "/capture", barcodePath?: string) {
  await page.setViewportSize({ width: 390, height: 520 });
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
  await page.addInitScript(({ deny, barcode }) => {
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
        context.fillText("SYNTHETIC CAMERA SAMPLE", 177, 180);
        context.font = "30px sans-serif";
        context.fillText("Full name: TAYLOR EXAMPLE", 177, 250);
        context.fillText("ID number: SYNTH1234", 177, 302);
        context.fillText("Issuing state: MN", 177, 354);
      };
      draw();
      const stream = canvas.captureStream(15);
      const timer = window.setInterval(() => {
        if (stream.getVideoTracks()[0].readyState === "ended") window.clearInterval(timer);
        else draw();
      }, 67);
      return stream;
    } });
  }, { deny: denyCamera, barcode: barcodePath ? readFileSync(barcodePath).toString("base64") : undefined });
  const login = await page.request.post("/api/auth/login", {
    data: { email: "morgan.manager@local.test", password: "dispatch123!" }
  });
  expect(login.ok()).toBe(true);
  await page.goto(entry);
  if (entry === "/capture") await expect(page.getByRole("heading", { name: "Scan or capture" })).toBeVisible();
}

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

test("document scan opens into the full camera without hiding the shutter or losing a retained page", async ({ page }) => {
  await openCapture(page);
  await page.setViewportSize({ width: 1180, height: 560 });
  await page.getByRole("button", { name: "Scan document", exact: true }).click();
  const camera = page.getByRole("dialog", { name: "Document camera" });
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
  await expect(shutter).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(camera).toBeHidden();
  await expect(review.getByRole("list", { name: "Scanned pages" }).getByRole("listitem")).toHaveCount(1);
});

test("photo shutter stays reachable, retakes, and never auto-uploads", async ({ page }) => {
  await openCapture(page);
  let uploads = 0;
  await page.route("**/api/document-library/uploads", route => {
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
  await expect(preview.getByRole("button", { name: "Accept and send" })).toBeInViewport({ ratio: 1 });
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
  await page.getByRole("button", { name: "Capture ID front", exact: true }).click();
  await page.getByRole("button", { name: "Full photo" }).click();
  const request = page.waitForResponse(response => response.url().endsWith("/api/document-library/id-front"));
  await page.getByRole("button", { name: "Use front photo" }).click();
  const result = await request;
  expect(result.ok()).toBe(true);
  expect(await result.json()).toMatchObject({ method: "OCR_TEXT", needsReview: true });
  const review = page.getByRole("dialog", { name: "Review front-of-ID details" });
  await expect(review.getByLabel("Full name")).toHaveValue("TAYLOR EXAMPLE");
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
  await page.getByPlaceholder("Leave blank to send to review inbox").fill(reference);
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
  const send = preview.getByRole("button", { name: "Accept and send" });
  await page.route("**/api/document-library/uploads", route => route.fulfill({ status: 503, json: { error: "Preview storage unavailable. Retry the upload." } }), { times: 1 });
  await send.click();
  await expect(preview.getByRole("status")).toContainText("Preview storage unavailable");
  const upload = page.waitForResponse(response => response.url().endsWith("/api/document-library/uploads") && response.request().method() === "POST");
  await send.click();
  const response = await upload;
  expect(response.ok(), await response.text()).toBe(true);
  const { smartIntake, storedObject } = await response.json();
  expect(storedObject.reference).toBeTruthy();
  const queue = await page.request.get("/api/document-library");
  expect(queue.ok()).toBe(true);
  expect((await queue.json()).smartIntake).toEqual(expect.arrayContaining([expect.objectContaining({ id: smartIntake.id, ownerLabel: reference })]));
});
