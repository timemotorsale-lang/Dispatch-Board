# Customers Console Planning Package

The Customers Console is the customer intelligence and customer operations module inside the Time Motor Sales Dispatch Board.

## Read Order

1. [`CUSTOMERS_ARCHITECTURE.md`](CUSTOMERS_ARCHITECTURE.md) - domain ownership, services, policies, commands, read models, events, integrations, UI boundaries, and architecture decisions.
2. [`CUSTOMERS_MVP_ROLLOUT_ROADMAP.md`](CUSTOMERS_MVP_ROLLOUT_ROADMAP.md) - phased path from the current presentation shell to a day-one MVP rollout.
3. [`CUSTOMERS_IMPLEMENTATION_MILESTONES.md`](CUSTOMERS_IMPLEMENTATION_MILESTONES.md) - Codex-sized vertical slices, branches, dependencies, evidence, and exit gates.

## Product Position

Customers is not a separate app and is not a copy of another CRM. It combines proven customer-operations patterns into an original dealership workflow centered on one question:

> What does this customer need next, who owns it, when is it due, and what operational work must happen?

## Current Truth

- The `/customers` dashboard and light/dark appearance are implemented as an approved UI shell.
- A Customer 360 presentation shell exists for the future detail route.
- The database has a minimum appointment-compatible Customer identity.
- Most dashboard and Customer 360 business values remain sample presentation data.
- Durable search, interactions, leads, cases, documents, customer-vehicle relationships, manager intelligence, and rollout controls remain milestone work.

Use `docs/CURRENT_IMPLEMENTATION_STATUS.md` as the evidence-based implementation record. Planning documents describe accepted direction, not proof of completed behavior.
