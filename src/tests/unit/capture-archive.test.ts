import { describe, expect, it } from "vitest";
import { captureByteLimit, captureFileError, categoryFromDescription } from "@/features/mobile-capture/capture-archive-contract";
import { qualifyAutoCapture, sameCaptureFrame } from "@/features/mobile-capture/auto-capture";

function fixture(offset = 0, flat = false) {
  const width = 80, height = 60, pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const background = x < 10 + offset || x > 65 + offset || y < 9 || y > 50;
    const shade = flat ? 18 : background ? 52 : x % 6 === 0 && y > 16 && y < 36 ? 30 : 225;
    const index = (y * width + x) * 4;
    pixels[index] = pixels[index + 1] = pixels[index + 2] = shade;
    pixels[index + 3] = 255;
  }
  return { pixels, width, height };
}

describe("capture batches", () => {
  it("only accepts supported printable images/PDFs and caps individual files", () => {
    expect(captureFileError({ type: "application/pdf", size: 200 })).toBe("");
    expect(captureFileError({ type: "text/html", size: 200 })).toMatch(/PDF/);
    expect(captureFileError({ type: "image/jpeg", size: captureByteLimit + 1 })).toMatch(/25 MB/);
  });
  it("categorizes card language and leaves ambiguous descriptions for staff review", () => {
    expect(categoryFromDescription("West Metro Towing LLC")).toBe("Towing & transport");
    expect(categoryFromDescription("Staff note: supplies and replacement parts")).toBe("Parts & supplies");
    expect(categoryFromDescription("John Example, 555-0101")).toBeNull();
  });
});

describe("automatic capture frame checks", () => {
  it("distinguishes a clear stable frame from motion and flat/dark images", () => {
    const frame = fixture();
    const still = qualifyAutoCapture(frame.pixels, frame.width, frame.height, true);
    expect(still?.corners).toHaveLength(4);
    expect(sameCaptureFrame(still!, still!)).toBe(true);
    const shifted = fixture(5);
    expect(sameCaptureFrame(still!, qualifyAutoCapture(shifted.pixels, shifted.width, shifted.height, true)!)).toBe(false);
    const flat = fixture(0, true);
    expect(qualifyAutoCapture(flat.pixels, flat.width, flat.height, false)).toBeNull();
  });
});
