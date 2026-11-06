import { ALL_SALE_LIBRARY_FORMS, saleLibraryCatalog, type SaleLibraryPathway } from "./cash-sale-print-library";

export const SALE_LIBRARY_PATHWAYS: Array<{ id: SaleLibraryPathway; label: string }> = [
  { id: "retail-sale", label: "Retail Cash / One Pay" }, { id: "bhph", label: "BHPH" },
  { id: "finance", label: "Dealer Finance" }, { id: "outside-finance-one-pay", label: "Outside Finance" },
  { id: "wholesale", label: "Wholesale" }
];
export function isSaleLibraryPathway(value: string): value is SaleLibraryPathway {
  return SALE_LIBRARY_PATHWAYS.some(item => item.id === value);
}
export function knownLibraryForms(ids: string[]) {
  return [...new Set(ids)].filter(id => ALL_SALE_LIBRARY_FORMS.some(form => form.id === id));
}
export function libraryFormsForPathway(ids: string[], pathway: SaleLibraryPathway) {
  const catalog = saleLibraryCatalog(pathway);
  return knownLibraryForms(ids).filter(id => catalog.some(form => form.id === id));
}
export function formsLibraryDealHref(draftId: string, pathway: SaleLibraryPathway, ids: string[]) {
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(draftId)) throw new Error("Select a saved deal before preparing forms.");
  const params = new URLSearchParams({ draftId, formsLibrary: "1" });
  if (ids.length) params.set("printForms", libraryFormsForPathway(ids, pathway).join(","));
  return `/crm-next/deals/start?${params}`;
}
export function readFormsLibraryRequest(params: URLSearchParams, draftId: string) {
  if (params.get("formsLibrary") !== "1" || !draftId || params.get("draftId") !== draftId) return null;
  const raw = params.get("printForms");
  return { ids: raw === null ? null : knownLibraryForms(raw.slice(0, 6000).split(",")) };
}
