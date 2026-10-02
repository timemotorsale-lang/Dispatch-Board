import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { testDriveDateTime, testDriveDeadline, type TestDriveFacts } from "@/lib/test-drive-form-packet";
import { UnifiedCrmContractPacketError } from "@/server/unified-crm/contract-packet-contract";

type Input = { customerName: string; dealNumber: string; vehicle: string; vin: string; stockNumber: string; facts: TestDriveFacts };
function content(input: Input) {
  const f = input.facts;
  return {
    rows: [
      ["Driver / contact", `${input.customerName} | ${f.driverPhone}${f.driverEmail ? ` | ${f.driverEmail}` : ""}`],
      ["License (staff verified)", `${f.driverLicense} / ${f.licenseState} / expires ${f.licenseExpiration}`],
      ["Vehicle / VIN / stock", `${input.vehicle} | ${input.vin} | ${input.stockNumber}`],
      ["Record / authorization", `${input.dealNumber} | ${f.driveMode === "SUPERVISED" ? `Supervised: ${f.accompanyingEmployee}` : "Unaccompanied"} | authorized by ${f.salesperson}`],
      ["Departure / return deadline", `${testDriveDateTime(f.departureAt)} / ${testDriveDateTime(testDriveDeadline(f))}`],
      ["Mileage / route", `${f.departureMileage.toLocaleString("en-US")} miles out; ${f.mileageAllowance} miles allowed; maximum return odometer ${(f.departureMileage + f.mileageAllowance).toLocaleString("en-US")} | ${f.approvedRoute}`],
      ["Condition / fuel out", `${f.departureCondition} | ${f.fuelOut}`],
      ["Coverage review", f.insuranceBasis === "DRIVER_POLICY" ? `Driver policy: ${f.insuranceCarrier} / ${f.insurancePolicy}; staff reviewed` : "Dealership coverage reviewed by authorizing employee"],
      ...(f.notes ? [["Additional authorization notes", f.notes]] : [])
    ],
    sections: [
      ["Authorization and permitted use", "The named driver alone is authorized to operate this vehicle for evaluation within the stated route, time, and mileage limits. No additional drivers, impairment, racing, towing, commercial use, distracted driving, or unauthorized travel. Wear seat belts and obey traffic laws. Obtain dealership approval before extending the drive; contact the dealership promptly if delayed. This authorization is not a vehicle sale, rental, or purchase obligation."],
      ["Insurance and responsibility", "Insurance availability, coverage priority, deductibles, and exclusions are determined by applicable policies and law; this form does not promise coverage or make the driver's policy automatically primary. Driver remains responsible for their citations and tolls, and for loss or damage to the extent legally attributable to their negligence, intentional misconduct, or prohibited use. No automatic damage charge, blanket indemnity, or waiver of dealership negligence is created. Documented charges must have a lawful basis; inspection alone does not determine fault."],
      ["Accidents, breakdowns, and return", "Stop safely after a collision, provide assistance and information, and contact emergency services/police as required. Notify Time Motor Sales promptly at 612-724-3631; cooperate with truthful incident and insurance reporting. Stop driving an unsafe vehicle and request assistance; do not authorize nonemergency repairs without approval. Return the vehicle and all keys to the dealership by the stated deadline for a joint mileage, fuel, and condition review. This agreement does not waive nonwaivable rights or relieve the dealership of duties imposed by Minnesota law."]
    ]
  };
}
function escape(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }

