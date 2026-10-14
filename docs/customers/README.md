# Customers Console Planning Package

The Customers Console is the customer intelligence and customer operations module inside the Time Motor Sales Dispatch Board.

## Read Order

1. [`CUSTOMERS_ARCHITECTURE.md`](CUSTOMERS_ARCHITECTURE.md) - domain ownership, services, policies, commands, read models, events, integrations, UI boundaries, and architecture decisions.
2. [`CUSTOMERS_MVP_ROLLOUT_ROADMAP.md`](CUSTOMERS_MVP_ROLLOUT_ROADMAP.md) - phased path from the current presentation shell to a day-one MVP rollout.
3. [`CUSTOMERS_IMPLEMENTATION_MILESTONES.md`](CUSTOMERS_IMPLEMENTATION_MILESTONES.md) - Codex-sized vertical slices, branches, dependencies, evidence, and exit gates.
4. [`VENDOR_REGISTRY_SOURCE_OF_TRUTH.md`](VENDOR_REGISTRY_SOURCE_OF_TRUTH.md) - CRM Vendor Registry purpose, scope, categories, workflows, permissions, and version 1 build boundary.
5. [`VENDOR_REGISTRY_ARCHITECTURE.md`](VENDOR_REGISTRY_ARCHITECTURE.md) - Vendor Registry domain ownership, data concepts, command/read model boundaries, permissions, and integration architecture.
6. [`VENDOR_REGISTRY_IMPLEMENTATION_ROADMAP.md`](VENDOR_REGISTRY_IMPLEMENTATION_ROADMAP.md) - Vendor Registry milestone sequence, vertical slices, acceptance evidence, testing strategy, and rollout path.
7. [`VENDOR_REGISTRY_ONE_SHOT_IMPLEMENTATION_PROMPT.md`](VENDOR_REGISTRY_ONE_SHOT_IMPLEMENTATION_PROMPT.md) - Single coordinated implementation prompt for building Vendor Registry version 1 after approval.

## Product Position

Customers is not a separate app and is not a copy of another CRM. It combines proven customer-operations patterns into an original dealership workflow centered on one question:

> What does this customer need next, who owns it, when is it due, and what operational work must happen?

## Current Truth

- The `/customers` dashboard and light/dark appearance are implemented as an approved UI shell.
- The `/customers/resolutions` queue and selected-case command rail are implemented as an approved interactive UI shell.
- A Customer 360 presentation shell exists for the future detail route.
- The database has a minimum appointment-compatible Customer identity.
- Most dashboard and Customer 360 business values remain sample presentation data.
- Durable search, interactions, leads, case/SLA data and commands, documents, customer-vehicle relationships, manager intelligence, and rollout controls remain milestone work.

Use `docs/CURRENT_IMPLEMENTATION_STATUS.md` as the evidence-based implementation record. Planning documents describe accepted direction, not proof of completed behavior.
