import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { chooseEntryDraft, dealNextAction, dealTimeShortcut } from "@/lib/deal-workspace-navigation";
import { DealWorkspaceOverview } from "@/features/crm-next/deal-workspace-overview";
import { DealHomeQuickLinks } from "@/features/crm-next/deal-home-quick-links";
const drafts = [
 { id:"rental", customerId:"customer-a", pathway:"daily-rental", status:"IN_PROGRESS" },
 { id:"sale", customerId:"customer-a", pathway:"retail-sale", status:"IN_PROGRESS" },
 { id:"other", customerId:"customer-b", pathway:"retail-sale", status:"IN_PROGRESS" },
 { id:"archived", customerId:"customer-a", pathway:"retail-sale", status:"ARCHIVED" }
];
describe("context-aware deal entry",()=>{
 it("opens the requested draft instead of the latest or another customer's draft",()=>{
  expect(chooseEntryDraft(drafts,{draftId:"sale",newDeal:false,customerId:"customer-b"})).toEqual({id:"sale",candidates:[]});
 });
 it("opens a blank overview for a deliberate new deal or a general entry",()=>{
  expect(chooseEntryDraft(drafts,{newDeal:true,customerId:"customer-a"})).toEqual({id:null,candidates:[]});
  expect(chooseEntryDraft(drafts,{newDeal:false})).toEqual({id:null,candidates:[]});
 });
 it("requires choosing among multiple active customer deals",()=>{
  expect(chooseEntryDraft(drafts,{newDeal:false,customerId:"customer-a"})).toEqual({id:null,candidates:drafts.slice(0,2)});
 });
 it("respects the intended pathway and excludes inactive deals",()=>{
  expect(chooseEntryDraft(drafts,{newDeal:false,customerId:"customer-a",pathway:"retail-sale"})).toEqual({id:"sale",candidates:[]});
  expect(chooseEntryDraft(drafts,{newDeal:false,customerId:"unknown"})).toEqual({id:null,candidates:[]});
 });
});
describe("next deal action",()=>{
 const base={customer:true,vehicle:true,pathway:"retail-sale",status:"IN_PROGRESS",finalized:false};
 it("asks for missing identities in order",()=>{
  expect(dealNextAction({...base,customer:false,vehicle:false}).action).toBe("Choose customer");
  expect(dealNextAction({...base,vehicle:false}).action).toBe("Choose vehicle");
 });
 it("separates sold paperwork from finalization and rental handoff",()=>{
  expect(dealNextAction({...base,status:"SOLD"}).section).toBe("completion");
  expect(dealNextAction({...base,status:"SOLD",finalized:true}).section).toBe("documents");
  expect(dealNextAction({...base,pathway:"daily-rental"}).action).toBe("Open assignment");
  expect(dealNextAction({...base,status:"ARCHIVED"}).section).toBe("activity");
 });
});
describe("reporting shortcuts",()=>{
 it("handles year, month and leap-day boundaries without UTC-midnight shifts",()=>{
  expect(dealTimeShortcut("yesterday","2026-01-01")).toEqual({date:"2025-12-31",period:"day"});
  expect(dealTimeShortcut("last-month","2026-03-31")).toEqual({date:"2026-02-01",period:"month"});
  expect(dealTimeShortcut("two-weeks","2026-11-03")).toEqual({date:"2026-10-20",period:"week"});
  expect(dealTimeShortcut("yesterday","2024-03-01")).toEqual({date:"2024-02-29",period:"day"});
 });
});
describe("compact overview",()=>{
 it("preserves identity and highlights pending paperwork without marking it finalized",()=>{
  const html=renderToStaticMarkup(<DealWorkspaceOverview customer="Customer A" vehicle="2024 Toyota - 001" pathway="lease-to-own" pathwayLabel="Lease-to-Own" owner="Coordinator" status="SOLD" finalized={false} saved saveStatus="Saved" section="overview" onNavigate={()=>{}}/>);
  expect(html).toContain("Customer A");expect(html).toContain("2024 Toyota - 001");expect(html).toContain("Sold · paperwork pending");expect(html).toContain("Complete paperwork");expect(html).not.toContain("Sold · finalized");
  for(const label of ["Customer &amp; Vehicle","Terms &amp; Payments","Documents","Completion","Activity"])expect(html).toContain(label);
 });
 it("provides direct home entry and deal-specific document selection",()=>{
  const html=renderToStaticMarkup(<DealHomeQuickLinks onContinue={()=>{}} onPaperwork={()=>{}} onReturns={()=>{}} onSummary={()=>{}}/>);
  expect(html).toContain('/crm-next/deals/start?new=1');expect(html).toContain('Upload Signed Documents');expect(html).toContain('Prepare Packet');expect(html).toContain('Rental / loaner returns');
 });
});
