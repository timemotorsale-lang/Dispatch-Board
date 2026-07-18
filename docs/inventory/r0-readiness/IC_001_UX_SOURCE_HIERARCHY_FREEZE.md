# IC-001 — UX and Source Hierarchy Freeze

**State:** `DOCUMENTED`; product confirmation pending  
**Baseline:** Inventory Console landing pages v1.4 and Control Tower navigation approval dated 2026-07-18

## Precedence

When sources overlap, apply this order:

1. Latest explicitly approved Inventory Console landing-page source and image.
2. Latest approved deeper-workspace source and contract for that workspace.
3. Program architecture and milestone acceptance requirements.
4. Domain workflow/algorithm catalogs and governance policies.
5. Older images and implementation previews only as historical or repository evidence.

Safety, legal/title, privacy, security, authority, and source-of-record constraints always override a visual implication.

## Frozen primary destinations

The console has exactly seven primary destinations:

| Order | Destination | Purpose |
| --- | --- | --- |
| 1 | Home | Attention, workflow start, priority work, and routing |
| 2 | Inventory Lifecycle | Lifecycle summary and entry to Control Tower/Wholesale |
| 3 | Shop & Recon | Production summary and entry to Parts Operations |
| 4 | Reviews | Permission-scoped enterprise review queue |
| 5 | Approvals | Authority-scoped enterprise approval queue |
| 6 | Reports | Governed facts, KPIs, drill-through, and controlled export |
| 7 | Administration | Policy, capability, source, health, and support administration |

`+ Start Workflow` is an action, not an eighth tab. Control Tower, Disposition & Wholesale, Parts Operations, and Event Log are contextual deeper destinations, not primary tabs.

## Approved visual register

| Surface | Governing image | Status |
| --- | --- | --- |
| Console Home | [`inventory-console-home-landing-page-source-of-truth.png`](../assets/inventory-console-home-landing-page-source-of-truth.png) | Binding |
| Inventory Lifecycle | [`inventory-lifecycle-landing-page-control-tower-navigation-v2.png`](../assets/inventory-lifecycle-landing-page-control-tower-navigation-v2.png) | Binding |
| Shop & Recon | [`shop-recon-landing-page-source-of-truth.png`](../assets/shop-recon-landing-page-source-of-truth.png) | Binding |
| Control Tower | [`inventory-lifecycle-control-tower-source.png`](../assets/inventory-lifecycle-control-tower-source.png) | Binding deeper-workspace reference |
| Disposition & Wholesale | [`disposition-wholesale-workspace-source-of-truth.png`](../assets/disposition-wholesale-workspace-source-of-truth.png) | Binding deeper-workspace reference |
| Parts Operations | [`parts-operations-workspace-source-of-truth.png`](../assets/parts-operations-workspace-source-of-truth.png) | Binding deeper-workspace reference |
| Prior Inventory Lifecycle image | [`inventory-lifecycle-landing-page-source-of-truth.png`](../assets/inventory-lifecycle-landing-page-source-of-truth.png) | Historical; superseded |

## Navigation and return-context register

| From | Action | To | Required preserved context |
| --- | --- | --- | --- |
| Console entry/any console page | Home | Home | Permitted location and user scope |
| Home | Inventory Lifecycle | Inventory Lifecycle | Location, permitted scope |
| Home | Shop & Recon | Shop & Recon | Location, permitted scope |
| Home or Inventory Lifecycle | Open Disposition & Wholesale | Wholesale workspace | Location, filters, selected population, return location |
| Home or Shop & Recon | Open Parts Operations | Parts workspace | Location, filters, selected job/demand where applicable, return location |
| Inventory Lifecycle | Open Control Tower | Control Tower | Location, filters, saved view, cutoff, stage/record, return location |
| Control Tower | Back to Inventory Lifecycle | Inventory Lifecycle | Originating permitted context |
| Landing/context panel | Review/Approve | Exact decision detail | Record and version, origin panel, filters, return location |
| Any authorized surface | Start Workflow | Workflow Launcher | Location, role, selected subject, command context |
| Home/health/context | View Event Log | Event history | Subject/correlation/source filters and return location |

## Non-negotiable experience rules

- No horizontal tab-wall regression.
- KPI cards and pipeline nodes act as permission-equivalent filters/drill-throughs.
- Data source, cutoff, freshness, partial/stale/insufficient/unavailable state, and projection lag are honest.
- Recommendations expose explanation and do not execute consequential actions.
- Blocked, overdue, waiting, stale, and denied states do not rely on color alone.
- Desktop, tablet, mobile, keyboard, screen-reader, focus, contrast, zoom/reflow, and reduced-motion behavior are acceptance requirements.
- The Home page remains a routing/attention surface, not a duplicate Control Tower.

## Freeze confirmation

- [x] Seven destinations recorded.
- [x] Approved current and superseded images identified.
- [x] Control Tower, Wholesale, Parts, launcher, Reviews/Approvals, and Event Log placement recorded.
- [x] Return-context rules recorded.
- [ ] Named product owner signs this exact register version.
- [ ] Design/accessibility owner confirms responsive and assistive-technology acceptance targets in IC-005.

