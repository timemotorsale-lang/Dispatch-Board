# R12 Enterprise Readiness and Controlled Pilot Implementation

**Release:** R12  
**Milestone:** M12  
**Slices:** IC-120 through IC-129  
**Contract:** `inventory-console-readiness/r12.0.0`

## 1. Delivered boundary

R12 adds an enterprise-readiness control plane at `/administration/enterprise-readiness`. It does not declare the Inventory Console production-ready, activate integrations, enable rollout flags, deploy a migration, or authorize a pilot. It makes those decisions explicit, versioned, reviewable, and fail-closed.

The workspace contains seven operator views:

1. overview and truthful release posture;
2. IC-120–IC-129 evidence gates;
3. frozen pilot scope;
4. operating thresholds and baselines;
5. pause, rollback, recovery, and resume controls;
6. measured outcomes and governed calibration;
7. eight-dimension expansion/GA sign-off.

Administration links directly to the workspace. Managers may observe readiness; General Manager authority plus the exact named enterprise capability is required for pilot authorization, activation, and functional sign-off commands. A single broad role is not treated as authority for every sign-off dimension.

## 2. Durable records

| Record | Purpose |
| --- | --- |
| `InventoryConsolePilot` | Exact scope, thresholds, pause criteria, rollback plan, baseline, outcome, owner, state, authority, and version |
| `InventoryConsoleReadinessEvidence` | One current evidence record per pilot and IC gate, with submission, independent review, expiry, measurements, references, and waiver authority |
| `InventoryConsoleSignoff` | Explicit approve/reject decision for each required expansion dimension |
| Enterprise command/event/audit/outbox records | Idempotency, optimistic concurrency, reason, actor, correlation, immutable history, and downstream notification |

The source-controlled migration is intentionally not applied by this release.

## 3. Gate behavior

Pre-pilot authorization requires current pass/authorized-waiver evidence for IC-120 through IC-125. A pass requires a submitter and a different reviewer. Missing, in-progress, submitted, failed, or expired evidence blocks authorization. A waiver requires both named authority and a reason; it remains visibly distinct from a pass.

Expansion readiness requires IC-120 through IC-129 plus explicit approval from:

- business;
- data;
- security;
- reliability;
- experience;
- operations;
- measurement;
- executive authority.

A missing decision is not consent. A reject decision blocks expansion.

## 4. Governed command contract

`POST /api/admin/enterprise-readiness` accepts versioned, idempotent commands. Every command requires a reason of at least ten characters.

| Command | Guardrail |
| --- | --- |
| `CREATE_PILOT_DRAFT` | Requires at least one location, role, implementation slice, and command; integrations may be empty for a manual-only pilot |
| `SAVE_EVIDENCE` / `SUBMIT_EVIDENCE` | Allowed only before authorization review; rework clears prior review |
| `REVIEW_EVIDENCE` | Only submitted evidence; reviewer must differ from submitter |
| `REQUEST_PILOT_AUTHORIZATION` | IC-120–IC-125 must be current and passing; support owner, thresholds, pause criteria, and rollback plan must be named |
| `AUTHORIZE_PILOT` | General Manager with `INVENTORY_R12_PILOT_AUTHORIZE`; must differ from pilot owner |
| `ACTIVATE_PILOT` | General Manager with `INVENTORY_R12_PILOT_ACTIVATE`; pilot already authorized; named deployment authority and activation configuration must both exist |
| `PAUSE_PILOT` | Only an active pilot; preserves reads and evidence |
| `ROLLBACK_PILOT` | Only an active or paused pilot; does not erase evidence |
| `RESUME_PILOT` | Only a paused pilot; requires IC-127 evidence plus configured activation authority |
| `RECORD_OUTCOMES` | Only after activation; records the measured IC-128 outcome snapshot |
| `COMPLETE_PILOT` | Requires IC-126–IC-128 evidence plus recorded outcomes |
| `RECORD_SIGNOFF` | Completed/rolled-back pilot; General Manager with `INVENTORY_R12_SIGNOFF_<DIMENSION>`; explicit approve/reject |

All mutations use the shared enterprise aggregate mutation mechanism, so duplicate requests are safe and stale versions fail instead of overwriting newer evidence.

## 5. Activation posture

Activation is disabled by default. Both controls are required:

- `INVENTORY_CONSOLE_PILOT_ACTIVATION_ENABLED=true`;
- a non-empty `INVENTORY_CONSOLE_PILOT_ACTIVATION_AUTHORITY` identifying the approved deployment authority.

These settings do not replace the evidence and authorization gates. They only allow the already-authorized activation command to proceed. No R12 command changes feature flags or activates an R11 provider automatically; those remain separately controlled boundaries.

## 6. Slice traceability

| Slice | Implementation evidence |
| --- | --- |
| IC-120 | Security/privacy gate definition, durable evidence, expiry and independent review |
| IC-121 | Accessibility gate definition and responsive seven-view workspace |
| IC-122 | Performance/scale evidence and frozen threshold snapshots |
| IC-123 | Reliability/recovery evidence plus visible 15-minute RPO and 4-hour RTO policy |
| IC-124 | Observability/support gate plus support owner and threshold contract |
| IC-125 | Migration/shadow gate; synthetic authority is not accepted as activation |
| IC-126 | Exact location/role/slice/command/integration pilot scope and fail-closed activation |
| IC-127 | Pause/rollback states, criteria, plan, read-continuity requirement, evidence retention, and resume reauthorization posture |
| IC-128 | Frozen baseline/outcome snapshots and prohibition on self-modifying production weights |
| IC-129 | Eight explicit go/no-go dimensions and expansion evaluation |

## 7. Verification evidence

- Prisma schema validation passes.
- Prisma Client generation passes.
- TypeScript typecheck passes.
- ESLint passes with zero warnings.
- Seven focused domain/UI tests pass, covering missing evidence, independent review, evidence freshness, complete expansion sign-off, bounded pilot scope, fail-closed activation, and the truthful no-pilot landing state.

## 8. Remaining operational gates

Before any real pilot, authorized staff must still:

1. review and deploy the migration through the approved database process;
2. name the pilot locations, users, volume, duration, owners, support model, and deployment authority;
3. collect real IC-120–IC-125 evidence and independent review;
4. run shadow/manual validation and reconcile authoritative totals;
5. authorize the exact pilot version;
6. configure activation only inside the approved deployment window;
7. monitor thresholds and exercise pause/rollback;
8. record IC-126–IC-129 evidence and the eight explicit expansion decisions.

Until those steps occur, the accurate release state is **R12 control plane implemented; pilot and GA not authorized**.
