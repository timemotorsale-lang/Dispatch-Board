import { getCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderDetail } from "@/server/repair-order/service";

export const dynamic = "force-dynamic";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayDate(value: Date | string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function label(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function activeVendorWork(order: Awaited<ReturnType<typeof getRepairOrderDetail>>) {
  const works = order.vendorWorks ?? [];
  return works.find((work) => !["COMPLETED", "CANCELLED"].includes(work.status)) ?? works[0] ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const order = await getRepairOrderDetail(await getCurrentUser(), (await context.params).id);
    const vehicle = [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber;
    const customer = order.customer?.displayName ?? order.inventoryUnit?.inventoryNumber ?? "Internal work";
    const offsiteWork = activeVendorWork(order);
    const currentPhysicalLocation = offsiteWork?.currentLocation ?? order.location.name;
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(order.repairOrderNumber)} · Repair Order</title>
<style>
*{box-sizing:border-box}body{margin:0;color:#10243d;background:#eef2f6;font:14px/1.45 Arial,sans-serif}.sheet{width:min(920px,calc(100% - 32px));margin:24px auto;padding:32px;border:1px solid #cad5e2;background:#fff;box-shadow:0 12px 35px rgba(20,40,70,.12)}header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:3px solid #245fbe;padding-bottom:18px}.eyebrow{color:#245fbe;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}h1{margin:4px 0 0;font-size:30px}.version{margin-top:7px;color:#5f7186;font-weight:700}.print{border:0;border-radius:6px;padding:11px 18px;color:#fff;background:#245fbe;font-weight:800;cursor:pointer}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.fact{min-height:68px;border:1px solid #d7e0ea;border-radius:6px;padding:10px}.fact small,.block small{display:block;margin-bottom:4px;color:#667a91;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.fact strong{font-size:13px}.block{margin-top:12px;border:1px solid #cbd7e4;border-radius:7px;padding:14px;background:#f8fafc}.block p{margin:0;font-size:15px;font-weight:700}.handoff{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.handoff div{border-radius:7px;padding:13px;background:#edf6ff}.handoff div:last-child{background:#fff5df}.handoff strong{display:block;margin-bottom:3px}.handoff span{font-size:12px}.signature{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px}.signature div{border-top:1px solid #708196;padding-top:7px;color:#5c6d81;font-size:11px}@media(max-width:700px){.facts,.handoff{grid-template-columns:1fr}.sheet{width:100%;margin:0;border:0;padding:20px}.print{display:none}}@media print{body{background:#fff}.sheet{width:100%;margin:0;border:0;padding:8mm;box-shadow:none}.print{display:none}@page{margin:10mm}}
</style></head><body><main class="sheet">
<header><div><span class="eyebrow">Current operational RO worksheet · not an issued historical original</span><h1>${escapeHtml(order.repairOrderNumber)}</h1><div class="version">RO Version ${escapeHtml(order.version)} · ${escapeHtml(label(order.stage))}</div></div><button class="print" onclick="window.print()">Print Repair Order</button></header>
<p class="print"><a href="/service-documents?repairOrderId=${escapeHtml(encodeURIComponent(order.id))}">Open frozen issued documents and authorization receipts</a></p>
<section class="facts">
<div class="fact"><small>Vehicle</small><strong>${escapeHtml(vehicle)}</strong></div><div class="fact"><small>VIN / vehicle ID</small><strong>${escapeHtml(order.vehicle.vin ?? order.vehicle.vehicleNumber)}</strong></div><div class="fact"><small>Customer / inventory</small><strong>${escapeHtml(customer)}</strong></div>
<div class="fact"><small>Arrival</small><strong>${escapeHtml(displayDate(order.serviceVisit.arrivedAt))}</strong></div><div class="fact"><small>Promise</small><strong>${escapeHtml(displayDate(order.serviceVisit.promisedAt))}</strong></div><div class="fact"><small>Assigned technician</small><strong>${escapeHtml(order.ownerUser.name)}</strong></div>
<div class="fact"><small>Current physical location</small><strong>${escapeHtml(currentPhysicalLocation)}</strong></div><div class="fact"><small>Current stage</small><strong>${escapeHtml(label(order.stage))}</strong></div><div class="fact"><small>Next action</small><strong>${escapeHtml(offsiteWork?.nextAction ?? order.nextAction)}</strong></div>
</section>
${offsiteWork ? `<section class="block"><small>Home / accountable site</small><p>${escapeHtml(order.location.name)}</p></section>` : ""}
<section class="block"><small>Concern reported at intake</small><p>${escapeHtml(order.serviceVisit.concernSummary)}</p></section>
${order.serviceVisit.intakeNotes ? `<section class="block"><small>Advisor / intake notes</small><p>${escapeHtml(order.serviceVisit.intakeNotes)}</p></section>` : ""}
<section class="handoff"><div><strong>Technician use</strong><span>This Repair Order is the governing source for the vehicle and concern. Record tests, evidence, and findings against this RO.</span></div><div><strong>Authorization boundary</strong><span>Diagnosis is permitted from this RO. No repair is authorized until the estimate and approval are recorded.</span></div></section>
<section class="signature"><div>Technician acknowledgement / date</div><div>Advisor or manager / date</div></section>
</main><script>addEventListener("load",()=>setTimeout(()=>window.print(),250));</script></body></html>`;
    return new Response(html, { headers: { "cache-control": "no-store", "content-type": "text/html; charset=utf-8" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repair Order could not be printed.";
    const status = message === "Authentication required." ? 401 : 400;
    return new Response(escapeHtml(message), { status, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}
