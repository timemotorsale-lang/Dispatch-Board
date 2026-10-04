import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MobileCaptureTool } from "@/features/mobile-capture/mobile-capture-tool";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams()
}));

describe("mobile capture tool", () => {
  it("starts with clear photo and barcode capture launch actions", () => {
    const html = renderToStaticMarkup(<MobileCaptureTool />);

    expect(html).toContain("Capture and send");
    expect(html).toContain("Photo");
    expect(html).toContain("Barcode Scan");
    expect(html).toContain("Choose Photo or Barcode Scan to start capture.");
  });
});
