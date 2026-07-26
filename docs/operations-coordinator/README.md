# Operations Coordinator Workspace

This folder is the source-of-truth planning package for the Time Motor Sales Operations Coordinator role.

The Operations Coordinator is the dealership's front-door operating loop: broad visibility, guided lightweight action, protected final authority, and fast routing across appointments, intake, repair, parts, inventory, sales, paperwork, finance, rentals, payments, collections, marketing, and documentation.

## Official role name

Operations Coordinator

Optional staff-facing label:

Front Desk Operations Coordinator

## Branch

`codex/office-front-desk-workspace`

## Core principle

The Operations Coordinator can see broadly and act lightly.

She prepares, verifies, records, uploads, schedules, receives, routes, and escalates. She does not silently approve protected decisions, rewrite canonical records, override specialist gates, or close financial/repair/legal workflows without authority.

## Documents

- [Architecture](./ARCHITECTURE.md)
- [Algorithms, logic, and operating rules](./ALGORITHMS_RULES_AND_GUARDRAILS.md)
- [Workflows](./WORKFLOWS.md)
- [UI source of truth](./UI_SOURCE_OF_TRUTH.md)
- [Implementation roadmap and milestones](./IMPLEMENTATION_ROADMAP.md)
- [One-shot implementation prompt](./ONE_SHOT_IMPLEMENTATION_PROMPT.md)

## Adoption statement

The Operations Coordinator Workspace is adopted as the central lightweight coordination layer for Time Motor Sales. It must connect the dealership's operating domains without duplicating their canonical records. Every action should either complete a safe front-desk task, prepare a canonical workflow, or route work to the correct authority.
