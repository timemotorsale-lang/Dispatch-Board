import { existsSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";

describe("Time Motor Sales logo", () => {
  it("renders the approved accessible horizontal logo", () => {
    const markup = renderToStaticMarkup(<TimeMotorSalesLogo />);

    expect(markup).toContain('alt="Time Motor Sales"');
    expect(markup).toContain("time-motor-sales-horizontal");
  });

  it("keeps the governed brand assets in the public bundle", () => {
    for (const asset of [
      "time-motor-sales-horizontal.png",
      "time-motor-sales-horizontal-reversed.png",
      "time-motor-sales-mark.png"
    ]) {
      expect(existsSync(join(process.cwd(), "public", "brand", asset))).toBe(true);
    }
  });
});
