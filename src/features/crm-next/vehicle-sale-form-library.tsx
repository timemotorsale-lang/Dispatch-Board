"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { CashSalePrintLibrary } from "./cash-sale-print-library";
import { useFormsLibraryEntry } from "./use-forms-library-entry";
import { SharedDealVehicleContext } from "./shared-deal-identities";
import { useArchivedDealPacket, useDealDraft, useDealDraftState } from "./deal-draft-workspace";
import { EMPTY_CASH_SALE, cashSaleWarrantySelection, type CashSaleFacts } from "@/lib/cash-retail-sale";
import { CASH_SALE_LABELS } from "@/lib/cash-retail-sale";
import { saleLibraryCatalog, saleLibraryDefaultIds, cashFormUnavailable, type SaleLibraryPathway } from "@/lib/cash-sale-print-library";
import { BHPH_FORM_PACKET } from "@/lib/bhph-form-packet";
import { MN_SALE_FORM_PACKET } from "@/lib/mn-vehicle-sale-form-packet";
import { cashSelectedPrintPdf } from "@/lib/cash-sale-print-pdf";
import { requestContractPacket } from "@/lib/deal-packet-feedback";
import { prefillCustomerContact } from "@/lib/customer-contact-prefill";
import styles from "./crm-next-shell.module.css";

