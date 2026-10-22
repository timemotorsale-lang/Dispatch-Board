import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { correctDocument, detectDocumentCorners, documentQualityHints, fullPageCorners, perspectiveMap, validCorners, type DocumentCorners } from "@/features/mobile-capture/document-image";
import { buildScannedPdf } from "@/features/mobile-capture/document-pdf";

describe("document geometry", () => {
  it("maps all four corners through a perspective transform", () => {
    const corners: DocumentCorners = [{ horizontal: 0.2, vertical: 0.1 }, { horizontal: 0.8, vertical: 0.2 }, { horizontal: 0.9, vertical: 0.9 }, { horizontal: 0.1, vertical: 0.8 }];
    const map = perspectiveMap(corners);
    [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([horizontal, vertical], index) => {
      expect(map(horizontal, vertical).horizontal).toBeCloseTo(corners[index].horizontal);
      expect(map(horizontal, vertical).vertical).toBeCloseTo(corners[index].vertical);
    });
  });
  it("rejects crossed, out-of-range, and collapsed corners", () => {
    const crossed = fullPageCorners();
    [crossed[1], crossed[2]] = [crossed[2], crossed[1]];
    expect(validCorners(crossed)).toBe(false);
    expect(() => perspectiveMap(crossed)).toThrow("four corners");
    const invalid = fullPageCorners(); invalid[0].horizontal = NaN;
    expect(validCorners(invalid)).toBe(false);
  });
  it("gives quality suggestions for featureless bright and dark photos", () => {
    expect(documentQualityHints(new Uint8ClampedArray(100 * 100 * 4).fill(255), 100, 100)).toContain("Very bright image: check for glare or washed-out text.");
    expect(documentQualityHints(new Uint8ClampedArray(100 * 100 * 4), 100, 100)).toContain("Very dark image: move to a brighter area.");
  });
  it("detects a contrasting page without assuming a blank photo is a document", () => {
    const width = 100, height = 100;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
      const offset = (row * width + column) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = row > 10 && row < 90 && column > 15 && column < 85 ? 245 : 20;
      pixels[offset + 3] = 255;
    }
    const corners = detectDocumentCorners(pixels, width, height);
    expect(corners).not.toBeNull();
    expect(corners![0].horizontal).toBeCloseTo(16 / 99);
    expect(corners![2].vertical).toBeCloseTo(89 / 99);
    expect(detectDocumentCorners(new Uint8ClampedArray(width * height * 4).fill(255), width, height)).toBeNull();
  });
  it("corrects image geometry and preserves color unless enhancement is selected", () => {
    const source = { width: 2, height: 2, data: new Uint8ClampedArray([200, 40, 30, 255, 200, 40, 30, 255, 200, 40, 30, 255, 200, 40, 30, 255]) } as ImageData;
    const color = correctDocument(source, fullPageCorners(), false);
    expect(Array.from(color.pixels.slice(0, 4))).toEqual([200, 40, 30, 255]);
    const gray = correctDocument(source, fullPageCorners(), true);
    expect(gray.pixels[0]).toBe(gray.pixels[1]);
    expect(gray.pixels[1]).toBe(gray.pixels[2]);
  });
});

describe("scanned PDF assembly", () => {
  it("rejects an empty or oversized page set before attempting PDF creation", async () => {
    await expect(buildScannedPdf([])).rejects.toThrow("1–12 pages");
    await expect(buildScannedPdf(Array.from({ length: 13 }, () => ({ bytes: new Uint8Array(), rotation: 0 })))).rejects.toThrow("1–12 pages");
    await expect(buildScannedPdf([{ bytes: new Uint8Array(26 * 1024 * 1024), rotation: 0 }])).rejects.toThrow("too large");
  });
  it("preserves page order and rotation in a real PDF", async () => {
    const jpeg = Uint8Array.from(Buffer.from("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==", "base64"));
    const bytes = await buildScannedPdf([{ bytes: jpeg, rotation: 0 }, { bytes: jpeg, rotation: 90 }]);
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(2);
    expect(document.getPages().map((page) => page.getRotation().angle)).toEqual([0, 90]);
  });
});
