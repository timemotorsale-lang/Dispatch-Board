# CRM Next — Capability Migration Ledger

Legacy UI does not dictate CRM Next. Before coding, audit the actual legacy implementation.

| Capability | CRM Next destination | Default treatment |
|---|---|---|
| Customer search/list | Customers / Global Search | Redesign UX |
| Customer profile | Customer 360 | Replace UX |
| Leads | Sales / Pipeline | Redesign |
| Communications | Activity + universal actions | Consolidate |
| Appointments | Appointments + Sales | Integrate |
| Test drives | Sales | Redesign |
| Deals | Sales / Pipeline | Redesign |
| Purchased vehicles | Ownership | Preserve |
| BHPH/financing | Ownership | Preserve |
| Payments | Ownership + attention Cases | Preserve |
| Service/repairs | Support | Preserve context |
| Rentals/loaners | Support | Preserve |
| Documents/titles | Support / Cases | Resolution-oriented redesign |
| Customer issues | Support / Cases | Resolution-oriented redesign |
| Insurance claims | Support / Cases | Preserve |
| Follow-ups | Needs Attention / shared Task Engine | Replace queue model |
| Tasks | Shared Dispatch Task Engine | Never duplicate |
| Notes/history | Unified Activity Timeline | Consolidate/migrate |
| Legacy dashboard | Command Center | Retire by default |
| Reports | Reports / Intelligence | Selectively migrate |

## Classification

Every legacy feature: KEEP, REDESIGN, MIGRATE, RETIRE, or DEFER.

## Hybrid rule

Hybrid is not the target. Bring a legacy capability forward only if it materially improves the approved architecture without restoring duplicate navigation/workflows.

