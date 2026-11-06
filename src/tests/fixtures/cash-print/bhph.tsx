import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BhphVehicleFields } from "../../../features/crm-next/bhph-vehicle-fields";
import { SharedDealVehicleContext } from "./support";
import { fixture } from "./draft-store";
import type { DealVehicleChoice } from "../../../lib/deal-continuity";
import { BhphFinancingCalculator } from "../../../features/crm-next/bhph-financing-calculator";
import { MN_BHPH_FEE_DEFAULTS } from "../../../lib/bhph-financing";
import { useDealDraftState } from "./draft-store";
import { BhphPaymentCalculator } from "../../../features/crm-next/bhph-payment-calculator";
import { bhphFinancingIssue, calculateBhphFinancing, bhphWithoutOptionalPrincipal } from "../../../lib/bhph-financing";
fixture.snapshot.fields = { "bhph:Year:0": "20024", "bhph:Trim:0": "Legacy trim", "bhph:Lot / key location:0": "Key tag 42" };
const first: DealVehicleChoice = { id: "vehicle-a", label: "2024 · Toyota · RAV4 · STOCK-42", vin: "2T3W1RFVXRW333586", stockNumber: "STOCK-42", year: "2024", make: "Toyota", model: "RAV4", trim: "XLE", color: "Silver", licensePlate: "DEMO42", recordedMileage: "54000", inventoryUnitId: "unit-a", locationId: "location-a", availability: "Ready", eligibleForUse: true };
const second = { ...first, id: "vehicle-b", vin: "1NXBR32E85Z123456", stockNumber: "DEMO-2", label: "2005 · Toyota · Corolla", year: "2005", model: "Corolla", trim: "", color: "Blue", licensePlate: "", recordedMileage: "" };
function CalculatorReview() {
  const [facts, setFacts] = useDealDraftState("financing", { ...MN_BHPH_FEE_DEFAULTS, saleDate: "2026-11-04" });
  const [price, setPrice] = useDealDraftState("fixturePrice", "13895"), [down, setDown] = useDealDraftState("fixtureDown", "0"), [applied, setApplied] = useState("");
  const [terms, setTerms] = useDealDraftState("paymentTerms", { calculationMode: "TERM", apr: "0", paymentFrequency: "Monthly", termMonths: "24", paymentAmount: "500", firstPaymentDate: "2026-12-05" });
  let principal: number | null = null;
  if (!bhphFinancingIssue(price, down, facts)) principal = calculateBhphFinancing(price, down, facts).amountFinanced;
  const baseline = principal !== null && calculateBhphFinancing(price, down, facts).optionalProducts.items.length ? bhphWithoutOptionalPrincipal(price, down, facts) : undefined;
  return <><label>Fixture sale price<input value={price} onChange={event => setPrice(event.target.value)} /></label><label>Fixture down payment<input value={down} onChange={event => setDown(event.target.value)} /></label><BhphFinancingCalculator salePrice={price} downPayment={down} facts={facts} onChange={(key, value) => setFacts(current => ({ ...current, [key]: value }))} onUse={cents => setApplied(String(cents))} /><BhphPaymentCalculator principalCents={principal} terms={terms} saleDate={facts.saleDate} withoutAddOnsPrincipalCents={baseline} onChange={(key, value) => setTerms(current => ({ ...current, [key]: value }))} /><output aria-label="Applied financing">{applied}</output></>;
}
function Review() {
  const [selected, select] = useState(first), [epoch, reopen] = useState(0);
  return <main style={{ fontFamily: "Arial", padding: 16 }}><p>Fictional BHPH vehicle fixture — no database</p><button onClick={() => select(second)}>Switch vehicle</button><button onClick={() => reopen(value => value + 1)}>Reopen saved fields</button><SharedDealVehicleContext.Provider value={selected}><section aria-label="BHPH vehicle" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}><BhphVehicleFields key={epoch} vehicle={selected.label} onVehicleChange={() => {}} /></section></SharedDealVehicleContext.Provider><CalculatorReview key={`calculator-${epoch}`} /></main>;
}
createRoot(document.getElementById("root")!).render(<Review />);