export type SaleLibraryPacket = { packetId: string; jacketId?: string; packetNumber: string; salesDocumentsHref?: string; documents: Array<{ formId: string; label: string; contentBase64?: string; contentType?: string; signatureStatus?: string }> };
type Props = { pathway: SaleLibraryPathway; customerName: string; customerPrefill: { address: string; phoneNumber: string; email: string }; salePrice: string; getDocumentContext: () => Record<string,string>; loan?: Record<string,string>; defaults?: Partial<CashSaleFacts>; sourceFingerprint?: string; warrantyOffered?: boolean; onGenerate?: (ids: string[], facts: CashSaleFacts, requestId: string) => Promise<SaleLibraryPacket | undefined>; legacyPacket?: SaleLibraryPacket | null; legacyForms?: Array<{id:string;label:string}>; onOpenLegacy?: () => void; onManageOriginals?: () => void };
export function VehicleSaleFormLibrary(props: Props) {
  const vehicle = useContext(SharedDealVehicleContext), draft = useDealDraft();
  const customerId = props.getDocumentContext().customerId || props.customerName;
  const [factsCustomer, setFactsCustomer] = useDealDraftState("saleLibraryCustomerId", customerId);
  const [facts, setFacts] = useDealDraftState<CashSaleFacts>("saleLibraryFacts", { ...EMPTY_CASH_SALE, ...props.defaults, buyerAddress: props.customerPrefill.address, buyerPhone: props.customerPrefill.phoneNumber, buyerEmail: props.customerPrefill.email });
  const [selected, setSelected] = useDealDraftState("saleLibrarySelection", () => saleLibraryDefaultIds(props.pathway, facts, props.warrantyOffered !== false));
  const [fingerprint, setFingerprint] = useDealDraftState("saleLibraryGeneratedFingerprint", "");
  const [legacyIds, setLegacyIds] = useDealDraftState<string[]>("saleLibraryLegacyPacketIds", []);
  const [packet, setPacket] = useArchivedDealPacket<SaleLibraryPacket>(true);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [previewIds, setPreviewIds] = useState<string[]>([]), [duplex, setDuplex] = useState(true);
  const [legacyPreview, setLegacyPreview] = useState<SaleLibraryPacket | null>(null);
  const [loadedOriginals, setOriginals] = useState<Array<{ id: string; type: string; fileName: string; contentType: string; source: string; reviewed: boolean; signed: boolean }>>([]);
  const [originalsIdentity, setOriginalsIdentity] = useState("");
  const [previewIdentity, setPreviewIdentity] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const jacketId = (draft?.read("jackets") as Record<string,string> | undefined)?.[props.pathway] || props.legacyPacket?.jacketId || packet?.jacketId;
  const currentOriginalIdentity = JSON.stringify([props.pathway, jacketId, customerId, vehicle?.vin]);
  const originals = originalsIdentity === currentOriginalIdentity ? loadedOriginals : [];
  useEffect(() => {
    if (!open || !jacketId || props.pathway !== "wholesale") return;
    const controller = new AbortController();
    void fetch(`/api/sales-documents/${encodeURIComponent(jacketId)}`, { cache: "no-store", signal: controller.signal }).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Wholesale originals could not be loaded."); if (body.pathway !== "wholesale" || (body.customerId && body.customerId !== customerId) || (body.vin && body.vin !== vehicle?.vin)) throw new Error("This archive belongs to a different deal identity. Review the linked customer and vehicle."); return body; }).then(body => { if (!controller.signal.aborted) { setOriginals(body.documents.filter((doc: {source:string}) => doc.source !== "GENERATED")); setOriginalsIdentity(currentOriginalIdentity); } }).catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Wholesale originals could not be loaded."); });
    return () => controller.abort();
  }, [open, jacketId, props.pathway, customerId, vehicle?.vin, currentOriginalIdentity]);
  const frame = useRef<HTMLIFrameElement>(null), preview = useRef<HTMLElement>(null), pending = useRef(false), requestId = useRef(crypto.randomUUID());
  const lastAction = useRef<{ action: "preview" | "print" | "download"; ids: string[] } | null>(null);
  const [returnToForms, setReturnToForms] = useState(0);
  const catalog = saleLibraryCatalog(props.pathway).filter(form => props.warrantyOffered !== false || form.id !== "bhph-engine-transmission-warranty-return");
  useFormsLibraryEntry(draft?.draftId() || "", ids => {
    if (ids !== null) {
      setSelected(ids.filter(id => catalog.some(form => form.id === id)));
      setNotice("Forms Library selection loaded. Conditional requirements and original documents are checked before printing.");
    }
    setOpen(true);
  });
  function unavailable(id: string) { return catalog.find(form => form.id === id)?.originalOnly && !originals.some(doc => doc.type === id) ? "Upload this wholesale original in the deal document checklist. It cannot be generated as a replacement agreement or receipt." : cashFormUnavailable(id, facts); }
  const activeSelected = selected.filter(id => catalog.some(form => form.id === id) && !unavailable(id));
  const originalHref = (id: string) => `/api/sales-documents/${encodeURIComponent(jacketId || "")}/documents/${encodeURIComponent(id)}`;
  const currentFingerprint = JSON.stringify([props.pathway, customerId, props.customerName, props.salePrice, props.loan, props.sourceFingerprint, vehicle, facts]);
  const latest = useRef(currentFingerprint);
  useEffect(() => { latest.current = currentFingerprint; }, [currentFingerprint]);
  useEffect(() => {
    const prior = props.legacyPacket;
    if (prior && !prior.documents.some(doc => doc.label === CASH_SALE_LABELS["sales-agreement"])) setLegacyIds(current => current.includes(prior.packetId) ? current : [...current, prior.packetId]);
  }, [props.legacyPacket, setLegacyIds]);
  const defaultsKey = JSON.stringify(props.defaults ?? {});
  useEffect(() => {
    if (factsCustomer !== customerId) { setFactsCustomer(customerId); setFacts(current => ({ ...current, buyerAddress: props.customerPrefill.address, buyerPhone: props.customerPrefill.phoneNumber, buyerEmail: props.customerPrefill.email, coBuyer: "" })); }
  }, [factsCustomer, customerId, props.customerPrefill.address, props.customerPrefill.phoneNumber, props.customerPrefill.email, setFacts, setFactsCustomer]);
  useEffect(() => {
    const defaults = JSON.parse(defaultsKey) as Partial<CashSaleFacts>;
    setFacts(current => ({ ...current, ...Object.fromEntries(Object.entries(defaults).filter(([key, value]) => !current[key as keyof CashSaleFacts] && value)), buyerAddress: current.buyerAddress || props.customerPrefill.address, buyerPhone: prefillCustomerContact(current.buyerPhone, props.customerPrefill.phoneNumber), buyerEmail: prefillCustomerContact(current.buyerEmail, props.customerPrefill.email) }));
  }, [defaultsKey, props.customerPrefill.address, props.customerPrefill.phoneNumber, props.customerPrefill.email, setFacts]);
  useEffect(() => {
    if (!packet || !previewIds.length) return;
    let active = true, url = "";
    void cashSelectedPrintPdf(packet.documents, previewIds, duplex).then(bytes => { if (!active) return; url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" })); if (frame.current) frame.current.src = url; }).catch(caught => { if (active) setError(caught instanceof Error ? caught.message : "The form preview could not be opened."); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [packet, previewIds, duplex]);
  function edit(key: keyof CashSaleFacts, value: string) { setFacts(current => key === "warrantyType" ? cashSaleWarrantySelection(current, value) : { ...current, [key]: value }); setError(""); }
  function field(label: string, key: keyof CashSaleFacts, type = "text") { const fromTerms = props.pathway === "bhph" && ["saleDate", "mileage", "warrantyCoverage", "warrantyDuration", "docFee", "titleFee", "registrationFee", "taxOverride", "taxReason"].includes(key); return <label><span>{label}</span><input type={type} readOnly={fromTerms} title={fromTerms ? "Edit this value in the BHPH deal terms" : undefined} value={fromTerms ? props.defaults?.[key] ?? facts[key] : facts[key]} onChange={event => edit(key, event.target.value)} /></label>; }
  async function prepare(ids: string[]) {
    if (!vehicle || !draft) throw new Error("Select the shared customer and vehicle and save this deal first.");
    if (!ids.length) throw new Error("Select at least one applicable form.");
    if (packet && fingerprint === currentFingerprint && ids.every(id => packet.documents.some(doc => doc.formId === id))) return packet;
    if (!await draft.save()) throw new Error(draft.saveError() || "Saving failed; your entries are retained.");
    let result: SaleLibraryPacket | undefined;
    const requestFacts = props.pathway === "bhph" ? { ...facts, ...Object.fromEntries(Object.entries(props.defaults ?? {}).filter(([key]) => ["saleDate", "mileage", "coBuyer", "warrantyType", "warrantyCoverage", "warrantyDuration", "docFee", "titleFee", "registrationFee", "taxOverride", "taxReason"].includes(key))) } : facts;
    if (props.onGenerate) result = await props.onGenerate(ids, requestFacts, requestId.current);
    else {
      const response = await requestContractPacket({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...props.getDocumentContext(), packetType: "MINNESOTA_RETAIL_SALE", dealType: props.pathway, customerName: props.customerName, salePrice: props.salePrice, vehicle: { ...vehicle, mileage: facts.mileage }, preparedFormIds: ids, sharedSaleLibrary: { pathway: props.pathway, facts, loan: props.loan }, paymentFunding: props.pathway === "finance" ? "Dealer financing" : "Outside finance", idempotencyKey: requestId.current }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "The library forms could not be prepared."); result = body;
    }
    if (!result || !ids.every(id => result!.documents.some(doc => doc.formId === id))) throw new Error("The requested forms could not be generated. Review the deal's terms and try again.");
    setPacket(result); setFingerprint(currentFingerprint); requestId.current = crypto.randomUUID();
    if (latest.current !== currentFingerprint) throw new Error("Deal details changed during generation. The saved copy remains archived; prepare the updated forms before printing.");
    return result;
  }
  async function perform(action: "preview" | "print" | "download", ids = activeSelected) {
    if (pending.current) return;
    lastAction.current = { action, ids };
    pending.current = true; setBusy(true); setError(""); setNotice("");
    const popup = action === "print" ? window.open("", "_blank") : null;
    if (popup) { popup.opener = null; popup.document.body.textContent = "Preparing sale library forms…"; }
    try {
      const uploaded = props.pathway === "wholesale" ? ids.map(id => originals.find(doc => doc.type === id)).filter((doc): doc is (typeof originals)[number] => Boolean(doc)) : [];
      const generatedIds = ids.filter(id => !uploaded.some(doc => doc.type === id));
      for (const [index, doc] of uploaded.entries()) {
        if (action === "preview" && index === 0) { setPreviewIdentity(currentOriginalIdentity); setOriginalUrl(originalHref(doc.id)); }
        else if (action === "download") { const link = document.createElement("a"); link.href = originalHref(doc.id) + "?download=1"; link.click(); }
        else if (action === "print") { if (index === 0 && popup) popup.location.href = originalHref(doc.id); else window.open(originalHref(doc.id), "_blank", "noopener"); }
      }
      if (!generatedIds.length) { if (!uploaded.length) throw new Error("Choose an available form or uploaded original."); setPreviewIds([]); setNotice("Original documents are opened unchanged. Use each PDF viewer’s print button to print signed copies."); return; }
      const result = await prepare(generatedIds);
      if (action === "preview") { setOriginalUrl(""); setPreviewIds(generatedIds); requestAnimationFrame(() => { preview.current?.scrollIntoView({ block: "start" }); preview.current?.focus(); }); }
      else { const bytes = await cashSelectedPrintPdf(result.documents, generatedIds, duplex), url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
        if (popup && !popup.closed && !uploaded.length) { popup.addEventListener("load", () => { try { popup.print(); } catch { /* Viewer print button remains available. */ } }, { once: true }); popup.location.href = url; }
        else if (action === "print" && uploaded.length) { window.open(url, "_blank", "noopener"); setNotice("Generated forms and original documents opened separately. Original signatures are preserved."); }
        else if (action === "download") { const link = document.createElement("a"); link.href = url; link.download = `${props.pathway}-${result.packetNumber}.pdf`; link.click(); }
        else { setPreviewIds(ids); setNotice("The print window was blocked. Use the PDF preview or Download selected PDF."); }
        setTimeout(() => URL.revokeObjectURL(url), 300000);
      }
    } catch (caught) { popup?.close(); setError(caught instanceof Error ? caught.message : "The forms could not be opened; your entries remain here."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function saveAndReturn() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    let saved = false;
    try { if (!draft || !await draft.save()) throw new Error(draft?.saveError() || "Saving failed; your entries are retained."); saved = true; setReturnToForms(value => value + 1); setNotice("Changes saved. Returned to your form selection."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Saving failed; your entries are retained."); }
    finally { pending.current = false; setBusy(false); }
    if (saved && lastAction.current) await perform("preview", lastAction.current.ids);
  }
  async function openLegacy(id: string) { try { const response = await fetch(`/api/crm/v1/contract-packets/${encodeURIComponent(id)}`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "This archived packet is unavailable."); setLegacyPreview(body); } catch (caught) { setError(caught instanceof Error ? caught.message : "The archived packet could not be opened."); } }
  const archived = <section aria-label="Legacy pathway packs"><h3>Previous {props.pathway} form pack</h3><p>The previous template set is retained here for reference. Existing generated packets and signed originals remain in Sales Documents; no historical document is replaced.</p>{jacketId && <p><a href={"/sales-documents?jacketId=" + encodeURIComponent(jacketId)}>Open archived deal documents and signed originals</a></p>}<details><summary>Previous template pack contents</summary><ul>{(props.legacyForms ?? (props.pathway === "bhph" ? BHPH_FORM_PACKET : MN_SALE_FORM_PACKET)).map(form => <li key={form.id}>{form.label}</li>)}</ul></details>{props.onOpenLegacy && <button type="button" onClick={() => { setOpen(false); props.onOpenLegacy?.(); }}>Open legacy template pack</button>}{legacyIds.map(id => <button type="button" key={id} onClick={() => void openLegacy(id)}>Review archived packet {id.slice(-8)}</button>)}{!legacyIds.length && <p>No previous generated packet is linked to this saved draft. The legacy template pack above remains available for reference.</p>}{legacyPreview && <div><h4>{legacyPreview.packetNumber}</h4>{legacyPreview.salesDocumentsHref && <a href={legacyPreview.salesDocumentsHref}>Open original documents and signed copies</a>}<ul>{legacyPreview.documents.map(doc => <li key={doc.formId}>{doc.label}</li>)}</ul></div>}</section>;
  return <section aria-label="Default vehicle sale forms library"><p>Use the shared forms library for this sale. Financing agreements, lender evidence and signed originals keep their existing requirements.</p><button type="button" data-deal-packet-open onClick={() => setOpen(true)}>Open sale forms library</button>{open && <CashSalePrintLibrary returnToForms={returnToForms} printPacks={[{ id: "pathway-default-" + props.pathway, label: props.pathway === "bhph" ? "Complete BHPH sale pack" : props.pathway === "wholesale" ? "Wholesale shared forms" : "Complete financed sale pack", detail: "Shared library forms and applicable pathway-specific supporting documents.", ids: saleLibraryDefaultIds(props.pathway, facts, props.warrantyOffered !== false) }]} formUnavailable={unavailable} catalog={catalog} dialogLabel="Vehicle sale forms library" workspaceTitle="Vehicle sale forms library" dealSummary={{ customer: props.customerName, vehicle: vehicle?.label || "Select vehicle", vin: vehicle?.vin || "", price: props.salePrice, total: "See saved deal terms" }} archivedContent={archived} facts={facts} selected={activeSelected} onSelect={setSelected} busy={busy} canPreview={Boolean(packet && fingerprint === currentFingerprint)} preparedIds={[...(packet?.documents.map(doc => doc.formId) ?? []), ...originals.map(doc => doc.type)]} outdated={Boolean(packet && fingerprint !== currentFingerprint)} onReviewForm={id => void perform("preview", [id])} onPrepareAll={() => void perform("preview", catalog.filter(form => !unavailable(form.id)).map(form => form.id))} onGenerate={() => void perform("preview")} onPreview={() => void perform("preview")} onPrint={() => void perform("print")} onDownload={() => void perform("download")} onClose={() => setOpen(false)} duplexSafe={duplex} onDuplexChange={setDuplex} detailsOpen={Boolean(error)} details={<fieldset disabled={busy}><legend>Shared sale details for paperwork</legend>{props.pathway === "bhph" && <p>BHPH dates, odometer, financing amounts and warranty election come from the deal terms. Edit those values there before preparing updated forms.</p>}<div className={styles.retailFieldGrid}>{field("Buyer address", "buyerAddress")}{field("Buyer phone", "buyerPhone")}{field("Buyer email", "buyerEmail", "email")}{field("Sale date", "saleDate", "date")}{field("Delivery date", "deliveryDate", "date")}{field("Odometer reading", "mileage")}<label><span>Mileage status</span><select value={facts.odometerStatus} onChange={event => edit("odometerStatus", event.target.value)}><option value="">Choose…</option>{["Actual", "Not actual - odometer discrepancy", "Exceeds mechanical limits", "Exempt"].map(value => <option key={value}>{value}</option>)}</select></label>{field("Odometer exemption basis", "odometerExemption")}{field("Title brand", "titleBrand")}{field("Known damage", "damageDisclosure")}{field("Named POA agent", "authorizedAgent")}<label><span>Warranty terms</span><select disabled={props.pathway === "bhph"} value={props.pathway === "bhph" ? props.defaults?.warrantyType ?? facts.warrantyType : facts.warrantyType} onChange={event => edit("warrantyType", event.target.value)}><option value="">Choose…</option><option>Dealer limited warranty</option><option>No dealer warranty - eligibility reviewed</option></select></label>{field("Covered systems", "warrantyCoverage")}{field("Warranty duration / mileage", "warrantyDuration")}{field("No-warranty eligibility basis", "warrantyExemption")}{field("As Is exclusion", "asIsExclusion")}{field("Eligibility reviewed by / date", "eligibilityReviewedBy")}</div><details><summary>Itemized taxes and fees for sale paperwork</summary><p>BHPH amounts use the existing server-calculated financing figures. Other financed sales use the sale paperwork amounts below; the lender’s signed agreement remains authoritative.</p><div className={styles.retailFieldGrid}>{field("Documentation fee", "docFee")}{field("Title / transfer / plate fees", "titleFee")}{field("Registration fee / tax", "registrationFee")}{field("Other fee", "otherFee")}{field("Other fee label", "otherFeeLabel")}{field("Taxable accessories", "accessories")}{field("Tax override", "taxOverride")}{field("Tax override basis", "taxReason")}</div></details><button type="button" disabled={busy} onClick={() => void saveAndReturn()}>Save changes &amp; return</button>{props.pathway === "bhph" && <button type="button" disabled={busy} onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("deal-workspace-navigate", { detail: "terms" })); }}>Edit BHPH deal terms</button>}</fieldset>} feedback={<>{props.pathway === "wholesale" && props.onManageOriginals && <button type="button" disabled={busy} onClick={() => { setOpen(false); props.onManageOriginals?.(); }}>Upload / review wholesale originals</button>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</>}>{props.pathway === "wholesale" && <section aria-label="Original wholesale documents"><h3>Wholesale originals</h3>{jacketId && <a href={"/sales-documents?jacketId=" + encodeURIComponent(jacketId)}>Open document archive and signed originals</a>}<ul>{originals.map(doc => <li key={doc.id}><a href={originalHref(doc.id)} target="_blank" rel="noreferrer">{doc.fileName}</a> · {doc.signed ? "Signed copy" : "Signature not verified"} · {doc.reviewed ? "Reviewed" : "Review pending"}</li>)}</ul></section>}{originalUrl && previewIdentity === currentOriginalIdentity && <section ref={preview} tabIndex={-1} aria-label="Wholesale original preview"><h3>Original wholesale document — unchanged</h3><iframe title="Wholesale original document" src={originalUrl} style={{width:"100%",height:"70dvh",border:0}} /></section>}{previewIds.length > 0 && packet && <section ref={preview} tabIndex={-1} aria-label="Populated sale library preview"><h3>{previewIds.length === 1 ? packet.documents.find(doc => doc.formId === previewIds[0])?.label : "Selected sale forms"}</h3><iframe ref={frame} title="Populated sale library forms" style={{ width: "100%", height: "70dvh", minHeight: 320, border: 0 }} /></section>}</CashSalePrintLibrary>}</section>;
}
