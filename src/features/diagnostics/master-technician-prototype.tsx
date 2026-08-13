"use client";

import { ArrowUp, Bot, CarFront, CheckCircle2, ClipboardCheck, Gauge, MessageCircle, ShieldAlert, Sparkles, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "./master-technician-prototype.module.css";

type Message = { id: string; role: "assistant" | "user"; text: string };

const welcome = "Tell me the vehicle, symptoms, when the problem happens, and any trouble codes or measurements you already have. I will organize the evidence and recommend the safest next test.";

function responseFor(question: string) {
  const value = question.toLowerCase();
  if (/timing|camshaft|crankshaft|p001[0-9]|p00(16|17)/.test(value)) {
    return `A timing-component replacement is only a hypothesis right now. Do not authorize parts yet.\n\nStart with these checks:\n1. Confirm the exact engine, mileage, oil level, oil condition, and correct oil viscosity.\n2. Record every DTC and freeze-frame value; do not clear codes first.\n3. Verify the concern: cold-start rattle, poor running, loss of power, extended crank, or correlation code.\n4. Inspect wiring and connectors for the cam sensors, crank sensor, and oil-control solenoids.\n5. Compare commanded and actual cam position with the scan tool. If correlation remains abnormal, perform the manufacturer-approved mechanical timing verification.\n\nSend me the engine, codes, symptoms, and scan results. Then we can decide whether the evidence supports a sensor, wiring, oil-control, actuator, or mechanical timing problem.`;
  }
  if (/no.?start|crank.*not start|won't start|will not start/.test(value)) {
    return `First separate “no crank” from “cranks but will not start.” Record battery voltage during the event and all stored codes. If it cranks normally, verify spark, injector command, fuel pressure, and engine-speed data before replacing a component. Tell me which of those signals is missing and I will narrow the next test.`;
  }
  if (/overheat|coolant|hot/.test(value)) {
    return `Do not open a hot cooling system. After it is safe, confirm coolant level and visible leaks, then record temperature data from cold start, fan command versus operation, heater performance, and cooling-system pressure-test results. Those facts distinguish circulation, leak, fan-control, sensor, and combustion-gas possibilities.`;
  }
  if (/transmission|shift|slip/.test(value)) {
    return `Before recommending a transmission, confirm the exact symptom and operating condition. Record all module codes, fluid level and condition using the manufacturer procedure, commanded versus actual gear, input/output speeds, and whether the concern changes with temperature. I can rank the next test after those results are entered.`;
  }
  return `I can help build the test path, but I need enough vehicle-specific evidence to avoid guessing. Please provide:\n• Year, make, model, engine, and mileage\n• The exact symptom in the driver's words\n• When it happens and whether it is repeatable\n• All codes and freeze-frame data\n• Tests or repairs already performed\n\nWith that information I will identify the leading possibilities, what has not yet been proven, and the single best next test.`;
}

function initialMessages(initialQuestion: string): Message[] {
  const question = initialQuestion.trim();
  return question
    ? [{ id: "welcome", role: "assistant", text: welcome }, { id: "initial-question", role: "user", text: question }, { id: "initial-answer", role: "assistant", text: responseFor(question) }]
    : [{ id: "welcome", role: "assistant", text: welcome }];
}

export function MasterTechnicianPrototype({ initialQuestion = "", viewerName }: { initialQuestion?: string; viewerName: string }) {
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(initialQuestion));
  const [question, setQuestion] = useState("");
  const [vehicle, setVehicle] = useState("");

  function ask(event: FormEvent) {
    event.preventDefault();
    const text = [vehicle.trim() ? `Vehicle: ${vehicle.trim()}.` : "", question.trim()].filter(Boolean).join(" ");
    if (!text) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }, { id: crypto.randomUUID(), role: "assistant", text: responseFor(text) }]);
    setQuestion("");
  }

  function chooseExample(text: string) {
    setQuestion(text);
  }

  return <section className={styles.shell} aria-label="Master Technician prototype">
    <aside className={styles.sidebar}>
      <Link className={styles.back} href="/diagnostics">← Diagnostics</Link>
      <div className={styles.brand}><span><Wrench /></span><div><strong>Master Technician</strong><small>Prototype help tool</small></div></div>
      <button onClick={() => { setMessages([{ id: crypto.randomUUID(), role: "assistant", text: welcome }]); setQuestion(""); setVehicle(""); }} type="button">+ New conversation</button>
      <nav>
        <span>Try a real situation</span>
        <button onClick={() => chooseExample("2019 Honda Accord sent out for diagnosis. The vendor recommends timing replacement. Help us verify that diagnosis in-house.")} type="button">2019 Honda Accord timing</button>
        <button onClick={() => chooseExample("2016 Chevrolet Malibu, black. An outside vendor recommends timing replacement. What evidence should we require?")} type="button">2016 Malibu timing</button>
      </nav>
      <div className={styles.prototypeNote}><Sparkles /><p><strong>Review prototype</strong>This conversation is not yet connected to a live AI model or OEM information source.</p></div>
    </aside>

    <main className={styles.chat}>
      <header><div><span>MASTER TECHNICIAN HELP</span><h1>What are we troubleshooting?</h1></div><div className={styles.status}><i />Guided prototype</div></header>
      <div className={styles.boundary}><ShieldAlert /><span><strong>Advice, not an automatic diagnosis.</strong> The tool recommends tests and organizes evidence. A qualified technician confirms the cause and repair.</span></div>

      <section className={styles.messages} aria-live="polite">
        {messages.map((message) => <article className={message.role === "assistant" ? styles.assistant : styles.user} key={message.id}>
          <span>{message.role === "assistant" ? <Bot /> : <UserRound />}</span>
          <div><strong>{message.role === "assistant" ? "Master Technician" : viewerName}</strong><p>{message.text}</p>{message.role === "assistant" && message.id !== "welcome" ? <footer><button type="button"><ClipboardCheck />Save as test plan</button><button type="button"><CheckCircle2 />Record a result</button></footer> : null}</div>
        </article>)}
      </section>

      <form className={styles.composer} onSubmit={ask}>
        <label><CarFront /><span className="sr-only">Vehicle</span><input onChange={(event) => setVehicle(event.target.value)} placeholder="Vehicle: VIN, stock number, or year/make/model" value={vehicle} /></label>
        <div><MessageCircle /><textarea aria-label="Ask the Master Technician" onChange={(event) => setQuestion(event.target.value)} placeholder="Describe the symptom, codes, operating conditions, and what has already been tested..." rows={3} value={question} /><button aria-label="Send question" disabled={!question.trim() && !vehicle.trim()} type="submit"><ArrowUp /></button></div>
        <small>Start with facts. The assistant should ask for missing evidence before recommending a repair.</small>
      </form>
    </main>

    <aside className={styles.context}>
      <section><span>How troubleshooting works</span><h2>One best test at a time</h2><ol><li><b>1</b>Describe the concern</li><li><b>2</b>Import codes and evidence</li><li><b>3</b>Run the next test</li><li><b>4</b>Enter the result</li><li><b>5</b>Confirm or rule out the cause</li></ol></section>
      <section><span>Evidence status</span><div className={styles.emptyEvidence}><Gauge /><strong>No verified measurements yet</strong><p>The assistant will not treat a vendor recommendation as proof.</p></div></section>
      <section><span>Future live connections</span><ul><li>Vehicle and repair-order history</li><li>Scan-tool codes and freeze frame</li><li>OEM procedures and specifications</li><li>Known fixes and prior successful cases</li><li>Technician skills and shop equipment</li></ul></section>
    </aside>
  </section>;
}
