import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NewDealPathway } from "@/features/crm-next/new-deal-pathway";
const query = vi.hoisted(() => ({ value: "new=1" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query.value), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/features/crm-next/deal-draft-workspace", async original => ({ ...await original<typeof import("@/features/crm-next/deal-draft-workspace")>(), DealDraftWorkspace: ({ initialPathway, initialPresetId }: { initialPathway?: string; initialPresetId?: string }) => <div data-pathway={initialPathway} data-preset={initialPresetId}>Saved or explicitly selected deal workspace</div> }));
import { CrmNextDealStartTool } from "@/features/crm-next/crm-next-deal-start-tool";
import type { CrmNextCommandCenter } from "@/server/crm-next/read-model";
const model = { customers: [] } as unknown as CrmNextCommandCenter;
describe("new deal pathway selection", () => {
  it("requires an explicit selection and offers no default cash-sale choice", () => {
    const html = renderToStaticMarkup(<NewDealPathway options={[{ id: "retail", label: "Retail Cash / One Pay", helper: "Cash sale" }, { id: "lease", label: "Lease-to-Own", helper: "Lease" }]} onChoose={() => {}} />);
    expect(html).toContain("Choose a revenue pathway…"); expect(html).toContain("Lease-to-Own");
    expect(html).toContain('required=""'); expect(html).toContain('disabled=""');
    expect(html).not.toContain("Customer &amp; Vehicle");
  });
  it("shows the picker before mounting a new deal workspace", () => {
    query.value = "new=1";
    const html = renderToStaticMarkup(<CrmNextDealStartTool model={model} />);
    expect(html).toContain("Step 1 · Choose the revenue pathway");
    expect(html).toContain("Daily Rental"); expect(html).toContain("Lease-to-Own");
    expect(html).not.toContain("Saved or explicitly selected deal workspace");
  });
  it("seeds both workflow and form preset from an explicitly chosen lease", () => {
    query.value = "new=1&pathway=lease-to-own";
    const html = renderToStaticMarkup(<CrmNextDealStartTool initialWorkflowId="lease-to-own" model={model} />);
    expect(html).toContain('data-pathway="lease-to-own"'); expect(html).toContain('data-preset="lease-to-own-payment"');
  });
  it("does not force existing saved deals through new-deal selection", () => {
    query.value = "draftId=saved-record";
    expect(renderToStaticMarkup(<CrmNextDealStartTool model={model} />)).not.toContain("Step 1 · Choose");
  });
});
