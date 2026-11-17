import { describe, expect, it } from "vitest";
import { phoneAppOrigin, phoneDocumentHandoff } from "@/lib/phone-document-handoff";

describe("authenticated phone scanning links", () => {
  it("carries the jacket and document selection without customer data or access tokens", () => {
    const link = phoneDocumentHandoff("https://dispatch.example.test", "jacket-1", "sales-agreement");
    const url = new URL(link!);
    expect(url.pathname).toBe("/sales-documents");
    expect(Object.fromEntries(url.searchParams)).toEqual({ jacketId: "jacket-1", scan: "1", requirementId: "sales-agreement" });
  });
  it.each(["http://localhost:3001", "https://localhost", "https://127.0.0.1", "https://[::1]", "https://user:secret@example.test", "https://example.test?token=secret", "not a URL"])("rejects unusable or credential-bearing phone origins %s", origin => {
    expect(phoneDocumentHandoff(origin, "jacket")).toBeNull();
    expect(phoneAppOrigin(origin)).toBeNull();
  });
});
