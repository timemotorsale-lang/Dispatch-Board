# CRM Next — Implementation Roadmap

## Phase 0 — Architecture freeze & Legacy audit

CRMN-001 approve documentation pack; CRMN-002 inspect Legacy routes/screens; CRMN-003 inventory schema/services; CRMN-004 complete capability ledger; CRMN-005 data ownership map; CRMN-006 feature-flag/parallel-route plan.

**Gate:** no production implementation until the reuse/migration map is reviewed.

## Phase 1 — CRM Next foundation

CRMN-010 module shell/feature flag; CRMN-011 customer read model; CRMN-012 global CRM search; CRMN-013 Customer 360 shell; CRMN-014 unified activity read model; CRMN-015 permission scopes/tests.

## Phase 2 — Customer Workbench

CRMN-020 dynamic Overview; CRMN-021 70/30 Workbench; CRMN-022 universal action bar; CRMN-023 open-items/context rail; CRMN-024 activity interaction; CRMN-025 responsive/mobile behavior.

## Phase 3 — Sales execution

CRMN-030 lead/opportunity model/adapters; CRMN-031 Pipeline; CRMN-032 appointments integration; CRMN-033 test drives; CRMN-034 deals; CRMN-035 sales timeline events.

## Phase 4 — Ownership & Support

CRMN-040 vehicle relationships; CRMN-041 BHPH/finance context; CRMN-042 payment context; CRMN-043 common Case framework; CRMN-044 titles/documents; CRMN-045 service; CRMN-046 rentals/loaners; CRMN-047 customer issues; CRMN-048 insurance.

## Phase 5 — Shared execution integration

CRMN-050 CRM-to-shared-task linkage; CRMN-051 Dispatch Board customer context; CRMN-052 comments/blockers/review synchronization; CRMN-053 task activity integration; CRMN-054 manager queue.

## Phase 6 — Intelligence

CRMN-060 signal model; CRMN-061 deterministic Risk rules; CRMN-062 Next Action rules; CRMN-063 Opportunity rules; CRMN-064 Priority Engine; CRMN-065 Needs Attention; CRMN-066 explanations/feedback; CRMN-067 manager intelligence view.

## Phase 7 — Command Center

CRMN-070 employee Command Center; CRMN-071 manager Command Center; CRMN-072 appointments/work summary; CRMN-073 pipeline/intelligence summaries; CRMN-074 team-response/load indicators.

## Phase 8 — Migration & hardening

CRMN-080 migrate/reconcile data; CRMN-081 scenario tests; CRMN-082 accessibility/responsive QA; CRMN-083 performance; CRMN-084 security/audit review; CRMN-085 rollback rehearsal.

## Phase 9 — Promotion & retirement

CRMN-090 promotion review; CRMN-091 make Next default; CRMN-092 Legacy read-only; CRMN-093 monitor/reconcile; CRMN-094 retire Legacy after approved stabilization period.

## Build rule

Implement in vertical slices: data/read model → service/policy → UI → activity → tests → docs. Do not build all backend domains first or redesign Legacy in parallel.

