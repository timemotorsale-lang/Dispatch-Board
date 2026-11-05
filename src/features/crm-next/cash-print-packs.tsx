"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CASH_PRINT_CATALOG, CASH_PRINT_PACKS, cashPrintPackIds, validateCashPrintPack, type CashPrintPack, type SaleLibraryForm } from "@/lib/cash-sale-print-library";
import type { CashSaleFacts } from "@/lib/cash-retail-sale";
import styles from "./cash-sale-print-library.module.css";

type Policy = { staffCanEdit: boolean; canManage: boolean; canEdit: boolean; updatedAt: string | null };
type Editor = { id: string; label: string; detail: string; ids: string[]; updatedAt?: string };
export function CashPrintPacks({ facts, selected, onSelect, busy, catalog = CASH_PRINT_CATALOG, presets = CASH_PRINT_PACKS, formUnavailable, selectionOnly = false }: { facts: CashSaleFacts; selected: string[]; onSelect: (ids: string[]) => void; busy: boolean; catalog?: SaleLibraryForm[]; presets?: CashPrintPack[]; formUnavailable?: (id: string) => string; selectionOnly?: boolean }) {
  const [saved, setSaved] = useState<CashPrintPack[]>([]), [policy, setPolicy] = useState<Policy | null>(null);
  const [choice, setChoice] = useState(""), [editor, setEditor] = useState<Editor | null>(null);
  const [working, setWorking] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const pending = useRef(false), editorRoot = useRef<HTMLDivElement>(null);
  const packs = [...presets, ...saved], chosen = saved.find(pack => pack.id === choice);
  const disabled = busy || working;
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/crm-next/cash-print-packs", { cache: "no-store", signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Saved packs could not be loaded.");
      if (!signal?.aborted) { setSaved(body.packs); setPolicy(body.policy); setError(""); }
    } catch (caught) { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Saved packs could not be loaded. Preset packs and individual forms remain available."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(), timer = setTimeout(() => void load(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  const editorId = editor?.id;
  useEffect(() => { if (editorId) editorRoot.current?.focus(); }, [editorId]);
  async function request(method: string, body: unknown) {
    const response = await fetch("/api/crm-next/cash-print-packs", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Print pack changes could not be saved. Your entries remain here.");
    return result;
  }
  async function savePack() {
    if (pending.current || !editor) return;
    pending.current = true; setWorking(true); setError(""); setNotice("");
    try {
      const data = validateCashPrintPack(editor);
      const result = await request(editor.updatedAt ? "PATCH" : "POST", { ...editor, ...data });
      setSaved(current => [...current.filter(pack => pack.id !== result.pack.id), result.pack]);
      setChoice(result.pack.id); setEditor(null); setNotice("Print pack saved for the team. Choose Use pack to apply it to this print job.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Saving failed. Your pack entries remain here."); }
    finally { pending.current = false; setWorking(false); }
  }
  async function removePack() {
    if (pending.current || !chosen || !window.confirm(`Remove the shared print pack “${chosen.label}”? Existing deal documents and this print selection will be kept.`)) return;
    pending.current = true; setWorking(true); setError("");
    try { await request("DELETE", chosen); setSaved(current => current.filter(pack => pack.id !== chosen.id)); setChoice(""); setNotice("Shared pack removed. Your selected forms and existing documents are kept."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The pack could not be removed."); }
    finally { pending.current = false; setWorking(false); }
  }
  async function changePolicy(staffCanEdit: boolean) {
    if (pending.current || !policy) return;
    pending.current = true; setWorking(true); setError("");
    const previous = policy;
    setPolicy({ ...policy, staffCanEdit });
    try { const result = await request("PATCH", { action: "SET_POLICY", staffCanEdit, updatedAt: policy.updatedAt }); setPolicy(result.policy); setSaved(current => current.map(pack => ({ ...pack, canEdit: result.policy.canEdit }))); setNotice("Team pack permissions saved."); }
    catch (caught) { setPolicy(previous); setError(caught instanceof Error ? caught.message : "Permissions could not be saved."); }
    finally { pending.current = false; setWorking(false); }
  }
  function apply() {
    const pack = packs.find(item => item.id === choice);
    if (!pack) return;
    const ids = (selectionOnly ? [...new Set(pack.ids)] : cashPrintPackIds([pack.id], facts, [...presets, ...saved])).filter(id => catalog.some(form => form.id === id) && !formUnavailable?.(id));
    onSelect(ids);
    const skipped = pack.ids.filter(id => !ids.includes(id));
    setNotice(`${pack.label}: ${ids.length} forms selected. You can adjust individual forms below.${skipped.length ? ` Not applicable to this deal: ${skipped.map(id => catalog.find(form => form.id === id)?.label || id).join(", ")}.` : ""}`);
  }
  return <section aria-label="Reusable print packs" className={styles.packManager}>
    <div className={styles.filters}><label><span>Choose a print pack</span><select aria-label="Choose a print pack" value={choice} onChange={event => { setChoice(event.target.value); setNotice(""); }} disabled={disabled}><option value="">Choose a preset or saved team pack</option><optgroup label="Preset packs">{presets.map(pack => <option key={pack.id} value={pack.id}>{pack.label}</option>)}</optgroup><optgroup label="Team packs">{saved.map(pack => <option key={pack.id} value={pack.id}>{pack.label}</option>)}</optgroup></select></label>
      <button type="button" disabled={disabled || !choice} onClick={apply}>Use pack</button>
      <button type="button" disabled={disabled || loading || !policy?.canEdit} onClick={() => { setEditor({ id: crypto.randomUUID(), label: "", detail: "", ids: [...selected] }); setError(""); }}>Create pack from selected forms</button>
      {chosen && policy?.canEdit && <><button type="button" disabled={disabled} onClick={() => { setEditor({ ...chosen }); setError(""); }}>Edit shared pack</button><button type="button" disabled={disabled} onClick={() => void removePack()}>Remove shared pack</button></>}
    </div>
    <p className={styles.note}>Use a pack for a quick selection, or choose forms individually. Packs contain form choices only; every printed copy uses the current deal’s details.</p>
    {loading && <p role="status">Loading team print packs…</p>}
    {policy && !policy.canEdit && <p>Shared packs are currently managed by managers. You can still use any pack and adjust your individual print selection.</p>}
    {policy?.canManage && <details><summary>Manager settings — team print packs</summary><label className={styles.check}><input type="checkbox" checked={policy.staffCanEdit} disabled={disabled} onChange={event => void changePolicy(event.target.checked)} />Allow staff to create, edit and remove shared print packs</label></details>}
    {error && <div role="alert"><p>{error}</p><button type="button" disabled={disabled || loading} onClick={() => void load()}>Reload saved packs</button></div>}
    {notice && <p role="status">{notice}</p>}
    {editor && <div ref={editorRoot} tabIndex={-1} role="region" aria-label="Print pack editor" className={styles.packEditor}>
      <h3>{editor.updatedAt ? "Edit team print pack" : "Create team print pack"}</h3>
      <div className={styles.filters}><label>Pack name<input maxLength={80} value={editor.label} disabled={disabled} onChange={event => setEditor({ ...editor, label: event.target.value })} /></label><label>Description (optional)<input maxLength={300} value={editor.detail} disabled={disabled} onChange={event => setEditor({ ...editor, detail: event.target.value })} /></label></div>
      <p>Select the forms to save in this pack. Conditional forms are included only when applicable to the deal.</p>
      <div className={styles.packChoices}>{catalog.map(form => <label key={form.id} className={styles.check}><input type="checkbox" aria-label={`Pack form: ${form.label}`} checked={editor.ids.includes(form.id)} disabled={disabled} onChange={event => setEditor({ ...editor, ids: event.target.checked ? [...editor.ids, form.id] : editor.ids.filter(id => id !== form.id) })} />{form.label}</label>)}</div>
      <div className={styles.actions}><strong>{editor.ids.length} pack forms</strong><button type="button" className={styles.primary} disabled={disabled || !editor.label.trim() || !editor.ids.length || !policy?.canEdit} onClick={() => void savePack()}>{working ? "Saving pack…" : "Save print pack"}</button><button type="button" disabled={disabled} onClick={() => setEditor(null)}>Cancel pack editing</button></div>
    </div>}
  </section>;
}
