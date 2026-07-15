import { existsSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";

describe("Time Motor Sales brand system", () => {
  it("renders the approved accessible horizontal identity", () => {
    const markup = renderToStaticMarkup(<TimeMotorSalesLogo />);

    expect(markup).toContain('alt="Time Motor Sales"');
    expect(markup).toContain("time-motor-sales-horizontal");
  });

  it("supports decorative compact and reversed shell variants", () => {
    const mark = renderToStaticMarkup(<TimeMotorSalesLogo decorative variant="mark" />);
    const reversed = renderToStaticMarkup(<TimeMotorSalesLogo decorative variant="horizontal-reversed" />);

    expect(mark).toContain('alt=""');
    expect(mark).toContain("time-motor-sales-mark");
    expect(reversed).toContain("time-motor-sales-horizontal-reversed");
  });

  it("keeps every governed brand asset in the public application bundle", () => {
    for (const asset of [
      "time-motor-sales-horizontal.png",
      "time-motor-sales-horizontal-reversed.png",
      "time-motor-sales-mark.png",
      "favicon-64.png",
      "apple-touch-icon.png"
    ]) {
      expect(existsSync(join(process.cwd(), "public", "brand", asset))).toBe(true);
    }
  });
});
