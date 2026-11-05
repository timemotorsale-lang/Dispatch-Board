import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DealPathwayChange } from "../../../features/crm-next/deal-pathway-change";
const controls = { requests: [] as Record<string, unknown>[], failNext: false, delay: 0 };
Object.assign(window, { __pathwayFixture: controls });
const original = window.fetch.bind(window);
window.fetch = async (input, init) => {
  if (String(input).includes("/api/crm/v1/deal-drafts") && init?.method === "PATCH") {
    const body = JSON.parse(String(init.body)); controls.requests.push(body);
    if (controls.delay) await new Promise(resolve => setTimeout(resolve, controls.delay));
    if (controls.failNext) { controls.failNext = false; return Response.json({ error: "Fixture conflict. Refresh the saved deal before retrying." }, { status: 409 }); }
    return Response.json({ id: body.id, pathway: body.pathway, status: "PENDING", revision: 4 });
  }
  return original(input, init);
};
function Review() {
  const [status, setStatus] = useState("PENDING"), [dirty, setDirty] = useState(false), [saved, setSaved] = useState(false);
  return <main style={{ fontFamily: "Arial", padding: 16, maxWidth: 1000, margin: "auto" }}><p>Fictional pathway-change fixture — no database</p>
    <label>Fixture deal status<select value={status} onChange={event => { setStatus(event.target.value); setSaved(false); }}><option>PENDING</option><option>IN_PROGRESS</option><option>SOLD</option><option>COMPLETED</option></select></label>
    <button onClick={() => setDirty(false)}>Save actual deal edits</button>
    <div onChangeCapture={event => { if (event.target instanceof HTMLElement && !event.target.closest("[data-deal-transient]")) setDirty(true); }}>
      <label>Actual deal edit<input defaultValue="" /></label>
      <DealPathwayChange key={status} id="fictional-draft" revision={3} pathway="bhph" status={status} disabled={dirty} onSaved={() => setSaved(true)} />
    </div>
    {saved && <p role="status">Pathway changed successfully.</p>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Review />);
