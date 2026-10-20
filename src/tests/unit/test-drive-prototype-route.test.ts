import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import TestDrivePrototypePage from "@/app/(app)/prototype/test-drive/page";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("test-drive prototype entry", () => {
  it("opens an explicit review draft without adopting the simplified form as default", () => {
    TestDrivePrototypePage();
    expect(redirect).toHaveBeenCalledWith("/crm-next/deals/start?pathway=test-drive&new=1&review=test-drive");
  });
});
