import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MobileCustomerIntake } from "@/features/mobile-capture/mobile-customer-intake";
import { MobileVehicleIntake } from "@/features/mobile-capture/mobile-vehicle-intake";
import { emptyIdFields } from "@/features/mobile-capture/id-capture-fields";

describe("mobile creation entry points", () => {
  it("offers barcode, ID photo and manual customer entry", () => {
    const markup = renderToStaticMarkup(<MobileCustomerIntake />);
    expect(markup).toContain("Scan ID barcode");
    expect(markup).toContain("Photograph ID front / back");
    expect(markup).toContain("Enter details manually");
    expect(markup).toContain('/?view=mobile');
  });
  it("goes straight to contact entry from a reviewed ID without putting identity data in links", () => {
    const markup = renderToStaticMarkup(<MobileCustomerIntake initialFields={{ ...emptyIdFields(), fullName: "Synthetic Person", licenseNumber: "TEST123456", dateOfBirth: "01/02/1990" }} />);
    expect(markup).toContain("How can we reach them?");
    expect(markup).toContain('type="tel"');
    expect(markup).toContain('type="email"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain('value="1990-01-02"');
    expect(markup.match(/href="[^"]*"/g)?.join(" ")).not.toContain("TEST123456");
  });
  it("starts with VIN capture, not a full acquisition form", () => {
    const markup = renderToStaticMarkup(<MobileVehicleIntake options={{ locations: [], users: [] }} />);
    expect(markup).toContain("Scan VIN barcode");
    expect(markup).toContain("Decode &amp; continue");
    expect(markup).not.toContain("Confirm &amp; add to inventory");
  });
});
