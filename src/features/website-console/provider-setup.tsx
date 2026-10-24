"use client";

import Link from "next/link";
import { useState } from "react";
import { filterProviderRegister, providerReferencesReviewed, providerRegister, providerRegisterVersion } from "./provider-register";
import styles from "./provider-setup.module.css";

export function ProviderSetup() {
  const [query, setQuery] = useState("");
  const [requirement, setRequirement] = useState("All");
  const [downloadStatus, setDownloadStatus] = useState("");
  const entries = filterProviderRegister(query, requirement);
  function download() {
    const text = [
      `TIME MOTOR SALES — PROVIDER & INTEGRATION DIRECTORY v${providerRegisterVersion}`,
      `References reviewed: ${providerReferencesReviewed}`,
      "Planning register only. No vendor selected, subscription purchased, approval recorded or live integration verified by this directory.",
      "Do not put credentials, bank/card details, customer IDs or other secrets in this checklist. Use the approved secret manager.",
      ...providerRegister.map(entry => [
        `\n${entry.title} — ${entry.requirement} — ${entry.status}`, `Why: ${entry.why}`, `Unlocks: ${entry.unlocks}`, `Direction: ${entry.direction}`, `Intended accountable role: ${entry.owner}`,
        `Dependencies: ${entry.dependencies.map(id => providerRegister.find(provider => provider.id === id)?.title).join(", ") || "Existing-contract audit first"}`,
        "Setup:", ...entry.setup.map((step, index) => `${index + 1}. ${step}`), `Acceptance: ${entry.acceptance}`,
        ...entry.links.map(link => `${link.label}: ${link.href}`),
        "Decision notes (complete outside the app): existing contract / chosen vendor / budget / integration rights / sandbox / reviewer / evidence / production signoff."
      ].join("\n"))
    ].join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "time-motor-sales-provider-setup-checklist-v1.txt";
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadStatus("Checklist downloaded. Notes added to the exported file are not saved back to this app.");
  }
  return <section className={styles.directory} aria-labelledby="website-provider-directory">
    <header><h2 id="website-provider-directory">Provider & Integration Directory</h2><p>Permanent reference · Version {providerRegisterVersion} · Sources reviewed {providerReferencesReviewed}</p><p>Choose services deliberately, reuse existing contracts, and return here for each setup checklist. You do not need to buy every service listed.</p></header>
    <div className={styles.notice}><strong>Planning register—not a live connection audit.</strong><p>Candidate links do not select a vendor, create a subscription, record approval or activate anything. Existing subscriptions and integration rights still need verification. Owner roles below are proposed responsibilities, not assigned permissions.</p><p>Never paste API keys, passwords, bank details or customer documents here. This directory has no credential-entry or activation form.</p></div>
    <section className={styles.panel} aria-labelledby="provider-next-steps"><h3 id="provider-next-steps">Start here: five decisions in order</h3><ol><li>Inventory existing contracts: hosting, bank, processor, finance/lenders, email, calendar, title and history reports.</li><li>Approve the foundation: public environment, customer identity, email, private storage, staff delivery and recovery.</li><li>Confirm financing and signing together: supported lenders, document packages and custom-website integration rights.</li><li>Approve online payment scope, refund/hold rules and reconciliation before connecting a processor.</li><li>Add licensed imagery and other optional services only when their value, access and budget are approved.</li></ol><p><strong>For each vendor, collect:</strong> contract owner, existing entitlement, full pricing, custom-site/API rights, documentation, sandbox access, data/retention terms, support and acceptance evidence. A vendor account alone is not a working integration.</p></section>
    <div className={styles.actions}><Link href="/integrations">Review existing dealership integrations</Link><Link href="/website-console?section=readiness">Review launch blockers</Link><button type="button" onClick={download}>Download full setup checklist</button></div>
    <p role="status" className={styles.status}>{downloadStatus}</p>
    <div className={styles.filters}><label htmlFor="provider-search">Find a provider or capability<input id="provider-search" type="search" placeholder="Try payments, VIN photos, finance or backups" value={query} onChange={event => setQuery(event.target.value)} /></label><div><label htmlFor="provider-requirement">Requirement</label><select id="provider-requirement" value={requirement} onChange={event => setRequirement(event.target.value)}>{["All", "Foundation", "Conditional", "Optional", "Deferred"].map(value => <option key={value}>{value}</option>)}</select></div><button type="button" onClick={() => { setQuery(""); setRequirement("All"); }}>Reset filters</button></div>
    <p className={styles.legend}><strong>Foundation:</strong> capability needed for a reliable live service, not necessarily a new paid provider. <strong>Conditional:</strong> needed when that feature is offered. <strong>Optional:</strong> useful enhancement. <strong>Deferred:</strong> not part of current activation.</p>
    <p role="status">{entries.length} of {providerRegister.length} capabilities shown. Status describes planning, not connection health.</p>
    <div className={styles.cards}>{entries.map(entry => <article key={entry.id} id={`provider-${entry.id}`} className={styles.card}>
      <div className={styles.badges}><span>{entry.requirement}</span><span>{entry.status}</span></div><h3>{entry.title}</h3><p>{entry.unlocks}</p>
      <details><summary>Why we need it & how to configure it</summary><div className={styles.detail}>
        <h4>Why it matters</h4><p>{entry.why}</p><h4>Provider / reuse direction</h4><p>{entry.direction}</p><h4>Intended accountable role</h4><p>{entry.owner}</p>
        <h4>Dependencies</h4>{entry.dependencies.length ? <ul>{entry.dependencies.map(id => <li key={id}>{providerRegister.find(provider => provider.id === id)?.title}</li>)}</ul> : <p>Start with the existing-contract and infrastructure audit.</p>}
        <h4>Setup checklist</h4><ol>{entry.setup.map(step => <li key={step}>{step}</li>)}</ol><h4>What proves it is ready?</h4><p>{entry.acceptance}</p>
        {entry.links.length ? <div className={styles.vendorLinks}>{entry.links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<span> ↗ (external; opens a new tab)</span></a>)}</div> : <p className={styles.status}>No new provider chosen. Identify existing services or approve the internal operating process first.</p>}
      </div></details>
    </article>)}</div>
    {!entries.length && <div className={styles.panel}><h3>No matching capabilities</h3><p>Try a broader term or reset the requirement filter. No information has been deleted.</p><button type="button" onClick={() => { setQuery(""); setRequirement("All"); }}>Show all capabilities</button></div>}
    <section className={styles.panel}><h3>What the website still needs us to build</h3><p>Provider subscriptions do not create the website-to-staff intake bridge, production account authorization, secure uploads, inventory publication, exclusive holds, quote approvals, payment reconciliation or release controls. Those need implementation and verified end-to-end tests.</p><p>The current buying and appraisal tools are private previews. Live purchase completion, staff delivery, funded status and authorized release must never be inferred from an account, a calculator, a signed document or a successful payment redirect.</p><p>This versioned directory is saved with the app, not in this browser. Search and filter choices reset on reload. Selection/status editing, approvals and live connection health are not implemented; exported notes do not sync back. Another host needs the staff app deployed before this new section appears there.</p></section>
  </section>;
}
