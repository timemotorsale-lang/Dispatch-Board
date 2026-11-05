import { createRoot } from "react-dom/client";
import { FormsLibraryWorkspace } from "../../../features/crm-next/forms-library-workspace";
import { validateCashPrintPack, type CashPrintPack } from "../../../lib/cash-sale-print-library";
let packs: CashPrintPack[] = JSON.parse(localStorage.getItem("forms-preview-packs") || "[]");
let staffCanEdit = localStorage.getItem("forms-preview-policy") !== "false";
const manager = !new URLSearchParams(location.search).has("staff");
const policy = () => ({ staffCanEdit, canManage: manager, canEdit: staffCanEdit || manager, updatedAt: null });
const controls = { failSearch: false, writes: 0 };
Object.assign(window, { __formsWorkspace: controls });
const originalFetch = window.fetch.bind(window);
window.fetch = async (url, init) => {
  const path = String(url);
  if (path.startsWith("/api/crm/v1/deal-drafts?")) {
    if (controls.failSearch) return Response.json({ error: "Fictional connection unavailable. Retry the search." }, { status: 503 });
    const params = new URL(path, location.origin).searchParams;
    const pathway = params.get("pathway") === "wholesale" ? "wholesale" : "finance";
    return Response.json({ items: [{ id: "fictional-draft", dealNumber: 1001, customerName: "Demo Buyer", vehicleReference: "2005 Toyota Corolla", pathway, status: "PENDING" }], total: 1, page: 1, pages: 1 });
  }
  if (path === "/api/crm-next/cash-print-packs") {
    if (!init?.method || init.method === "GET") return Response.json({ packs, policy: policy() });
    const body = JSON.parse(String(init.body));
    if (body.action === "SET_POLICY") { staffCanEdit = body.staffCanEdit; localStorage.setItem("forms-preview-policy", String(staffCanEdit)); return Response.json({ policy: policy() }); }
    if (!policy().canEdit) return Response.json({ error: "Managers only" }, { status: 403 });
    controls.writes++;
    const pack = { id: body.id, ...validateCashPrintPack(body), updatedAt: `2026-11-05T12:00:0${controls.writes}.000Z` };
    packs = [...packs.filter(item => item.id !== pack.id), pack]; localStorage.setItem("forms-preview-packs", JSON.stringify(packs)); return Response.json({ pack });
  }
  return originalFetch(url, init);
};
createRoot(document.getElementById("root")!).render(<><p style={{padding:12,fontFamily:"Arial"}}>Fictional Forms Library preview. No production connection.</p><FormsLibraryWorkspace /></>);
