"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useArchivedDealPacket, useDealDraft, useDealDraftState } from "./deal-draft-workspace";

import { useCanonicalDealVehicle } from "./shared-deal-identities";

import { CrmNextVinDecoder, type VinDecoderHandle } from "./crm-next-vin-decoder";

import { EMPTY_CASH_SALE, cashSaleWarrantySelection, CASH_SALE_DATE_FIELDS, cashSaleDate, normalizeCashSaleDates, cashSaleTotals, cashMoney, cashSaleError, type CashSaleFacts } from "@/lib/cash-retail-sale";
import { prefillCustomerContact } from "@/lib/customer-contact-prefill";

import { requestContractPacket } from "@/lib/deal-packet-feedback";

import type { UnifiedCrmContractPacketResult } from "@/server/unified-crm/contract-packet-contract";

import styles from "./crm-next-shell.module.css";

import cashStyles from "./cash-retail-sale-desk.module.css";
import { CashSalePrintLibrary } from "./cash-sale-print-library";
import { MnTitleFeeEditor } from "./mn-title-fee-editor";
import { CASH_PRINT_CATALOG, cashDefaultFormIds, cashFormUnavailable, cashGenerationIds } from "@/lib/cash-sale-print-library";
import { cashSelectedPrintPdf } from "@/lib/cash-sale-print-pdf";



type Props = { amount: string; customerName: string; customerPrefill: { address: string; phoneNumber: string; email: string }; onAmountChange: (value: string) => void; onVehicleChange: (value: string) => void; vehicle: string; getDocumentContext: () => Record<string, string> };

