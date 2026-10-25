import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CustomerAppointmentPreview } from "../src/components/appointment-preview";

describe("customer calendar sample isolation", () => {
  it("shows a labeled example only in the approved preview projection", () => {
    const markup = renderToStaticMarkup(<CustomerAppointmentPreview preview />);
    expect(markup).toContain("Sample shopper A");
    expect(markup).toContain("Dates, times, people and capacity are invented");
    expect(markup).toContain('href="/service"');
    expect(markup).toContain("does not populate these forms");
  });
  it("never renders sample people, slots or simulation controls in a live projection", () => {
    const markup = renderToStaticMarkup(<CustomerAppointmentPreview preview={false} />);
    expect(markup).toContain("Online scheduling is not connected yet");
    expect(markup).not.toContain("Sample shopper");
    expect(markup).not.toContain("2026-11-02");
    expect(markup).not.toContain("Simulate");
  });
});
