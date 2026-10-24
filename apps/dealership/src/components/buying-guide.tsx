"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CarFront, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { availabilityLabel, mayStartPurchase, money, type PublicSnapshot } from "../lib/domain";
import { buyingLink, buyingQuestions, paymentLabels, readBuyingPlan, tradeLabels, type BuyingPlan } from "../lib/buying-plan";
import { publicPath } from "../lib/paths";
import styles from "./buying-guide.module.css";

export function BuyingGuide({ snapshot }: { snapshot: PublicSnapshot }) {
  const search = useSearchParams();
  const query = search.toString();
  const [previousQuery, setPreviousQuery] = useState(query);
  const [plan, setPlan] = useState(() => readBuyingPlan(new URLSearchParams(query)));
  if (previousQuery !== query) {
    setPreviousQuery(query);
    setPlan(readBuyingPlan(new URLSearchParams(query)));
  }
  const preview = snapshot.source === "PREVIEW";
  const selected = snapshot.listings.find(vehicle => vehicle.id === plan.vehicleId);
  const available = selected && mayStartPurchase(selected);
  function change(patch: Partial<BuyingPlan>) {
    const current = readBuyingPlan(new URLSearchParams(window.location.search));
    const nextPlan = { ...current, ...patch };
    setPlan(nextPlan);
    window.history.replaceState(null, "", publicPath(buyingLink("/how-it-works", nextPlan)));
  }
  return <section className={`container section ${styles.guide}`}>
    <header className={styles.hero}><div><p className="eyebrow">Clear steps. Your choices.</p><h1>How buying works.</h1><p>Find your vehicle. Explore the numbers. Prepare your next step—with the whole process in view.</p><a className="button primary" href="#buying-plan">Build my buying plan<ArrowRight size={18} /></a></div><div className={styles.heroNote}><ShieldCheck size={30} aria-hidden="true" /><h2>Simple on the surface.<br />Clear at every step.</h2><p>{preview ? "Private preview: try the tools with sample information. Requests are saved locally, not delivered to staff." : "Pre-launch: browse the guide. Live requests, accounts, payments and signing are not enabled."}</p></div></header>
    <nav className={styles.steps} aria-label="Buying guide steps">{[["01", "Find your vehicle", "Browse the facts and select a starting point.", "buying-plan"], ["02", "Choose your approach", "Cash, financing or your own bank—with optional trade-in.", "buying-plan"], ["03", "Prepare a request", "Review preferences before sharing contact details.", "buying-actions"], ["04", "Finalize with confidence", "Understand what staff and verified providers must confirm.", "buying-finalize"]].map(([number, title, description, anchor]) => <a href={`#${anchor}`} key={number}><span>{number}</span><h2>{title}</h2><p>{description}</p></a>)}</nav>
    <div className={styles.layout}>
      <div className={styles.workspace}>
        <section className={styles.panel} id="buying-plan" aria-labelledby="buying-plan-title"><p className="eyebrow">Your starting point</p><h2 id="buying-plan-title">Build your buying plan</h2><p>These choices are preparation only—not a quote, credit approval, reservation or order. Only vehicle and preference selections are kept in the page URL; no contact or financial details belong there.</p>
          <label htmlFor="buying-vehicle">Choose a vehicle</label><select id="buying-vehicle" value={selected ? plan.vehicleId : ""} onChange={event => change({ vehicleId: event.target.value })}><option value="">Choose when you are ready</option>{snapshot.listings.map(vehicle => <option key={vehicle.id} value={vehicle.id} disabled={!mayStartPurchase(vehicle)}>{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim} · {money(vehicle.price)} · {availabilityLabel[vehicle.availability]}{preview ? " · Sample" : ""}</option>)}</select>
          {plan.vehicleId && !available ? <p role="alert" className={styles.warning}>That vehicle is missing, unavailable or no longer current. Choose an available vehicle before preparing a purchase request.</p> : null}
          {snapshot.error ? <p role="alert" className={styles.warning}>{snapshot.error}</p> : !snapshot.listings.length ? <p className={styles.warning}>No connected inventory is available for selection. You can still explore the guide and payment choices.</p> : null}
          <Link className="text-link" href="/shop">Browse vehicle details<ArrowRight size={16} /></Link>
          <fieldset><legend>How would you like to pay?</legend><div className={styles.choices}>{(Object.keys(paymentLabels) as BuyingPlan["paymentPath"][]).map(value => <label className={styles.choice} key={value}><input type="radio" name="buying-payment" checked={plan.paymentPath === value} onChange={() => change({ paymentPath: value })} /><span>{paymentLabels[value]}</span></label>)}</div></fieldset>
          <fieldset><legend>Will you have a trade-in?</legend><div className={styles.choices}>{(Object.keys(tradeLabels) as BuyingPlan["trade"][]).map(value => <label className={styles.choice} key={value}><input type="radio" name="buying-trade" checked={plan.trade === value} onChange={() => change({ trade: value })} /><span>{tradeLabels[value]}</span></label>)}</div></fieldset>
          <div className={styles.explainer}>{plan.paymentPath === "cash" ? <><h3>Keep the full cash cost in view</h3><p>The private cash tool includes the entered tax and fee assumptions, without loan interest. It is not a final purchase agreement.</p></> : plan.paymentPath === "own-bank" ? <><h3>Bring your own bank or credit union</h3><p>Record your preference now. Your bank and dealership must confirm funding, acceptable payment and paperwork later. No bank account or loan details are collected here.</p></> : <><h3>Explore—not apply</h3><p>Our private calculator can help you understand payment assumptions. Finance applications and lender decisions are not connected; the displayed interest assumption is not a promised rate or confirmed APR.</p></>}
            {preview ? <Link className="text-link" href={buyingLink("/finance", plan)}>{plan.paymentPath === "cash" ? "Explore cash out-the-door estimate" : "Explore payment estimates"}<ArrowRight size={16} /></Link> : <p className={styles.caption}>Payment tools remain unavailable for public use pending approved configuration.</p>}
          </div>
          {plan.trade === "yes" && <div className={styles.explainer}><h3>Prepare your trade separately</h3><p>Use the VIN-assisted appraisal flow for your current vehicle. Your purchase choice is context only—not an approved trade amount, payoff or tax credit.</p><Link className="text-link" href={buyingLink("/sell", plan)}>Prepare a trade appraisal<ArrowRight size={16} /></Link></div>}
        </section>
        <section id="buying-actions" className={styles.panel} aria-labelledby="buying-actions-title"><h2 id="buying-actions-title">Choose your next step</h2><p>{preview ? "The following request tools save sample information in this browser's private preview. Nothing is sent to staff." : "You may review preparation screens, but live submission is disabled until staff delivery is connected."}</p>{available ? <div className={styles.actions}><Link className="button primary" href={buyingLink("/purchase", plan)}>{preview ? "Prepare preview purchase request" : "Review purchase preparation"}<ArrowRight size={18} /></Link><Link className="button" href={buyingLink("/purchase", plan, "QUESTION")}>Ask about this vehicle</Link><Link className="button" href={buyingLink("/purchase", plan, "TEST_DRIVE")}>Prepare test-drive request</Link></div> : <p className={styles.warning}>Select an available vehicle above to unlock vehicle-specific preparation. No purchase request can start from a missing, reserved, sold or stale selection.</p>}<Link className="text-link" href="/garage">Open My Garage<ArrowRight size={16} /></Link><p className={styles.caption}>Guest preparation needs no sign-in. Production accounts and cross-device access remain unconnected.</p></section>
        <section id="buying-finalize" className={styles.panel} aria-labelledby="buying-finalize-title"><h2 id="buying-finalize-title">What happens before you get the keys?</h2><p>These are operating requirements—not completed steps. The preview cannot sign, charge, reserve, confirm funding or release a vehicle.</p><ul className={styles.checks}><li><strong>Staff review:</strong> confirm inventory, final pricing, fees and the actual purchase terms.</li><li><strong>Approved paperwork:</strong> confirm required parties, documents, supported signing and any originals.</li><li><strong>Verified funds:</strong> distinguish an estimate or payment attempt from acceptable, reconciled funds.</li><li><strong>Readiness and handoff:</strong> confirm title, vehicle readiness, appointment arrangements and authorized release.</li></ul><p className={styles.warning}>Financing providers, deposits, electronic signing, live staff exchange and release policies still require configuration and end-to-end validation. No delivery, refund or response-time promise is invented here.</p></section>
        <section className={styles.panel} aria-labelledby="buying-faq-title"><h2 id="buying-faq-title">Questions, answered clearly</h2>{buyingQuestions.map(([question, answer]) => <details className={styles.faq} key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
      </div>
      <aside className={styles.summary} aria-label="Your buying plan summary"><h2>Your buying plan</h2>{selected ? <>{selected.photo ? <Image src={publicPath(selected.photo)} width={720} height={480} alt={`${selected.year} ${selected.make} ${selected.model}${preview ? " — illustrative preview image" : ""}`} className={styles.photo} unoptimized={preview} /> : <div className={styles.placeholder}><CarFront size={54} aria-hidden="true" />Approved photos pending</div>}<h3>{selected.year} {selected.make} {selected.model}</h3><p>{selected.trim} · {selected.mileage.toLocaleString()} miles</p><p><strong>{money(selected.price)}</strong> vehicle cash price</p><p>{preview ? "Sample vehicle · " : ""}{availabilityLabel[selected.availability]}</p><Link className="text-link" href={`/vehicles/${selected.id}`}>Review vehicle facts<ArrowRight size={16} /></Link></> : <p>No vehicle selected yet. Start with the choices on the left.</p>}<dl><div><dt>Payment approach</dt><dd>{paymentLabels[plan.paymentPath]}</dd></div><div><dt>Trade-in</dt><dd>{tradeLabels[plan.trade]}</dd></div><div><dt>Order / reservation</dt><dd>Not created</dd></div><div><dt>Staff delivery</dt><dd>Not connected</dd></div></dl><p className={styles.caption}>Reloading this URL restores preparation choices only. It does not restore an unsent contact form or create a verified customer account.</p><button className="text-link" type="button" onClick={() => change({ vehicleId: "", paymentPath: "unsure", trade: "not-now" })}>Reset my plan</button></aside>
    </div>
  </section>;
}
