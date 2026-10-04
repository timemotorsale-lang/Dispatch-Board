"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ScanLine, Download, Check } from "lucide-react";
import { applicableDecodeProposals, emptyFieldDecodeProposals, VIN_SPECIFICATION_GROUPS, type CrmVehicleDecodeResult } from "@/lib/crm-vehicle-decode";
import styles from "./crm-next-shell.module.css";

type Props = {
  vin: string; query: string; fields: Record<string, string>; onApply: (values: Record<string, string>, onlyEmpty?: boolean) => void;
};
export type VinDecoderHandle = { decodeAndFill: () => void };
export const CrmNextVinDecoder = forwardRef<VinDecoderHandle, Props>(function CrmNextVinDecoder(props, ref) {
  return <VinDecoderSession key={props.vin || props.query} {...props} ref={ref} />;
});

const VinDecoderSession = forwardRef<VinDecoderHandle, Props>(function VinDecoderSession({ vin, query, fields, onApply }, ref) {
  const [result, setResult] = useState<CrmVehicleDecodeResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [yearHint, setYearHint] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  useImperativeHandle(ref, () => ({ decodeAndFill: () => void decode(undefined, true) }));

  async function decode(candidateVin?: string, autoFill = false) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true); setMessage(""); setResult(null); setSelected([]);
    setDetailsOpen(autoFill);
    try {
      const entered = candidateVin || vin.trim() || (/^[A-HJ-NPR-Z0-9]{17}$/i.test(query.trim()) ? query.trim() : "");
      const response = await fetch("/api/crm/v1/vehicle-decode", { method: "POST", headers: { "content-type": "application/json" },
        signal: request.signal, body: JSON.stringify({ vin: entered, query, modelYear: yearHint || undefined }) });
      const payload = await response.json();
      if (request.signal.aborted) return;
      if (!response.ok) throw new Error(payload.error || "Vehicle decoding failed.");
      const decoded = payload as CrmVehicleDecodeResult;
      setResult(decoded);
      const available = emptyFieldDecodeProposals(decoded.proposals, fields);
      setSelected(autoFill ? [] : available.map((proposal) => proposal.field));
      if (autoFill && decoded.vin && available.length > 0) {
        onApply(Object.fromEntries(available.map((proposal) => [proposal.field, proposal.value])), true);
        setMessage(`${available.length} vehicle field${available.length === 1 ? "" : "s"} populated. Review the decoded specifications.`);
      } else setMessage(decoded.vin ? "Vehicle identity returned for review." : "Inventory search complete.");
    } catch (error) {
      if (!request.signal.aborted) setMessage(error instanceof Error ? error.message : "Vehicle decoding failed. Retry or retain verified manual details.");
    } finally { if (!request.signal.aborted) setBusy(false); }
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `vin-decode-${result.vin || "inventory"}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const proposals = result ? applicableDecodeProposals(result.proposals, fields) : [];
  return <div className={styles.vinDecoder}>
    <div className={styles.vinDecoderToolbar}>
      <button type="button" disabled={busy || (!vin.trim() && !query.trim())} onClick={() => void decode()}><ScanLine size={18} aria-hidden="true" />{busy ? "Decoding..." : "Decode VIN"}</button>
      <label><span>Model year hint</span><input type="number" min="1980" max={new Date().getFullYear() + 2} step="1" value={yearHint} onChange={(event) => { controller.current?.abort(); setBusy(false); setResult(null); setMessage(""); setYearHint(event.target.value); }} /></label>
      <span role="status" aria-live="polite">{busy ? "Checking inventory and manufacturer data..." : message}</span>
    </div>
    {result && <>
      {result.warnings.length > 0 && <ul className={styles.vinDecodeWarnings}>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      {result.candidates.length > 0 && <ul className={styles.vinDecodeCandidates}>{result.candidates.map((candidate) => <li key={candidate.id}><button type="button" disabled={!candidate.vin || busy} onClick={() => void decode(candidate.vin || undefined)}>{candidate.stockNumber || candidate.vehicleNumber} | {[candidate.year, candidate.make, candidate.model].filter(Boolean).join(" ")} | {candidate.vin || "VIN missing"}</button></li>)}</ul>}
      {result.vin && <>
        <div className={styles.vinDecodeMetadata}><strong>{result.vin}</strong><span>{result.provider === "NHTSA_VPIC" ? "NHTSA vPIC" : result.provider === "INVENTORY_ONLY" ? "Inventory only" : "Decode unavailable"}</span><time dateTime={result.retrievedAt}>{new Date(result.retrievedAt).toLocaleString()}</time></div>
        {proposals.length > 0 ? <div className={styles.vinDecodeTable} tabIndex={0} aria-label="Scrollable vehicle field review"><table><caption>Vehicle field review</caption><thead><tr><th>Apply</th><th>Field</th><th>Current</th><th>Proposed</th><th>Source</th></tr></thead><tbody>{proposals.map((proposal) => <tr key={proposal.field}><td><input type="checkbox" aria-label={`Apply ${proposal.label}`} checked={selected.includes(proposal.field)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, proposal.field] : current.filter((field) => field !== proposal.field))} /></td><th scope="row">{proposal.label}</th><td>{fields[proposal.field] || "Not captured"}</td><td>{proposal.value}</td><td>{proposal.source}</td></tr>)}</tbody></table></div> : <p>No new field values.</p>}
        <div className={styles.vinDecoderToolbar}><button type="button" disabled={!proposals.some((proposal) => selected.includes(proposal.field))} onClick={() => {
          onApply(Object.fromEntries(proposals.filter((proposal) => selected.includes(proposal.field)).map((proposal) => [proposal.field, proposal.value])));
          setMessage("Selected vehicle fields applied."); setSelected([]);
        }}><Check size={16} aria-hidden="true" />Apply selected fields</button><button type="button" onClick={download}><Download size={16} aria-hidden="true" />Download decode record</button></div>
        <details open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}><summary>Vehicle specifications</summary>{VIN_SPECIFICATION_GROUPS.map((group) => <section key={group.label}><h3>{group.label}</h3><dl className={styles.vinSpecificationGrid}>{Object.entries(group.fields).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{result.specifications[key] ?? "Not reported"}</dd></div>)}</dl></section>)}</details>
        <p className={styles.vinDecodeCoverage}>Title, accident history, recall completion, service history, and current odometer: not checked.</p>
      </>}
    </>}
  </div>;
});
