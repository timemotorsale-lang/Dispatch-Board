import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClaimPhotoUploader } from "@/features/inventory/claim-photo-uploader";
import { claimPhotoCategory, CLAIM_PHOTO_MAX_BYTES, matchesClaimPhotoBytes, validateClaimPhoto } from "@/lib/claim-photo-upload";

describe("claim photo upload", () => {
  it("routes each task to its own photo category", () => {
    expect(claimPhotoCategory({ title: "Take damage photos", actionLabel: "Upload photos" })).toBe("DAMAGE_PHOTO");
    expect(claimPhotoCategory({ title: "Capture odometer", actionLabel: "Upload odometer" })).toBe("ODOMETER_PHOTO");
    expect(claimPhotoCategory({ title: "Verify VIN photo", actionLabel: "Upload VIN photo" })).toBe("VIN_PHOTO");
    expect(claimPhotoCategory({ title: "Get authorization", actionLabel: "Send authorization" })).toBeNull();
  });
  it("rejects unsupported, empty and oversize files", () => {
    expect(validateClaimPhoto({ type: "application/pdf", size: 10 })).toBeTruthy();
    expect(validateClaimPhoto({ type: "image/png", size: 0 })).toBeTruthy();
    expect(validateClaimPhoto({ type: "image/jpeg", size: CLAIM_PHOTO_MAX_BYTES + 1 })).toBeTruthy();
    expect(validateClaimPhoto({ type: "image/jpeg", size: CLAIM_PHOTO_MAX_BYTES })).toBeNull();
  });
  it("checks image signatures rather than trusting file labels", () => {
    expect(matchesClaimPhotoBytes("image/jpeg", Uint8Array.from([255, 216, 255]))).toBe(true);
    expect(matchesClaimPhotoBytes("image/png", Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(matchesClaimPhotoBytes("image/png", new Uint8Array([1, 2, 3]))).toBe(false);
  });
  it("provides multi-selection, camera capture, and accessible status", () => {
    const html = renderToStaticMarkup(<ClaimPhotoUploader claimId="claim-1" category="ODOMETER_PHOTO" customer="Test customer" onClose={() => {}} onSaved={() => {}} />);
    expect(html).toContain('multiple=""');
    expect(html).toContain('capture="environment"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Odometer photos");
  });
});