export function testDriveAgreementHtml(input: Input) {
  const c = content(input);
  const f = input.facts;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Test Drive Agreement and Vehicle Release</title><style>
    @page { size: letter; margin: .45in; }
    body { max-width: 740px; margin: 24px auto; padding: 0 12px; font: 11px Arial,sans-serif; color: #20252b; }
    header { border-bottom: 1px solid #bac3cc; padding-bottom: 8px; } header strong { font-size: 16px; }
    h1 { font-size: 22px; margin: 12px 0; } h2 { font-size: 12px; margin: 12px 0 4px; }
    p { margin: 4px 0; line-height: 1.4; overflow-wrap: anywhere; } table { width: 100%; border-collapse: collapse; }
    th,td { padding: 4px 0; border-bottom: 1px solid #e0e4e8; text-align: left; vertical-align: top; overflow-wrap: anywhere; } th { width: 27%; font-weight: normal; }
    section { break-inside: avoid; } .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 26px; }
    .signatures div { border-top: 1px solid #20252b; padding-top: 5px; } .return { border-top: 1px solid #bac3cc; margin-top: 16px; }
    @media print { body { margin: 0; padding: 0; } }
  </style></head><body><header><strong>Time Motor Sales, Inc.</strong><p>1101 E. Lake Street, Minneapolis, MN 55407 | 612-724-3631</p><p>timemotors.net | timemotorsale@gmail.com</p></header>
    <h1>Test Drive Agreement and Vehicle Release</h1>
    <table>${c.rows.map(([label,value]) => `<tr><th>${escape(label)}</th><td>${escape(value)}</td></tr>`).join("")}</table>
    ${c.sections.map(([heading,paragraph]) => `<section><h2>${escape(heading)}</h2><p>${escape(paragraph)}</p></section>`).join("")}
    <p>I reviewed the checkout record and accept this authorization and its stated limits.</p>
    <div class="signatures"><div>Driver signature / date</div><div>Authorizing employee signature / date</div></div>
    <section class="return"><h2>Return / Receiving Record</h2>
    <p>Returned: ${escape(testDriveDateTime(f.returnAt) || "________________")} | Odometer: ${Number.isFinite(f.returnMileage) ? f.returnMileage.toLocaleString("en-US") : "________"} | Fuel: ${escape(f.fuelIn || "________")}</p>
    <p>Condition / new damage: ${escape(f.returnCondition || "________________________________________________")}</p>
    <p>All keys returned: ${f.keysReturned ? "Yes" : "____"} | Received by: ${escape(f.receivedBy || "________________")} | Staff initials: ________</p></section>
  </body></html>`;
}

export async function testDriveAgreementPdfBase64(input: Input) {
  const c = content(input);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612,792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.12,.15,.18);
  let y = 756;
  function line(value: string, size = 9, heavy = false) {
    const font = heavy ? bold : regular;
    let current = "";
    for (const character of value) {
      if (font.widthOfTextAtSize(current + character, size) > 540) {
        const boundary = current.lastIndexOf(" ");
        page.drawText(boundary > 0 ? current.slice(0,boundary) : current, {x:36,y,size,font,color:ink});
        y -= size + 2.5;
        current = boundary > 0 ? current.slice(boundary + 1) : "";
      }
      current += character;
    }
    if (current) { page.drawText(current,{x:36,y,size,font,color:ink}); y -= size + 2.5; }
  }
  line("Time Motor Sales, Inc.",13,true);
  line("1101 E. Lake Street, Minneapolis, MN 55407 | 612-724-3631",8);
  line("timemotors.net | timemotorsale@gmail.com",8);
  y -= 9;
  line("Test Drive Agreement and Vehicle Release",18,true);
  y -= 5;
  for (const [label,value] of c.rows) line(`${label}: ${value}`,8.5);
  y -= 8;
  for (const [heading,paragraph] of c.sections) { line(heading,10,true); line(paragraph); y -= 7; }
  line("I reviewed the checkout record and accept this authorization and its stated limits.",8);
  y -= 24;
  const form = pdf.getForm();
  function field(name: string, label: string, value: string, x: number, width: number) {
    const item = form.createTextField(name);
    item.setText(value);
    item.addToPage(page,{x,y,width,height:20,borderWidth:.5});
    item.setFontSize(8);
    page.drawText(label,{x,y:y-11,size:7,font:regular,color:ink});
  }
  field("driver_signature","Driver signature / date","",36,261);
  field("authorizing_employee_signature","Authorizing employee signature / date","",315,261);
  y -= 36;
  line("Return / Receiving Record",10,true);
  y -= 20;
  const f = input.facts;
  field("actual_return_time","Actual return date / time",testDriveDateTime(f.returnAt),36,260);
  field("return_odometer","Return odometer",Number.isFinite(f.returnMileage) ? String(f.returnMileage) : "",306,130);
  field("return_fuel","Fuel in",f.fuelIn,446,130);
  y -= 40;
  field("return_condition","Condition / new damage",f.returnCondition,36,330);
  field("keys_returned","All keys returned",f.keysReturned ? "Yes" : "",376,75);
  field("received_by","Receiving employee",f.receivedBy,461,115);
  y -= 36;
  field("receiving_staff_initials","Receiving staff initials","",36,155);
  if (y < 38) throw new UnifiedCrmContractPacketError("CONTRACT_PACKET_INVALID", "Shorten the authorization notes and descriptive fields to keep the test-drive agreement on one page.");
  form.updateFieldAppearances(regular);
  return Buffer.from(await pdf.save()).toString("base64");
}
