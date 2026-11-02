"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useArchivedDealPacket, useDealDraft, useDealDraftState } from "./deal-draft-workspace";

import { useCanonicalDealVehicle } from "./shared-deal-identities";

import { CrmNextVinDecoder, type VinDecoderHandle } from "./crm-next-vin-decoder";

import { CASH_SALE_FORM_IDS, CASH_SALE_REQUIRED_IDS, CASH_SALE_LABELS, EMPTY_CASH_SALE, cashSaleTotals, cashMoney, cashSaleError, type CashSaleFacts } from "@/lib/cash-retail-sale";

import { requestContractPacket } from "@/lib/deal-packet-feedback";

import type { UnifiedCrmContractPacketResult } from "@/server/unified-crm/contract-packet-contract";

import styles from "./crm-next-shell.module.css";

import cashStyles from "./cash-retail-sale-desk.module.css";



type Props = { amount: string; customerName: string; customerPrefill: { address: string; phoneNumber: string; email: string }; onAmountChange: (value: string) => void; onVehicleChange: (value: string) => void; vehicle: string; getDocumentContext: () => Record<string, string> };

export function CashRetailSaleDesk(props: Props) {

  const previewFrame = useRef<HTMLIFrameElement>(null);

  const draft = useDealDraft(), decoder = useRef<VinDecoderHandle>(null);

  const [facts, setFacts] = useDealDraftState("cashSaleFacts", { ...EMPTY_CASH_SALE, buyerAddress: props.customerPrefill.address, buyerPhone: props.customerPrefill.phoneNumber, buyerEmail: props.customerPrefill.email });

  const [vehicle, setVehicle] = useDealDraftState("vehicleFacts", { vin: "", stockNumber: "", year: "", make: "", model: "", color: "", trim: "", licensePlate: "" });

  useCanonicalDealVehicle(setVehicle);

  const [selected, setSelected] = useDealDraftState<string[]>("cashSaleForms", [...CASH_SALE_FORM_IDS]);

  const [packet, setPacket, packetState] = useArchivedDealPacket<UnifiedCrmContractPacketResult>(true);

  const [generatedFingerprint, setGeneratedFingerprint] = useDealDraftState("cashGeneratedFingerprint", "");

  const fingerprint = JSON.stringify([props.amount, facts, vehicle, selected]);

  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [drawer, setDrawer] = useState(false), [preview, setPreview] = useState(false), [previewId, setPreviewId] = useState("");

  const requestKey = useRef(crypto.randomUUID());
  const [packetBuyer, setPacketBuyer] = useDealDraftState("cashPacketBuyer", props.customerName);
  useEffect(() => {
    if (packetBuyer === props.customerName) return;
    setPacketBuyer(props.customerName);
    setFacts(current => ({ ...current, buyerAddress: props.customerPrefill.address, buyerPhone: props.customerPrefill.phoneNumber, buyerEmail: props.customerPrefill.email, coBuyer: "", insuranceCompany: "", insurancePolicy: "", insuranceExpiration: "" }));
  }, [packetBuyer, props.customerName, props.customerPrefill.address, props.customerPrefill.phoneNumber, props.customerPrefill.email, setFacts, setPacketBuyer]);

  const edit = (key: keyof CashSaleFacts, value: string) => { setFacts(current => ({ ...current, [key]: value })); setNotice("Details changed. Generate the packet again to include these changes."); };

  useEffect(() => { setFacts(current => ({ ...current, buyerAddress: current.buyerAddress || props.customerPrefill.address, buyerPhone: current.buyerPhone || props.customerPrefill.phoneNumber, buyerEmail: current.buyerEmail || props.customerPrefill.email })); }, [props.customerPrefill.address, props.customerPrefill.phoneNumber, props.customerPrefill.email, setFacts]);

  const calculation = useMemo(() => { try { return { totals: cashSaleTotals(props.amount, facts), error: "" }; } catch (e) { return { totals: null, error: e instanceof Error ? e.message : "Check the sale amounts." }; } }, [props.amount, facts]);

  const document = packet?.documents.find(d => d.formId === previewId) || packet?.documents[0];

  useEffect(() => {

    if (!preview || !document?.contentBase64) return;

    const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(document.contentBase64), c => c.charCodeAt(0))], { type: "application/pdf" })); if (previewFrame.current) previewFrame.current.src = url;

    return () => URL.revokeObjectURL(url);

  }, [preview, document]);

  const field = (label: string, key: keyof CashSaleFacts, type = "text") => <label key={key}><span>{label}</span><input type={type} value={facts[key]} onChange={e => edit(key, e.target.value)} /></label>;

  const choice = (label: string, key: keyof CashSaleFacts, values: string[]) => <label><span>{label}</span><select value={facts[key]} onChange={e => edit(key, e.target.value)}><option value="">Choose...</option>{values.map(value => <option key={value}>{value}</option>)}</select></label>;

  async function generate() {

    setError(""); setNotice("");

    const ids = facts.tradeVin ? [...new Set([...selected, "trade-documents"])] : selected;

    const invalid = cashSaleError(props.customerName, vehicle.vin, props.amount, facts, ids);

    if (invalid) { setError(invalid); return; }

    setBusy(true);

    try {

      if (!draft || !await draft.save()) throw new Error(draft?.saveError() || "Save this deal before generating the packet.");

      const response = await requestContractPacket({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...props.getDocumentContext(), packetType: "MINNESOTA_RETAIL_SALE", dealType: "Retail Cash / One Pay", customerName: props.customerName, salePrice: props.amount, feeTotal: cashMoney(calculation.totals!.fees), paymentFunding: "Cash / certified funds", vehicle, retailCash: facts, preparedFormIds: ids, idempotencyKey: requestKey.current }) });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Packet generation failed. Your entries remain here.");

      setPacket(result); setGeneratedFingerprint(fingerprint); setPreviewId(result.documents[0]?.formId || ""); setNotice("Packet saved on this deal. Open preview to review and print the selected forms."); requestKey.current = crypto.randomUUID();

    } catch (e) { setError(e instanceof Error ? e.message : "The packet could not be generated."); }

    finally { setBusy(false); }

  }

  async function download() {

    if (!packet) return;

    setError(""); setBusy(true);

    try {

      const { PDFDocument, PDFName } = await import("pdf-lib"), combined = await PDFDocument.create();

      for (const doc of packet.documents) {

        if (!doc.contentBase64 || doc.contentType !== "application/pdf") continue;

        const source = await PDFDocument.load(Uint8Array.from(atob(doc.contentBase64), c => c.charCodeAt(0)));

        // Render appearances before copying so the combined print copy retains values without duplicate field names.

        source.getForm().flatten();

        source.getPages().forEach(page => page.node.delete(PDFName.of("Annots")));

        for (const page of await combined.copyPages(source, source.getPageIndices())) combined.addPage(page);

      }

      const bytes = await combined.save(), url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" })), anchor = window.document.createElement("a");

      anchor.href = url; anchor.download = `cash-sale-${packet.packetNumber}.pdf`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch { setError("The combined PDF could not be downloaded. Open each saved form in preview instead."); }

    finally { setBusy(false); }

  }

  const sold = draft?.saleStatus === "SOLD", complete = draft?.paperworkComplete;

  return <div className={styles.retailExecutionDesk} aria-label="Cash retail sale workflow">

    <section className={styles.retailSection}>

      <header><span>Cash retail sale</span><strong>{props.customerName || "Select buyer"}</strong></header>

      <div className={styles.retailActionRow}><button className={cashStyles.statusAction} type="button" data-completion={complete ? "complete" : "pending"} disabled={busy || !draft || complete} onClick={() => void draft?.completeSale()}>{complete ? "Sold · finalized" : sold ? "Sold · complete paperwork" : "Mark deal sold"}</button><button type="button" onClick={() => setDrawer(true)}>Open cash sale packet</button></div>

      <p>Mark this existing deal sold first. Signed forms, insurance, DMV/title and delivery items can be completed afterward. Yellow means paperwork pending; green means finalized.</p>

      <div className={styles.retailFieldGrid}>{field("Buyer address", "buyerAddress")}{field("Buyer phone", "buyerPhone")}{field("Buyer email", "buyerEmail", "email")}{field("Co-buyer (if applicable)", "coBuyer")}{field("Sale date", "saleDate", "date")}{field("Delivery date (at actual handoff)", "deliveryDate", "date")}</div>

    </section>

    <section className={styles.retailSection}><header><span>Inventory vehicle</span><strong>Confirm the vehicle and mileage</strong></header>

      <div className={styles.retailFieldGrid}><label><span>Selected vehicle</span><input value={props.vehicle} onChange={e => props.onVehicleChange(e.target.value)} /></label>{(["vin", "stockNumber", "year", "make", "model", "color"] as const).map(key => <label key={key}><span>{key === "vin" ? "VIN" : key === "stockNumber" ? "Stock number" : key}</span><input value={vehicle[key]} onChange={e => { const value = e.target.value; setVehicle(current => ({ ...current, [key]: value })); }} /></label>)}{field("Odometer reading", "mileage")}{choice("Mileage status", "odometerStatus", ["Actual", "Not actual - odometer discrepancy", "Exceeds mechanical limits", "Exempt"])}{facts.odometerStatus === "Exempt" && field("Odometer exemption basis", "odometerExemption")}{field("Title brand (enter None if unbranded)", "titleBrand")}{field("Known damage disclosure (enter None known if applicable)", "damageDisclosure")}</div>

      <CrmNextVinDecoder ref={decoder} vin={vehicle.vin} query={props.vehicle} fields={vehicle} onApply={(values, onlyEmpty) => setVehicle(current => ({ ...current, ...Object.fromEntries(Object.entries(values).filter(([key]) => !onlyEmpty || !current[key as keyof typeof current])) }))} />

    </section>

    <section className={styles.retailSection}><header><span>Cash price</span><strong>One price, itemized fees and balance</strong></header><div className={styles.retailFieldGrid}>

      <label><span>Agreed vehicle price</span><input value={props.amount} onChange={e => props.onAmountChange(e.target.value)} /></label>{field("Document fee (not government fee)", "docFee")}{field("Title fees", "titleFee")}{field("Registration / plate fees", "registrationFee")}{field("Taxable accessories / labor", "accessories")}{field("Rebate", "rebate")}

      {calculation.totals && <><label><span>Taxable vehicle amount</span><input readOnly value={cashMoney(calculation.totals.taxable)} /></label><label><span>MN motor vehicle sales tax · 6.875%</span><input readOnly value={cashMoney(calculation.totals.tax)} /></label><label><span>Total cash obligation</span><input readOnly value={cashMoney(calculation.totals.total)} /></label><label><span>Remaining balance</span><input readOnly value={cashMoney(calculation.totals.balance)} /></label></>}

    </div><details><summary>Trade-in, other fees or tax override</summary><div className={styles.retailFieldGrid}>{field("Trade vehicle", "tradeVehicle")}{field("Motor vehicle trade VIN", "tradeVin")}{field("Trade allowance", "tradeAllowance")}{field("Trade payoff", "tradePayoff")}{field("Trade lienholder", "tradeLienholder")}{field("Other separately stated fee", "otherFee")}{field("Other fee description", "otherFeeLabel")}{field("Tax override (blank uses calculated tax)", "taxOverride")}{field("Override / exemption reason", "taxReason")}</div></details></section>

    <section className={styles.retailSection}><header><span>Packet details</span><strong>Complete only the items needed for the selected forms</strong></header><div className={styles.retailFieldGrid}>{field("Dealer license number", "dealerLicense")}{field("Dealer phone", "dealerPhone")}{field("Named POA agent", "authorizedAgent")}{field("POA expiration", "poaExpiration", "date")}{choice("Warranty terms", "warrantyType", ["Dealer limited warranty", "No dealer warranty - eligibility reviewed"])}{field("Covered systems", "warrantyCoverage")}{field("Warranty duration / mileage", "warrantyDuration")}</div>

      <details><summary>Insurance, payment record, warranty and delivery details</summary><div className={styles.retailFieldGrid}>{field("Insurance company", "insuranceCompany")}{field("Insurance policy", "insurancePolicy")}{field("Insurance expiration", "insuranceExpiration", "date")}{field("Payment actually recorded", "paymentReceived")}{field("Payment method", "paymentMethod")}{field("Payment reference / receipt", "paymentReference")}{field("Payment date", "paymentDate", "date")}{field("Dealer pays labor %", "warrantyLabor")}{field("Dealer pays parts %", "warrantyParts")}{field("No-warranty eligibility basis", "warrantyExemption")}{field("Promised repairs / items", "promises")}{field("Promised completion", "promiseDue", "date")}{field("Keys", "keys")}{field("Fuel", "fuel")}{field("Delivery notes", "deliveryNotes")}{field("Dealer legal name", "dealerName")}{field("Dealer address", "dealerAddress")}{field("Dealer email", "dealerEmail", "email")}</div></details>

    </section>

    {calculation.error && <p role="alert">{calculation.error}</p>}

    {drawer && <div className={styles.retailPacketDrawerBackdrop}><aside className={styles.retailPacketDrawer} role="dialog" aria-label="Cash sale packet"><header><div><span>Cash sale packet</span><strong>Choose forms, generate, then preview</strong></div><button onClick={() => setDrawer(false)} type="button">Close</button></header>

      <div className={styles.retailFormsCommand}><button type="button" onClick={() => setSelected([...CASH_SALE_FORM_IDS])}>Prepare full cash packet</button><button type="button" disabled={busy} onClick={() => void generate()}>{busy ? "Generating..." : "Generate cash sale packet"}</button><button type="button" disabled={!packet || busy} onClick={() => setPreview(true)}>Preview generated packet</button><button type="button" disabled={!packet || busy} onClick={() => void download()}>Download print packet (PDF)</button></div>

      {packetState.error && <p role="alert">{packetState.error}<button type="button" onClick={() => void packetState.retry()}>Retry opening saved packet</button></p>}{packetState.loading && <p role="status">Opening saved packet...</p>}{generatedFingerprint && generatedFingerprint !== fingerprint && <p role="status">The saved packet has earlier details. Generate again to include your changes.</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}

      <p>The title worksheet supports filing; complete the <a href="https://dps.mn.gov/divisions/dvs" target="_blank" rel="noreferrer">current official DVS application or VTAP</a>. Attach the actual title, any secure POA, and signed forms to this deal.</p>

      <div className={styles.retailFormsGrid}>{CASH_SALE_FORM_IDS.map(id => <label key={id}><input type="checkbox" checked={selected.includes(id)} disabled={CASH_SALE_REQUIRED_IDS.includes(id)} onChange={() => setSelected(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id])} /><strong>{CASH_SALE_LABELS[id]}</strong><small>{id === "buyers-guide" ? "Official FTC form" : id === "title-registration-application" ? "Dealership worksheet; official filing still required" : "Dealership document"}</small></label>)}</div>

      {preview && packet && <section aria-label="Generated cash sale preview"><label>Document<select value={document?.formId || ""} onChange={e => setPreviewId(e.target.value)}>{packet.documents.map(doc => <option key={doc.formId} value={doc.formId}>{doc.label}</option>)}</select></label><p>Review the saved PDF below. Use the PDF viewer to print. Generating forms does not mark them signed.</p><iframe ref={previewFrame} title={document?.label || "Cash sale PDF"} style={{ width: "100%", height: "72vh", border: 0 }} /></section>}

    </aside></div>}

  </div>;

}
