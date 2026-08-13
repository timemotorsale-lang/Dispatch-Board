"use client";

import { ArrowUp, Bot, CarFront, Check, CheckCircle2, ClipboardCheck, Eye, Gauge, MessageCircle, Ruler, ShieldAlert, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import styles from "./master-technician-prototype.module.css";

type Message = { id: string; role: "assistant" | "user"; text: string };
type CaseChoice = { id: string; version: number; label: string; concern: string; repairOrderNumber: string; status: string };
export type MasterTechnicianCaseDetail = CaseChoice & { observations: Array<{ id: string; statement: string }>; measurements: Array<{ id: string; quantity: string; value: string; unit: string }> };
type Step = 1 | 2 | 3 | 4 | 5;

const welcome = "Describe what the vehicle is doing. I will organize the facts and give you one safe next test—not a parts guess.";
const units: Record<string, string[]> = { VOLTAGE: ["V", "mV"], CURRENT: ["A", "mA"], RESISTANCE: ["ohm", "kohm"], PRESSURE: ["psi", "kPa", "bar"], TEMPERATURE: ["F", "C"], ROTATIONAL_SPEED: ["rpm"], PERCENT: ["%"], TIME: ["s", "ms"] };

function responseFor(question: string) {
  const value = question.toLowerCase();
  if (/timing|camshaft|crankshaft|p001[0-9]|p00(16|17)/.test(value)) return "Do not authorize timing parts yet. First record the codes and freeze-frame data, verify oil level and viscosity, and compare commanded versus actual cam position. If correlation remains abnormal, use the manufacturer-approved mechanical timing check. This separates oil-control, wiring, sensor, actuator, and mechanical timing causes.";
  if (/no.?start|crank.*not start|won't start|will not start/.test(value)) return "First determine whether this is no-crank or cranks-but-will-not-start. Record battery voltage during the event and all stored codes. If it cranks normally, verify spark, injector command, fuel pressure, and engine-speed data. Enter the first failed result and I will narrow the next test.";
  if (/overheat|coolant|hot/.test(value)) return "Do not open a hot cooling system. When safe, confirm coolant level and leaks. Then compare indicated temperature from cold start, fan command versus operation, heater performance, and pressure-test results. Start with the first missing fact.";
  if (/transmission|shift|slip/.test(value)) return "Before recommending a transmission, record the exact symptom, all module codes, fluid level and condition using the manufacturer procedure, commanded versus actual gear, and input/output speeds. The best first test is the missing item that most clearly separates a control fault from an internal mechanical fault.";
  return "Before choosing a repair, record the exact symptom, when it occurs, whether it repeats, all codes and freeze-frame data, and tests already performed. Start with the missing fact that will most clearly separate the leading possibilities.";
}

function initialMessages(initialQuestion: string): Message[] {
  const question = initialQuestion.trim();
  return question ? [{ id: "welcome", role: "assistant", text: welcome }, { id: "initial-question", role: "user", text: question }, { id: "initial-answer", role: "assistant", text: responseFor(question) }] : [{ id: "welcome", role: "assistant", text: welcome }];
}

export function MasterTechnicianPrototype({ caseChoices = [], initialCase = null, initialCaseId = "", initialQuestion = "", viewerName }: { caseChoices?: CaseChoice[]; initialCase?: MasterTechnicianCaseDetail | null; initialCaseId?: string; initialQuestion?: string; viewerName: string }) {
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(initialQuestion));
  const [question, setQuestion] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId);
  const [caseDetail, setCaseDetail] = useState<MasterTechnicianCaseDetail | null>(initialCase);
  const [activeStep, setActiveStep] = useState<Step>(1);
  const [completed, setCompleted] = useState<Step[]>(initialQuestion ? [1] : []);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [captureType, setCaptureType] = useState<"OBSERVATION" | "MEASUREMENT">("OBSERVATION");
  const [observation, setObservation] = useState("");
  const [quantity, setQuantity] = useState("VOLTAGE");
  const [measurement, setMeasurement] = useState("");
  const [unit, setUnit] = useState("V");
  const [instrument, setInstrument] = useState("Scan tool");
  const [nextTest, setNextTest] = useState(initialQuestion ? responseFor(initialQuestion) : "");
  const [result, setResult] = useState("");
  const [causeReview, setCauseReview] = useState("");
  const selectedChoice = useMemo(() => caseChoices.find((item) => item.id === selectedCaseId) ?? null, [caseChoices, selectedCaseId]);
  const evidenceCount = (caseDetail?.observations.length ?? 0) + (caseDetail?.measurements.length ?? 0);

  function mark(step: Step) { setCompleted((current) => current.includes(step) ? current : [...current, step]); }

  async function loadCase(caseId: string) {
    setSelectedCaseId(caseId); setCaseDetail(null); setNotice("");
    if (!caseId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/diagnostics/cases/${encodeURIComponent(caseId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The vehicle record could not be opened.");
      setCaseDetail({ id: data.id, version: data.version, label: data.vehicle.label, concern: data.concern, repairOrderNumber: data.repairOrder.repairOrderNumber, status: data.status, observations: data.observations ?? [], measurements: data.measurements ?? [] });
      if (!question && data.concern) setQuestion(data.concern);
      setNotice(`Working on ${data.vehicle.label}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "The vehicle record could not be opened."); }
    finally { setBusy(false); }
  }

  function ask(event: FormEvent) {
    event.preventDefault();
    const text = question.trim(); if (!text) return;
    const answer = responseFor(text);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }, { id: crypto.randomUUID(), role: "assistant", text: answer }]);
    setNextTest(answer); setQuestion(""); mark(1); setActiveStep(3);
  }

  async function recordEvidence(event: FormEvent) {
    event.preventDefault();
    if (!caseDetail) { setNotice("Choose a vehicle first so this evidence is saved to the correct record."); return; }
    setBusy(true); setNotice("");
    try {
      const common = { expectedVersion: caseDetail.version, idempotencyKey: crypto.randomUUID(), operatingConditions: {}, qualityReasonCode: "DATA_VALID", qualityStatus: "VALID", reliability: "UNASSESSED" };
      const isObservation = captureType === "OBSERVATION";
      const observationText = activeStep === 4 ? result : observation;
      const body = isObservation
        ? { ...common, factClass: "OBSERVED", independenceGroup: "MASTER_TECHNICIAN_DIRECT", rawSource: { kind: "MASTER_TECHNICIAN_CHAT" }, reason: "Recorded direct technician observation through Master Technician chat.", source: "TECHNICIAN", statement: observationText }
        : { ...common, independenceGroup: `MASTER_TECHNICIAN:${instrument.trim().toUpperCase()}`, instrument: { name: instrument, calibrationStatus: "UNKNOWN" }, quantity, rawSource: { kind: "MASTER_TECHNICIAN_CHAT" }, reason: "Recorded instrument result through Master Technician chat.", setup: { entry: "TECHNICIAN_MANUAL" }, source: "TEST_EQUIPMENT", tolerance: {}, unit, value: measurement };
      const path = isObservation ? "observations" : "measurements";
      const response = await fetch(`/api/diagnostics/cases/${encodeURIComponent(caseDetail.id)}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "The evidence could not be saved.");
      await loadCase(caseDetail.id); setObservation(""); setResult(""); setMeasurement(""); mark(activeStep === 4 ? 4 : 2); setNotice("Saved to the vehicle's diagnostic evidence.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "The evidence could not be saved."); setBusy(false); }
  }

  function startNew() {
    setMessages([{ id: crypto.randomUUID(), role: "assistant", text: welcome }]); setQuestion(""); setNextTest(""); setResult(""); setCauseReview(""); setCompleted([]); setActiveStep(1); setNotice("");
  }

  const stepLabels = ["Describe the concern", "Add codes or evidence", "Review the next test", "Record the result", "Review the cause"];
  return <section className={styles.shell} aria-label="Master Technician help tool">
    <aside className={styles.sidebar}>
      <Link className={styles.back} href="/diagnostics">← Diagnostics</Link>
      <div className={styles.brand}><span><Wrench /></span><div><strong>Master Technician</strong><small>Guided help</small></div></div>
      <button onClick={startNew} type="button">+ New conversation</button>
      <div className={styles.casePicker}><label htmlFor="diagnostic-case">Vehicle / diagnostic case</label><select disabled={busy} id="diagnostic-case" onChange={(event) => void loadCase(event.target.value)} value={selectedCaseId}><option value="">Choose a vehicle</option>{caseChoices.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.repairOrderNumber}</option>)}</select>{selectedCaseId ? <Link href={`/diagnostics/cases/${encodeURIComponent(selectedCaseId)}`}>Open full case</Link> : <Link href="/diagnostics/intake">Create diagnostic case</Link>}</div>
      <p className={styles.prototypeNote}><ShieldAlert /><span><strong>Guided prototype</strong>Uses built-in test guidance today. Live AI and OEM sources are not connected yet.</span></p>
    </aside>

    <main className={styles.chat}>
      <header><div><span>MASTER TECHNICIAN HELP</span><h1>{caseDetail?.label ?? selectedChoice?.label ?? "What is the vehicle doing?"}</h1></div><div className={styles.status}><i />One step at a time</div></header>
      {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
      <section className={styles.messages} aria-live="polite">
        {messages.map((message) => <article className={message.role === "assistant" ? styles.assistant : styles.user} key={message.id}><span>{message.role === "assistant" ? <Bot /> : <UserRound />}</span><div><strong>{message.role === "assistant" ? "Master Technician" : viewerName}</strong><p>{message.text}</p>{message.role === "assistant" && message.id !== "welcome" ? <footer><button onClick={() => { setNextTest(message.text); mark(3); setActiveStep(4); setNotice("Next test accepted. Run it, then record what happened."); }} type="button"><ClipboardCheck />Use this next test</button><button onClick={() => setActiveStep(4)} type="button"><CheckCircle2 />Record result</button></footer> : null}</div></article>)}
      </section>

      {activeStep === 2 || activeStep === 4 ? <form className={styles.actionPanel} onSubmit={recordEvidence}><header><div><strong>{activeStep === 2 ? "Add a fact" : "Record the test result"}</strong><small>Saved directly to the selected vehicle.</small></div><button onClick={() => setCaptureType(captureType === "OBSERVATION" ? "MEASUREMENT" : "OBSERVATION")} type="button">{captureType === "OBSERVATION" ? <><Ruler />Enter measurement</> : <><Eye />Enter observation</>}</button></header>{captureType === "OBSERVATION" ? <label><span>What did you observe?</span><textarea onChange={(event) => activeStep === 4 ? setResult(event.target.value) : setObservation(event.target.value)} placeholder="Example: Engine rattles for two seconds on cold start." required rows={2} value={activeStep === 4 ? result : observation} /></label> : <div className={styles.measurementFields}><label><span>Measured</span><select onChange={(event) => { const next = event.target.value; setQuantity(next); setUnit(units[next][0]); }} value={quantity}>{Object.keys(units).map((item) => <option key={item} value={item}>{item.replaceAll("_", " ").toLowerCase()}</option>)}</select></label><label><span>Value</span><input inputMode="decimal" onChange={(event) => setMeasurement(event.target.value)} required value={measurement} /></label><label><span>Unit</span><select onChange={(event) => setUnit(event.target.value)} value={unit}>{units[quantity].map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Tool</span><input onChange={(event) => setInstrument(event.target.value)} required value={instrument} /></label></div>}<footer><button disabled={busy || !caseDetail || (captureType === "OBSERVATION" && !(activeStep === 4 ? result : observation).trim())} type="submit">{busy ? "Saving…" : "Save evidence"}</button></footer></form> : null}

      {activeStep === 3 && nextTest ? <section className={styles.actionPanel}><header><div><strong>Recommended next test</strong><small>Review this before touching the vehicle.</small></div></header><p>{nextTest}</p><footer><button onClick={() => { mark(3); setActiveStep(4); }} type="button">Accept and record result</button></footer></section> : null}
      {activeStep === 5 ? <section className={styles.actionPanel}><header><div><strong>What does the evidence support?</strong><small>A technician—not the chat—owns the final diagnosis.</small></div></header><label><span>Cause review</span><textarea onChange={(event) => setCauseReview(event.target.value)} placeholder="State the suspected cause and the evidence that supports or rules it out." rows={3} value={causeReview} /></label><footer><button disabled={!causeReview.trim()} onClick={() => { mark(5); setNotice("Cause review prepared. Open the full case to record the governed conclusion."); }} type="button">Prepare conclusion</button>{caseDetail ? <Link href={`/diagnostics/cases/${encodeURIComponent(caseDetail.id)}`}>Open case to confirm</Link> : null}</footer></section> : null}

      <form className={styles.composer} onSubmit={ask}><div><MessageCircle /><textarea aria-label="Ask the Master Technician" onChange={(event) => setQuestion(event.target.value)} placeholder="Describe the symptom, codes, and what you already tested…" rows={3} value={question} /><button aria-label="Send question" disabled={!question.trim()} type="submit"><ArrowUp /></button></div><small>{caseDetail ? `Saving work to ${caseDetail.label} · ${caseDetail.repairOrderNumber}` : "You can ask now. Choose a vehicle before saving evidence."}</small></form>
    </main>

    <aside className={styles.context}>
      <section><span>YOUR PROGRESS</span><h2>One best test at a time</h2><ol>{stepLabels.map((label, index) => { const step = (index + 1) as Step; const done = completed.includes(step); return <li key={label}><button aria-current={activeStep === step ? "step" : undefined} className={activeStep === step ? styles.activeStep : ""} onClick={() => setActiveStep(step)} type="button"><b>{done ? <Check /> : step}</b><span>{label}</span></button></li>; })}</ol></section>
      <section><span>SELECTED RECORD</span>{caseDetail ? <div className={styles.caseSummary}><CarFront /><strong>{caseDetail.label}</strong><p>{caseDetail.repairOrderNumber} · {caseDetail.status.replaceAll("_", " ").toLowerCase()}</p><small>{evidenceCount} saved evidence item{evidenceCount === 1 ? "" : "s"}</small></div> : <div className={styles.emptyEvidence}><Gauge /><strong>Choose a vehicle</strong><p>This prevents results from being saved to the wrong car.</p></div>}</section>
      <section className={styles.safetyNote}><span>DIAGNOSTIC BOUNDARY</span><p><strong>Advice, not an automatic diagnosis.</strong> Vendor recommendations and trouble codes are clues, not proof. A qualified technician confirms the cause and repair.</p></section>
    </aside>
  </section>;
}
