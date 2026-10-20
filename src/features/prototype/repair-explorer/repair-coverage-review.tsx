import { LIGHT_DUTY_CATALOG_VERSION, LIGHT_DUTY_COVERAGE, LIGHT_DUTY_IMPLEMENTATION_ORDER, LIGHT_DUTY_OPERATIONS, LIGHT_DUTY_SYSTEMS } from "@/lib/light-duty-baseline";
import { LIGHT_DUTY_DIAGRAM_GROUPS } from "@/lib/light-duty-diagram-index";

export function RepairCoverageReview() {
  return <main style={{ padding: "24px", width: "100%", color: "#17263d", background: "#f4f7fb", minHeight: "100vh" }}>
    <nav><a href="/prototype/repair-explorer">Repair Explorer Preview</a> · <a href="/diagnostics/labor-guide">Existing Labor Guide</a></nav>
    <h1>Ten-system catalog expansion</h1><p>{LIGHT_DUTY_SYSTEMS.length} remaining systems · six implementation groups · {LIGHT_DUTY_COVERAGE.length} subsystem groups · {LIGHT_DUTY_OPERATIONS.length} operations. Brakes and steering/suspension remain separate, unchanged baselines.</p>
    <p>{LIGHT_DUTY_CATALOG_VERSION} · <strong>Awaiting shop review.</strong> Passenger automobiles and light trucks only. This is a coverage review, not proof of every possible repair, VIN fitment, certified shop capability or validated technician times.</p>
    <p>Open one implementation group, then a system/subsystem to review its individual repairs and diagnostic tests. Related diagram links lead to the same catalog; not every smallest unit is physically illustrated. New selections use provisional hours and pending-price parts allowances. Existing saved amounts are not repriced.</p>
    {LIGHT_DUTY_IMPLEMENTATION_ORDER.map(step => <details key={step.order} style={{ padding: "16px", marginBlock: "12px", background: "white", border: "1px solid #dce4ee", borderRadius: "8px" }}>
      <summary><strong>{step.order}. {step.label}</strong></summary>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", textAlign: "left" }}><caption>Implementation group {step.order}: detailed coverage awaiting approval</caption><thead><tr><th>System</th><th>Subsystem / repair family</th><th>Operations</th><th>Diagram discovery</th><th>Status</th></tr></thead><tbody>
        {LIGHT_DUTY_COVERAGE.filter(row => row.implementationOrder === step.order).map(row => <tr key={`${row.systemId}-${row.groupId}`}><td>{row.system}</td><td><a href={`/prototype/repair-explorer?system=${encodeURIComponent(row.systemId)}&group=${encodeURIComponent(row.groupId)}`}>{row.group}</a></td><td>{row.operations}</td><td>{Object.entries(LIGHT_DUTY_DIAGRAM_GROUPS).find(([, groups]) => groups.includes(row.groupId))?.[0].replaceAll("-", " ") ?? "Catalog navigation"} · generic identification only</td><td>Awaiting shop approval</td></tr>)}
      </tbody></table></div>
    </details>)}
    <h2>Approval boundary</h2><p>The connected pilot still enables only approved brakes and steering/suspension. Expansion is available here and in the existing guide for reviewed estimating; this page does not activate rollout flags, publish labor standards or authorize repairs. Refrigerant, restraints, ADAS, structural and HV work require verified capability or referral. No heavy trucks, construction vehicles or semi-trailers are added.</p>
  </main>;
}
