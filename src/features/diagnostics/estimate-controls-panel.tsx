"use client";

import type { EstimateControls, EstimatePricing, SteeringReview } from "@/lib/labor-guide-controls";
import { laborOverlapGroups, type LaborScope } from "@/lib/labor-guide-controls";
import styles from "./estimate-controls-panel.module.css";
import { brakeOperationForId } from "@/lib/brake-baseline";
import { steeringOperationForId } from "@/lib/steering-baseline";
import { LIGHT_DUTY_SYSTEMS, lightDutyOperationForId } from "@/lib/light-duty-baseline";

export function EstimateControlsPanel({ controls, scope, labor, parts, onChange, canOverrideLaborRate = false, shopLaborRate = 125 }: { controls: EstimateControls; scope: string; labor: LaborScope[]; parts: { key: string; label: string }[]; onChange: (value: EstimateControls) => void; canOverrideLaborRate?: boolean; shopLaborRate?: number }) {
  const overlaps = laborOverlapGroups(labor);
  const hasBrakes = labor.some(line => brakeOperationForId(line.id));
  const hasSteering = labor.some(line => steeringOperationForId(line.id));
  const expandedSystems = LIGHT_DUTY_SYSTEMS.filter(system => labor.some(line => lightDutyOperationForId(line.id)?.systemId === system.id));
  const steeringReview: SteeringReview = controls.steeringReview ?? { configuration: "", procedureReference: "", verificationPlan: "", alignmentDecision: "", alignmentReason: "" };
  const updateSteering = (field: keyof SteeringReview, value: string) => onChange({ ...controls, steeringReview: { ...steeringReview, [field]: value }, reviewedScope: "" });
  const brakeReview = controls.brakeReview ?? { configuration: "", procedureReference: "", verificationPlan: "" };
  const updatePricing = (field: keyof EstimatePricing, value: string) => {
    const numeric = ["laborRate", "partsMarkupPercent", "taxRatePercent"].includes(field);
    const amount = value === "" && field === "taxRatePercent" ? null : Number(value);
    if (numeric && amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > (field === "taxRatePercent" ? 30 : 1000))) return;
    onChange({ ...controls, pricing: { ...controls.pricing, [field]: numeric ? amount : value }, reviewedScope: "" });
  };
  return <details className={styles.panel} open={(labor.length > 0 || parts.length > 0) && controls.reviewedScope !== scope}>
    <summary>Estimate controls · pricing, fitment & shared labor</summary>
    <p>Shop default: ${shopLaborRate.toFixed(2)}/hour. No rate entry is needed unless an administrator authorizes an override. The shop-requested 7% tax is prefilled but must be checked against the applicable jurisdiction and source. No live tax service or fitment provider is connected.</p>
    <p><a href="/settings/labor-rate" target="_blank" rel="noopener noreferrer">Administrator labor-rate settings (new tab)</a></p>
    <label>Labor rate ($/hour)<input disabled={!canOverrideLaborRate} type="number" min="0" max="1000" step="0.01" value={controls.pricing.laborRate} onChange={event => updatePricing("laborRate", event.target.value)} /></label>
    {controls.pricing.laborRate !== shopLaborRate && <><button type="button" onClick={() => onChange({ ...controls, pricing: { ...controls.pricing, laborRate: shopLaborRate, overrideReason: "" }, reviewedScope: "" })}>Use current shop rate</button>{canOverrideLaborRate && <label>Administrator rate override reason<input maxLength={500} value={controls.pricing.overrideReason ?? ""} onChange={event => updatePricing("overrideReason", event.target.value)} /></label>}</>}
    <label>Markup for new catalog suggestions (%)<input type="number" min="0" max="1000" step="0.1" value={controls.pricing.partsMarkupPercent} onChange={event => updatePricing("partsMarkupPercent", event.target.value)} /></label>
    <p>Changing markup does not reprice parts already selected. Confirm their retail prices individually.</p>
    <label>Applicable combined tax rate (%)<input type="number" min="0" max="30" step="0.0001" value={controls.pricing.taxRatePercent ?? ""} onChange={event => updatePricing("taxRatePercent", event.target.value)} /></label>
    <label>Tax jurisdiction, source and effective date<input maxLength={500} value={controls.pricing.taxReference} onChange={event => updatePricing("taxReference", event.target.value)} placeholder="Jurisdiction/address, verified rate source, effective date or exemption reference" /></label>
    <label>Pricing policy / override reason<input maxLength={500} value={controls.pricing.reason} onChange={event => updatePricing("reason", event.target.value)} /></label>
    {parts.map(part => <label key={part.key}>Fitment & price reference · {part.label}<input maxLength={500} value={controls.fitment[part.key] ?? ""} placeholder="VIN/configuration, supplier or part reference, price confirmation" onChange={event => onChange({ ...controls, fitment: { ...controls.fitment, [part.key]: event.target.value }, reviewedScope: "" })} /></label>)}
    {hasBrakes && <fieldset><legend>Brake scope & safe verification</legend><p>Planning hours are not verified standards. Record references for the exact selected work. This is an estimate verification plan, not a technician completion sign-off.</p>
      <label>Brake configuration, unit, axle/side & shop capability<textarea maxLength={2000} value={brakeReview.configuration} placeholder="VIN/brake type, affected units and quantity; equipment/training or outsourced scope" onChange={event => onChange({ ...controls, brakeReview: { ...brakeReview, configuration: event.target.value }, reviewedScope: "" })} /></label>
      <label>Vehicle-specific procedure reference & labor basis<textarea maxLength={2000} value={brakeReview.procedureReference} placeholder="Manufacturer procedure/document, configuration, access, bleed/service-mode/programming requirements; explain adjusted provisional hours" onChange={event => onChange({ ...controls, brakeReview: { ...brakeReview, procedureReference: event.target.value }, reviewedScope: "" })} /></label>
      <label>Verification plan & conditional materials<textarea maxLength={2000} value={brakeReview.verificationPlan} placeholder="Measurements/acceptance limits, fluid specification/volume, hardware, leak/pedal/holding checks, diagnostic verification and safe road-test conditions" onChange={event => onChange({ ...controls, brakeReview: { ...brakeReview, verificationPlan: event.target.value }, reviewedScope: "" })} /></label>
    </fieldset>}
    {expandedSystems.map(system => {
      const review = controls.systemReviews?.[system.id] ?? { configuration: "", procedureReference: "", verificationPlan: "", capabilityPlan: "" };
      return <fieldset key={system.id}><legend>{system.label} · exact-work review</legend><p>Expanded coverage awaits shop approval. Provisional hours and generic diagrams do not prove fitment or safe execution capability.</p>
        {([["configuration", "Configuration, unit/side/bank, quantity & supplied contents"], ["procedureReference", "Vehicle-specific procedure reference & adjusted labor basis"], ["verificationPlan", "Verification limits, materials, commissioning & conditional follow-ups"], ["capabilityPlan", "Training, equipment & in-house capability or separately scoped referral"]] as const).map(([field, label]) => <label key={field}>{system.label} · {label}<textarea maxLength={2000} value={review[field]} onChange={event => onChange({ ...controls, systemReviews: { ...controls.systemReviews, [system.id]: { ...review, [field]: event.target.value } }, reviewedScope: "" })} /></label>)}
      </fieldset>;
    })}
    {overlaps.length > 0 && <><p role="status">Potential shared labor: {overlaps.map(group => group.lines.map(line => line.title).join(" + ")).join("; ")}. This is a review warning, not an automatic labor deduction.</p><label>Shared labor resolution<textarea maxLength={2000} value={controls.overlapResolution} placeholder="Adjust hours above, then explain the deduction—or document why these scopes do not overlap." onChange={event => onChange({ ...controls, overlapResolution: event.target.value, reviewedScope: "" })} /></label></>}
    {hasSteering && <fieldset><legend>Steering & suspension scope review</legend><p>Use the exact vehicle procedure. Alignment, calibration and outsourced work are conditional—not automatically authorized or charged.</p>
      <label>Steering/suspension configuration, axle/side & capability<textarea maxLength={2000} value={steeringReview.configuration} placeholder="VIN, suspension/assist type, selected units/quantity, supplied assembly contents and available equipment/training" onChange={event => updateSteering("configuration", event.target.value)} /></label>
      <label>Steering/suspension procedure reference & labor basis<textarea maxLength={2000} value={steeringReview.procedureReference} placeholder="Applicable procedure, stored-energy/SRS/pressure precautions, access, fastening and adjusted planning hours" onChange={event => updateSteering("procedureReference", event.target.value)} /></label>
      <label>Alignment decision<select aria-label="Alignment decision" value={steeringReview.alignmentDecision} onChange={event => updateSteering("alignmentDecision", event.target.value)}><option value="">Choose after procedure review</option><option value="SEPARATE_LINE">Add a separate alignment line</option><option value="INCLUDED_IN_SCOPE">Included in reviewed scope/hours</option><option value="NOT_REQUIRED">Not required for this scope</option><option value="OUTSOURCE">Refer for separately scoped alignment</option></select></label>
      <label>Alignment decision reason & reference<textarea maxLength={2000} value={steeringReview.alignmentReason} placeholder="Explain required/separate, included, not required or referral; record procedure/measurement reference and any quoted sublet boundary" onChange={event => updateSteering("alignmentReason", event.target.value)} /></label>
      <label>Steering/suspension verification & calibration plan<textarea maxLength={2000} value={steeringReview.verificationPlan} placeholder="Measurements/limits, hardware/fluids, loaded fastening, steering/ride height, required initialization/ADAS checks and safe verification conditions" onChange={event => updateSteering("verificationPlan", event.target.value)} /></label>
    </fieldset>}
    <label><input type="checkbox" checked={controls.reviewedScope === scope} onChange={event => onChange({ ...controls, reviewedScope: event.target.checked ? scope : "" })} />I confirmed pricing, vehicle fitment and any shared labor for this exact work. Generic allowances are not verified labor standards.</label>
  </details>;
}
