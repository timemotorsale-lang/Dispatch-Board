import { expect, it } from "vitest";
import { diagnosticsPartsDraftKey } from "@/lib/diagnostics-parts-draft";

it("isolates drafts when the user or repair order changes", () => {
  const storage = new Map([[diagnosticsPartsDraftKey("advisor-1", "ro-1"), "saved parts"]]);

  expect(storage.get(diagnosticsPartsDraftKey("advisor-1", "ro-2"))).toBeUndefined();
  expect(storage.get(diagnosticsPartsDraftKey("advisor-2", "ro-1"))).toBeUndefined();
  expect(storage.get(diagnosticsPartsDraftKey("advisor-1", "ro-1"))).toBe("saved parts");
  expect(diagnosticsPartsDraftKey("advisor-1")).toBeUndefined();
});
