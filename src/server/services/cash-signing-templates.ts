import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import map from "./cash-signing-template-map.json";
import { cashTitleFeeTotal, cashCents, cashMoney, cashSaleTotals } from "@/lib/cash-retail-sale";
import type { Input } from "./cash-retail-sale-documents";
import { CASH_SIGNING_TEMPLATE_VERSION } from "@/lib/cash-sale-print-library";
export function cashSigningTemplate(id:string) { return id !== "power-of-attorney" && Object.hasOwn(map,id) ? map[id as keyof typeof map] : null; }
export function cashSigningTemplateSource(id:string) {
  const template=cashSigningTemplate(id);if(!template)throw new Error("Cash signing template was not found.");
  const bytes=fs.readFileSync(path.join(process.cwd(),"docs/sales-signing-package/final/forms",template.file));
  if(createHash("sha256").update(bytes).digest("hex")!==template.sha256)throw new Error("The signing template changed. Verify its field mapping before generating documents.");
  return {bytes,template};
}
const safe=(value:string)=>value.replace(/[\u2013\u2014]/g,"-").replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"');
const omittedAgreementSellerFields = new Set(["dealerName", "dealerAddress", "dealerPhone", "dealerLicense"]);

export async function cashSigningTemplatePdf(id:string,input:Input) {
  const {bytes,template}=cashSigningTemplateSource(id),pdf=await PDFDocument.load(bytes),form=pdf.getForm(),font=await pdf.embedFont(StandardFonts.Helvetica);
  const f=input.facts,t=input.pricing ?? cashSaleTotals(input.salePrice,f),m=cashMoney;
  const values:Record<string,string>={...f,paymentMethod:input.funding?.label || f.paymentMethod,buyer:input.customerName,buyers:[input.customerName,f.coBuyer].filter(Boolean).join(" / "),dealNumber:input.dealNumber,agreementStock:[input.dealNumber,input.vehicle.stockNumber].filter(Boolean).join(" / "),vin:input.vehicle.vin,vehicle:[input.vehicle.year,input.vehicle.make,input.vehicle.model].filter(Boolean).join(" "),color:input.vehicle.color,stockNumber:input.vehicle.stockNumber,plate:[f.plate,f.plateState].filter(Boolean).join(" "),sale:m(t.sale),accessories:m(t.accessories),docFee:m(cashCents(f.docFee)),tax:m(t.tax),titleFee:m(cashTitleFeeTotal(f)),registrationFee:m(cashCents(f.registrationFee)),otherFee:m(cashCents(f.otherFee)),purchaseTotal:m(t.total+t.trade-t.payoff),trade:m(t.trade),payoff:m(t.payoff),paid:m(t.paid),balance:m(t.balance),deliveryPlace:[f.deliveryDate,f.dealerAddress].filter(Boolean).join(" / "),noFinance:input.funding ? `Yes - ${input.funding.label}` : "No - cash sale",insurance:[f.insuranceCompany,f.insurancePolicy].filter(Boolean).join(" / ")};
  const duration=f.warrantyDuration.match(/(\d+)\s*days?.*?([\d,]+)\s*miles?/i);
  values.dealerLicense="";
  const days=duration ? Number(duration[1]) : 0,miles=duration ? Number(duration[2].replaceAll(",","")) : 0;
  values.term_60=days===60 && miles===2500 ? "X" : "";values.term_30=days===30 && miles===1000 ? "X" : "";values.term_15=days===15 && miles===500 ? "X" : "";
  values.warrantyStartDate=f.deliveryDate;values.warrantyStartMileage=f.deliveryDate ? f.mileage : "";
  values.warrantor=[f.dealerName,f.dealerAddress].filter(Boolean).join(" / ");values.warrantyContact=[f.authorizedAgent,f.dealerPhone].filter(Boolean).join(" / ");
  const continuation:Array<{label:string;value:string}>=[];
  if (id === "sales-agreement" && input.funding) continuation.push({ label: "Financing arrangement - not a payment receipt", value: `${input.funding.label}. Agreed down payment: ${input.funding.downPayment}. Financed portion under the separate credit agreement: ${input.funding.amountFinanced}. These amounts do not verify received or cleared funds. The front-page remaining balance shows the sale price less payments actually recorded; financing and down-payment collection remain separate.` });
  if (id === "sales-agreement") {
    pdf.getPage(0).drawRectangle({ x: 65, y: 600, width: 482, height: 38, color: rgb(1, 1, 1) });
    const vehicle = input.vehicle;
    const specs = [
      ["Trim", vehicle.trim], ["Interior color", vehicle.interiorColor], ["Body style", vehicle.bodyStyle],
      ["Engine", vehicle.engine], ["Transmission", vehicle.transmission], ["Drivetrain", vehicle.drivetrain], ["Fuel type", vehicle.fuelType]
    ].filter(([, value]) => value && value !== "Not captured").map(([label, value]) => `${label}: ${value}`);
    if (specs.length) continuation.push({ label: "Vehicle specifications", value: specs.join(" | ") });
  }
  if(id==="warranty-disclosure" && f.warrantyDuration && !values.term_60 && !values.term_30 && !values.term_15)continuation.push({label:"Staff-entered warranty term",value:f.warrantyDuration});
  for(const field of template.fields){
    if (id === "sales-agreement" && field.page === 0 && omittedAgreementSellerFields.has(field.key)) continue;
    const value=field.signature ? "" : safe(values[field.key] || "");
    if(field.key.startsWith("term_")){
      const checkbox=form.createCheckBox(field.name);checkbox.addToPage(pdf.getPage(field.page),{x:field.x,y:field.y,width:field.width,height:9.5,borderWidth:.7,borderColor:rgb(.2,.25,.3)});if(value==="X")checkbox.check();continue;
    }
    if(field.key.startsWith("warrantyStart") && !value)continue;
    const box=form.createTextField(field.name);
    const size=Math.min(9,Math.max(6,field.height-1));
    const multiline=field.height>=20;
    const wrapped:string[]=[];let current="";
    for(const word of value.split(/\s+/)){if(current && font.widthOfTextAtSize(`${current} ${word}`,size)>field.width-4){wrapped.push(current);current=word;}else current=current ? `${current} ${word}` : word;}
    if(current)wrapped.push(current);
    const maxLines=multiline ? Math.max(1,Math.floor(field.height/(size*1.2))) : 1;
    const overflow=Boolean(value && (wrapped.length>maxLines || wrapped.some(line=>font.widthOfTextAtSize(line,size)>field.width-4)));
    if(multiline)box.enableMultiline();
    if(overflow)continuation.push({label:field.label,value});
    box.setText(overflow ? `See detail ${continuation.length}` : multiline ? wrapped.join("\n") : value);
    box.addToPage(pdf.getPage(field.page),{x:field.x,y:field.y,width:field.width,height:field.height,borderWidth:0,textColor:rgb(.06,.13,.24)});box.setFontSize(size);
  }
  // Preserve every original page and clause. Long entered values are carried in readable continuation fields.
  let detailPage:ReturnType<typeof pdf.addPage>|undefined,y=0;
  for(const [index,detail] of continuation.entries()){
    const chunks:string[]=[];let line="";
    for(const word of detail.value.split(/\s+/)){
      const pieces=word.length>75 ? word.match(/.{1,75}/g)! : [word];
      for(const piece of pieces){if(font.widthOfTextAtSize(`${line} ${piece}`,9)>516){chunks.push(line);line=piece;}else line=line ? `${line} ${piece}` : piece;}
    }
    if(line)chunks.push(line);
    for(let offset=0;offset<chunks.length;offset+=32){
      if(!detailPage || y-(Math.min(32,chunks.length-offset)*12+32)<50){detailPage=pdf.addPage([612,792]);detailPage.drawText(input.funding ? "TMS vehicle sale - entered detail continuation" : "TMS cash sale - entered detail continuation",{x:42,y:750,size:13,font});detailPage.drawText("Customer signing form - complete all applicable fields before signing",{x:42,y:728,size:9,font,color:rgb(.6,.1,.1)});detailPage.drawText(safe(`${input.dealNumber} | ${input.vehicle.vin}`),{x:42,y:708,size:9,font});y=680;}
      detailPage.drawText(safe(`Detail ${index+1}: ${detail.label}${offset ? " (continued)" : ""}`),{x:42,y,size:10,font});y-=18;
      const part=chunks.slice(offset,offset+32),box=form.createTextField(`continuation_${index+1}_${offset}`);box.enableMultiline();box.setText(part.join("\n"));box.addToPage(detailPage,{x:42,y:y-part.length*12,width:528,height:part.length*12+4,borderWidth:0});box.setFontSize(9);y-=part.length*12+20;
    }
  }
  pdf.setTitle(`${input.dealNumber} - ${id}`);pdf.setSubject(`${CASH_SIGNING_TEMPLATE_VERSION}; source SHA-256 ${template.sha256}; unsigned customer signing form`);
  form.updateFieldAppearances(font);
  return Buffer.from(await pdf.save()).toString("base64");
}