export function CashRetailSaleDesk(props: Props) {

  const previewFrame = useRef<HTMLIFrameElement>(null);
  const previewPanel = useRef<HTMLElement>(null);
  const dateInputs = useRef<Partial<Record<keyof CashSaleFacts, HTMLInputElement>>>({});

  const draft = useDealDraft(), decoder = useRef<VinDecoderHandle>(null);

  const [facts, setFacts] = useDealDraftState("cashSaleFacts", { ...EMPTY_CASH_SALE, buyerAddress: props.customerPrefill.address, buyerPhone: props.customerPrefill.phoneNumber, buyerEmail: props.customerPrefill.email });

  const [vehicle, setVehicle] = useDealDraftState("vehicleFacts", { vin: "", stockNumber: "", year: "", make: "", model: "", color: "", trim: "", licensePlate: "" });

  useCanonicalDealVehicle(setVehicle);

  const [selected, setSelected] = useDealDraftState<string[]>("cashSaleForms", () => cashDefaultFormIds(facts));

  const [packet, setPacket, packetState] = useArchivedDealPacket<UnifiedCrmContractPacketResult>(true);

  const [generatedFingerprint, setGeneratedFingerprint] = useDealDraftState("cashGeneratedFingerprint", "");

  const fingerprint = JSON.stringify([props.amount, facts, vehicle]);
  const [duplexSafe, setDuplexSafe] = useDealDraftState("cashPrintDuplexSafe", true);
  useEffect(() => { setSelected(current => { const next=current.filter(id=>!cashFormUnavailable(id,facts)); return next.length===current.length ? current : next; }); }, [facts.warrantyType, facts.tradeVin, facts, setSelected]);

  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [drawer, setDrawer] = useState(false), [preview, setPreview] = useState(false), [previewId, setPreviewId] = useState("");

  const requestKey = useRef(crypto.randomUUID());
  const pendingAction = useRef(false);
  const [requestedReview, setRequestedReview] = useState("");
  const [returnToForms, setReturnToForms] = useState(0);
  const lastAttempt = useRef<{ action: "review" | "preview"; formId?: string } | null>(null);
  const latestFingerprint = useRef(fingerprint);
  useEffect(() => { latestFingerprint.current = fingerprint; }, [fingerprint]);
  const [packetBuyer, setPacketBuyer] = useDealDraftState("cashPacketBuyer", props.customerName);
  useEffect(() => {
    if (packetBuyer === props.customerName) return;
    setPacketBuyer(props.customerName);
    setFacts(current => ({ ...current, buyerAddress: props.customerPrefill.address, buyerPhone: props.customerPrefill.phoneNumber, buyerEmail: props.customerPrefill.email, coBuyer: "", insuranceCompany: "", insurancePolicy: "", insuranceExpiration: "" }));
  }, [packetBuyer, props.customerName, props.customerPrefill.address, props.customerPrefill.phoneNumber, props.customerPrefill.email, setFacts, setPacketBuyer]);

  const edit = (key: keyof CashSaleFacts, value: string) => { setFacts(current => key === "warrantyType" ? cashSaleWarrantySelection(current, value) : ({ ...current, [key]: value })); if (key === "warrantyType") setError(current => /warranty|covered systems/i.test(current) ? "" : current); setNotice("Details changed. Generate the packet again to include these changes."); };

  useEffect(() => { setFacts(current => ({ ...normalizeCashSaleDates(current), buyerAddress: current.buyerAddress || props.customerPrefill.address, buyerPhone: prefillCustomerContact(current.buyerPhone, props.customerPrefill.phoneNumber), buyerEmail: prefillCustomerContact(current.buyerEmail, props.customerPrefill.email) })); }, [props.customerPrefill.address, props.customerPrefill.phoneNumber, props.customerPrefill.email, setFacts]);

  const calculation = useMemo(() => { try { return { totals: cashSaleTotals(props.amount, facts), error: "" }; } catch (e) { return { totals: null, error: e instanceof Error ? e.message : "Check the sale amounts." }; } }, [props.amount, facts]);

  const document = packet?.documents.find(d => d.formId === previewId);
  const changed = Boolean(generatedFingerprint && generatedFingerprint !== fingerprint) || packetState.dirty;
  const canPreview = Boolean(packet && selected.length && !changed && selected.every(id => packet.documents.some(doc => doc.formId === id)));
  const warrantyError = error.startsWith("Record why the vehicle is exempt") || error.startsWith("Record the exact As Is exclusion") || error.startsWith("Describe the covered systems") || error.startsWith("Choose the warranty terms");

  useEffect(() => {
    if (!preview || !packet) return;
    let active = true, url = "";
    void (async () => {
      try {
        const bytes = document?.contentBase64 ? Uint8Array.from(atob(document.contentBase64), c => c.charCodeAt(0)) : await cashSelectedPrintPdf(packet.documents, selected, duplexSafe);
        if (!active) return;
        url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type:"application/pdf"}));
        if (previewFrame.current) previewFrame.current.src = url;
      } catch (e) { if(active)setError(e instanceof Error ? e.message : "The selected PDF could not be opened."); }
    })();
    return () => { active = false; if(url)URL.revokeObjectURL(url); };
  }, [preview, packet, document, selected, duplexSafe]);

  const field = (label: string, key: keyof CashSaleFacts, type = "text") => <label key={key}><span>{label}</span><input type={type} ref={type === "date" ? input => { if (input) dateInputs.current[key] = input; else delete dateInputs.current[key]; } : undefined} value={type === "date" ? cashSaleDate(facts[key]) || facts[key] : facts[key]} onInput={type === "date" ? e => edit(key, e.currentTarget.value) : undefined} onChange={e => edit(key, e.target.value)} /></label>;

  const choice = (label: string, key: keyof CashSaleFacts, values: string[]) => <label><span>{label}</span><select value={facts[key]} onChange={e => edit(key, e.target.value)}><option value="">Choose...</option>{values.map(value => <option key={value}>{value}</option>)}</select></label>;
  function visibleDateFacts() {
    return normalizeCashSaleDates({ ...facts, ...Object.fromEntries(CASH_SALE_DATE_FIELDS.flatMap(key => {
      const input = dateInputs.current[key];
      if (!input) return [];
      if (input.validity.badInput) throw new Error(`Enter a valid ${key === "saleDate" ? "sale" : key.replace("Date", "")} date.`);
      return [[key, input.value]];
    })) });
  }
  function openForms() {
    try { const visible = visibleDateFacts(); setFacts(visible); latestFingerprint.current = JSON.stringify([props.amount, visible, vehicle]); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Review the entered dates."); }
    setDrawer(true);
  }
  async function saveCorrectionsAndReturn() {
    if (pendingAction.current) return;
    pendingAction.current = true; setBusy(true); setError(""); setNotice("");
    let saved = false;
    try {
      const visible = visibleDateFacts();
      setFacts(visible); latestFingerprint.current = JSON.stringify([props.amount, visible, vehicle]);
      if (!draft || !await draft.save()) throw new Error(draft?.saveError() || "The changes could not be saved. Your entries remain here; retry saving.");
      saved = true;
      setReturnToForms(current => current + 1);
      setNotice("Changes saved. Returned to your forms workspace with your selection kept.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The changes could not be saved. Your entries remain here."); }
    finally { pendingAction.current = false; setBusy(false); }
    // Resume review rather than unexpectedly opening a print window or downloading a file.
    if (saved && lastAttempt.current) await perform(lastAttempt.current.action, lastAttempt.current.formId);
  }
  const preparationFields = <>
    <fieldset disabled={busy}><legend>Buyer, sale date & odometer for populated forms</legend><div className={styles.retailFieldGrid}>
      <label><span>Packet sale date</span><input type="date" value={cashSaleDate(facts.saleDate)} onChange={event => edit("saleDate", event.target.value)} /></label>
      {field("Packet buyer address", "buyerAddress")}{field("Packet odometer reading", "mileage")}
      {choice("Packet mileage status", "odometerStatus", ["Actual", "Not actual - odometer discrepancy", "Exceeds mechanical limits", "Exempt"])}
      {field("Packet title brand (enter None if none)", "titleBrand")}{field("Packet known damage disclosure (enter None if none)", "damageDisclosure")}
      {facts.odometerStatus === "Exempt" && field("Packet odometer exemption basis", "odometerExemption")}
    </div><p>Changes update the same deal fields. Complete the requirements here, then retry the selected form below.</p></fieldset>
  </>;
  const warrantyFields = <fieldset disabled={busy} style={{ margin: "10px 0", padding: 12, border: "1px solid #b4c2d7", borderRadius: 4 }}>
    <legend>Warranty details for printing</legend>
    <div className={styles.retailFieldGrid}>
      {choice("Warranty terms", "warrantyType", ["Dealer limited warranty", "No dealer warranty - eligibility reviewed"])}
      {facts.warrantyType === "No dealer warranty - eligibility reviewed" && field("Reviewed no-warranty reason", "warrantyExemption")}
      {facts.warrantyType === "Dealer limited warranty" && <>{field("Covered systems", "warrantyCoverage")}{field("Warranty duration / mileage", "warrantyDuration")}</>}
      {facts.warrantyType === "No dealer warranty - eligibility reviewed" && <>{field("Exact As Is statutory exclusion / subdivision", "asIsExclusion")}{field("Eligibility reviewed by / date", "eligibilityReviewedBy")}</>}
    </div>
    <small>Record the reviewed warranty terms. These details are saved with the deal and included in updated forms.</small>
  </fieldset>;

  async function preparePacket(forceGeneration = false, requestedIds = selected): Promise<UnifiedCrmContractPacketResult> {
    if (!requestedIds.length) throw new Error("Choose at least one form or print pack.");
    // Browser autofill and legacy restored controls may change a date without a React change event.
    // Take one explicit snapshot for validation, draft saving and document generation.
    const packetFacts = visibleDateFacts();
    const packetFingerprint = JSON.stringify([props.amount, packetFacts, vehicle]);
    const packetChanged = Boolean(generatedFingerprint && generatedFingerprint !== packetFingerprint) || packetState.dirty;
    if (JSON.stringify(packetFacts) !== JSON.stringify(facts)) { setFacts(packetFacts); latestFingerprint.current = packetFingerprint; }
    let available = packet;
    if (!available && (packetState.loading || packetState.error)) {
      available = await packetState.retry();
      if (!available) throw new Error("The saved packet could not be opened. Use Retry opening saved packet before creating another copy.");
    }
    if (!forceGeneration && available && !packetChanged && requestedIds.every(id => available!.documents.some(doc => doc.formId === id))) return available;

    const retained = !packetChanged && available ? available.documents.filter(doc => !cashFormUnavailable(doc.formId, packetFacts)).map(doc => doc.formId) : [];
    const ids = cashGenerationIds([...new Set([...requestedIds, ...retained])], packetFacts);
    const invalid = cashSaleError(props.customerName, vehicle.vin, props.amount, packetFacts, ids);
    if (invalid) throw new Error(invalid);
    if (!calculation.totals) throw new Error(calculation.error || "Check the sale amounts.");
    if (!draft || !await draft.save()) throw new Error(draft?.saveError() || "Save this deal before generating the packet.");

    const response = await requestContractPacket({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...props.getDocumentContext(), packetType: "MINNESOTA_RETAIL_SALE", dealType: "Retail Cash / One Pay", customerName: props.customerName, salePrice: props.amount, feeTotal: cashMoney(calculation.totals.fees), paymentFunding: "Cash / certified funds", vehicle, retailCash: packetFacts, preparedFormIds: ids, idempotencyKey: requestKey.current }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Packet generation failed. Your entries remain here.");
    if (!result.packetId || !Array.isArray(result.documents) || !requestedIds.every(id => result.documents.some((doc: { formId: string }) => doc.formId === id))) throw new Error("The packet did not include every requested form. Check Sales Documents before retrying.");
    setPacket(result); setGeneratedFingerprint(packetFingerprint); setPreviewId(""); requestKey.current = crypto.randomUUID();
    if (latestFingerprint.current !== packetFingerprint) throw new Error("Deal details changed while the packet was being prepared. Your generated copy is saved; prepare the updated selection before printing.");
    return result as UnifiedCrmContractPacketResult;
  }

  async function perform(action: "generate" | "preview" | "download" | "print" | "review" | "prepare-all", reviewFormId?: string) {
    if (pendingAction.current) return;
    lastAttempt.current = action === "review" ? { action: "review", formId: reviewFormId } : { action: "preview" };
    setRequestedReview(action === "review" ? reviewFormId || "" : "");
    const requestedIds = action === "prepare-all" ? CASH_PRINT_CATALOG.filter(form => !cashFormUnavailable(form.id, facts)).map(form => form.id) : action === "review" && reviewFormId ? [reviewFormId] : selected;
    if (!requestedIds.length) { setError("Choose at least one form or print pack."); return; }
    pendingAction.current = true;
    const popup = action === "print" ? window.open("", "_blank") : null;
    if (popup) { popup.opener = null; popup.document.title = "Preparing selected cash sale forms"; popup.document.body.textContent = "Preparing selected forms for printing…"; }
    setError(""); setNotice(""); setBusy(true);
    try {
      const readyPacket = await preparePacket(action === "generate", requestedIds);
      if (action === "prepare-all") {
        setNotice("All applicable forms are populated from this deal. Review any form without changing your print selection.");
      } else if (action === "generate") {
        setNotice("Packet saved on this deal. Open preview to review and print the selected forms.");
      } else if (action === "preview" || action === "review") {
        setPreviewId(action === "review" ? reviewFormId! : ""); setPreview(true);
        setNotice(action === "review" ? "Populated form prepared below. Your print selection is unchanged." : "Selected forms prepared. Review the PDF preview below.");
        requestAnimationFrame(() => { previewPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }); previewPanel.current?.focus({ preventScroll: true }); });
      } else {
        const bytes = await cashSelectedPrintPdf(readyPacket.documents, selected, duplexSafe);
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
        if (action === "print") {
          if (popup && !popup.closed) {
            popup.addEventListener("load", () => { try { popup.focus(); popup.print(); } catch { /* The PDF viewer retains its print control. */ } }, { once: true });
            popup.location.href = url;
            setNotice("Selected forms opened in the PDF print viewer. Use its print button if the print dialog does not open.");
          } else {
            setPreviewId(""); setPreview(true);
            setNotice("The browser blocked or closed the print window. Your PDF is ready: use Download selected PDF or the preview below.");
          }
        } else {
          const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = `cash-sale-${readyPacket.packetNumber}.pdf`; anchor.click();
          setNotice("Selected PDF prepared for download.");
        }
        setTimeout(() => URL.revokeObjectURL(url), 300_000);
      }
    } catch (caught) {
      popup?.close();
      setError(caught instanceof Error ? caught.message : "The selected forms could not be prepared. Your entries remain here.");
    } finally { pendingAction.current = false; setBusy(false); }
  }
  const sold = draft?.saleStatus === "SOLD", complete = draft?.paperworkComplete;

  return <div className={styles.retailExecutionDesk} data-deal-state-managed aria-label="Cash retail sale workflow">

    <section className={styles.retailSection}>

      <header><span>Cash retail sale</span><strong>{props.customerName || "Select buyer"}</strong></header>

      <div className={styles.retailActionRow}><button className={cashStyles.statusAction} type="button" data-completion={complete ? "complete" : "pending"} disabled={busy || !draft || complete} onClick={() => void draft?.completeSale()}>{complete ? "Sold · finalized" : sold ? "Sold · complete paperwork" : "Mark deal sold"}</button><button type="button" data-deal-packet-open onClick={openForms}>Open cash sale packet</button></div>

      <p>Mark this existing deal sold first. Signed forms, insurance, DMV/title and delivery items can be completed afterward. Yellow means paperwork pending; green means finalized.</p>

      <div className={styles.retailFieldGrid}>{field("Buyer address", "buyerAddress")}{field("Buyer phone", "buyerPhone")}{field("Buyer email", "buyerEmail", "email")}{field("Co-buyer (if applicable)", "coBuyer")}{field("Sale date", "saleDate", "date")}{field("Delivery date (at actual handoff)", "deliveryDate", "date")}</div>

    </section>

    <section className={styles.retailSection}><header><span>Inventory vehicle</span><strong>Confirm the vehicle and mileage</strong></header>

      <div className={styles.retailFieldGrid}><label><span>Selected vehicle</span><input value={props.vehicle} onChange={e => props.onVehicleChange(e.target.value)} /></label>{(["vin", "stockNumber", "year", "make", "model", "color"] as const).map(key => <label key={key}><span>{key === "vin" ? "VIN" : key === "stockNumber" ? "Stock number" : key}</span><input value={vehicle[key]} onChange={e => { const value = e.target.value; setVehicle(current => ({ ...current, [key]: value })); }} /></label>)}{field("Odometer reading", "mileage")}{choice("Mileage status", "odometerStatus", ["Actual", "Not actual - odometer discrepancy", "Exceeds mechanical limits", "Exempt"])}{facts.odometerStatus === "Exempt" && field("Odometer exemption basis", "odometerExemption")}{field("Title brand (enter None if unbranded)", "titleBrand")}{field("Known damage disclosure (enter None known if applicable)", "damageDisclosure")}</div>

      <CrmNextVinDecoder ref={decoder} vin={vehicle.vin} query={props.vehicle} fields={vehicle} onApply={(values, onlyEmpty) => setVehicle(current => ({ ...current, ...Object.fromEntries(Object.entries(values).filter(([key]) => !onlyEmpty || !current[key as keyof typeof current])) }))} />

    </section>

    <section className={styles.retailSection}><header><span>Cash price</span><strong>One price, itemized fees and balance</strong></header><div className={styles.retailFieldGrid}>

      <label><span>Agreed vehicle price</span><input value={props.amount} onChange={e => props.onAmountChange(e.target.value)} /></label>{field("Document fee (not government fee)", "docFee")}<MnTitleFeeEditor facts={facts} onChange={(titleFeeItems, titleFee) => { setFacts(current => ({ ...current, titleFeeItems, titleFee })); setNotice("Title fees updated. Prepare the packet again to include the new breakdown."); }} />{field("Registration fee / tax (tabs only)", "registrationFee")}{field("Taxable accessories / labor", "accessories")}{field("Rebate", "rebate")}

      {calculation.totals && <><label><span>Taxable vehicle amount</span><input readOnly value={cashMoney(calculation.totals.taxable)} /></label><label><span>MN motor vehicle sales tax · 6.875%</span><input readOnly value={cashMoney(calculation.totals.tax)} /></label><label><span>Total cash obligation</span><input readOnly value={cashMoney(calculation.totals.total)} /></label><label><span>Remaining balance</span><input readOnly value={cashMoney(calculation.totals.balance)} /></label></>}

    </div><details><summary>Trade-in, other fees or tax override</summary><div className={styles.retailFieldGrid}>{field("Trade vehicle", "tradeVehicle")}{field("Motor vehicle trade VIN", "tradeVin")}{field("Trade allowance", "tradeAllowance")}{field("Trade payoff", "tradePayoff")}{field("Trade lienholder", "tradeLienholder")}{field("Other separately stated fee", "otherFee")}{field("Other fee description", "otherFeeLabel")}{field("Tax override (blank uses calculated tax)", "taxOverride")}{field("Override / exemption reason", "taxReason")}</div></details></section>

    <section className={styles.retailSection}><header><span>Packet details</span><strong>Complete only the items needed for the selected forms</strong></header><div className={styles.retailFieldGrid}>{field("Dealer phone", "dealerPhone")}{field("Named POA agent", "authorizedAgent")}{choice("Warranty terms", "warrantyType", ["Dealer limited warranty", "No dealer warranty - eligibility reviewed"])}{field("Covered systems", "warrantyCoverage")}{field("Warranty duration / mileage", "warrantyDuration")}</div>

      <details><summary>Insurance, payment record, warranty and delivery details</summary><div className={styles.retailFieldGrid}>{field("Insurance company", "insuranceCompany")}{field("Insurance policy", "insurancePolicy")}{field("Insurance expiration", "insuranceExpiration", "date")}{field("Payment actually recorded", "paymentReceived")}{field("Payment method", "paymentMethod")}{field("Payment reference / receipt", "paymentReference")}{field("Payment date", "paymentDate", "date")}{field("Dealer pays labor %", "warrantyLabor")}{field("Dealer pays parts %", "warrantyParts")}{field("No-warranty eligibility basis", "warrantyExemption")}{field("Exact As Is statutory exclusion / subdivision", "asIsExclusion")}{field("Eligibility reviewed by / date", "eligibilityReviewedBy")}{field("Co-buyer address", "coBuyerAddress")}{field("Promised repairs / items", "promises")}{field("Promised completion", "promiseDue", "date")}{field("Keys", "keys")}{field("Fuel", "fuel")}{field("Delivery notes", "deliveryNotes")}{field("Dealer legal name", "dealerName")}{field("Dealer address", "dealerAddress")}{field("Dealer email", "dealerEmail", "email")}</div></details>

    </section>

    {calculation.error && <p role="alert">{calculation.error}</p>}

    {drawer && <CashSalePrintLibrary facts={facts} preparedIds={packet?.documents.map(doc=>doc.formId) ?? []} outdated={changed} dealSummary={{customer:props.customerName,vehicle:props.vehicle,vin:vehicle.vin,price:calculation.totals ? cashMoney(calculation.totals.sale) : props.amount,total:calculation.totals ? cashMoney(calculation.totals.total) : "Review amounts"}} onPrepareAll={()=>void perform("prepare-all")} onReviewForm={id=>void perform("review",id)} returnToForms={returnToForms} details={<><div className={styles.retailActionRow}><button type="button" disabled={busy} onClick={()=>void saveCorrectionsAndReturn()}>{busy ? "Saving changes…" : "Save changes & return"}</button><span>Save corrections and return to the form you were reviewing. Your print selection is kept.</span></div>{preparationFields}{warrantyFields}</>} detailsOpen={Boolean(error)} selected={selected} onSelect={ids=>{if(pendingAction.current)return;setSelected(ids);if(!previewId)setPreview(false);setError("");}} busy={busy} canPreview={canPreview} onGenerate={()=>void perform("generate")} onPreview={()=>void perform("preview")} onPrint={()=>void perform("print")} onDownload={()=>void perform("download")} onClose={()=>setDrawer(false)} duplexSafe={duplexSafe} onDuplexChange={value=>{if(!pendingAction.current)setDuplexSafe(value);}} feedback={<>
      {packetState.error && <p role="alert">{packetState.error}<button type="button" onClick={()=>void packetState.retry()}>Retry opening saved packet</button></p>}
      {packetState.loading && <p role="status">Opening saved packet…</p>}
      {changed && <p role="status">The saved packet has earlier deal details. Preview, Download or Print will prepare an updated copy.</p>}
      {packet && !changed && selected.some(id=>!packet.documents.some(doc=>doc.formId===id)) && <p role="status">The selected output will prepare any forms missing from the saved packet.</p>}
      {error && <div role="alert"><p>{warrantyError ? "Complete the warranty details above, then choose Print selected forms." : error}</p>{requestedReview && <button type="button" disabled={busy} onClick={()=>void perform("review",requestedReview)}>Retry selected form review</button>}{!warrantyError && !/sale date|odometer|mileage|title brand|damage disclosure|buyer\'s address/i.test(error) && <button type="button" disabled={busy} onClick={()=>{setDrawer(false);window.dispatchEvent(new CustomEvent("deal-workspace-navigate",{detail:"terms"}));}}>Review deal details</button>}</div>}{notice && <p role="status">{notice}</p>}
      </>}>
      {preview && packet && <section ref={previewPanel} tabIndex={-1} className={styles.retailSection} aria-label="Generated cash sale preview">
        <header><h3>{document?.label || "Selected populated forms"}</h3><button type="button" onClick={()=>setPreview(false)}>Close preview</button></header>
        <label>Document<select value={previewId} onChange={e=>setPreviewId(e.target.value)}><option value="" disabled={!selected.length}>Selected print packet ({selected.length} forms)</option>{packet.documents.filter(doc=>!cashFormUnavailable(doc.formId,facts)).map(doc=><option key={doc.formId} value={doc.formId}>{doc.label}</option>)}</select></label>
        {previewId && <label><input type="checkbox" disabled={busy} checked={selected.includes(previewId)} onChange={event=>setSelected(current=>event.target.checked ? [...new Set([...current,previewId])] : current.filter(id=>id!==previewId))}/>Include reviewed form in print selection</label>}
        <p>Review the populated copy below. Opening a preview does not change your print selection. Generated copies are unsigned.</p>
        {changed && <p role="alert">This preview has earlier deal details. Prepare an updated copy before printing.</p>}
        <iframe ref={previewFrame} title={document?.label || "Selected cash sale print packet"} style={{width:"100%",height:"70dvh",minHeight:320,border:0}}/>
      </section>}
    </CashSalePrintLibrary>}


  </div>;

}
