import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MobileCaptureTool } from "@/features/mobile-capture/mobile-capture-tool";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams()
}));

describe("mobile capture tool", () => {
  it("offers photo, barcode, document and front/back ID capture without a pilot gate", () => {
    const html = renderToStaticMarkup(<MobileCaptureTool />);

    expect(html).toContain("Scan or capture");
    expect(html).toContain("Photo");
    expect(html).toContain("Scan barcode / QR");
    expect(html).toContain("Scan ID barcode");
    expect(html).toContain("Capture ID front / back");
    expect(html).toContain("Scan document");
    expect(html).toContain("Choose Photo or Barcode Scan to start capture.");
  });
});
