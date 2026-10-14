# Official Repair Estimate Document Review

Date: August 2, 2026

Owner: Time Motor Sales

Status: Proposed for review and approval

## Objective

Create one official repair estimate document for Time Motor Sales that is:

- professional and branded
- clean for printing
- suitable for digital transmission to the technician repair workbench
- separate from the live diagnostics workspace UI
- structured enough for elite, top-tier, and enterprise operations

This document should replace the current behavior where printing captures the entire workspace shell, including sidebar and application navigation.

## Problem we are solving

The current estimate preview is inside the live Diagnostics / Labor Guide workspace. When printed, it includes UI elements that do not belong on an official estimate, such as:

- left sidebar navigation
- top command bar
- workspace tabs and tooling chrome
- diagnostic editing surfaces

This makes the printed result look like an app screenshot instead of an official business document.

## Proposed solution

Create a dedicated **Official Repair Estimate Document** surface that is independent from the working diagnostics page.

The Diagnostics / Labor Guide will continue to be the estimate-building workspace.

The official document will become the output package for:

- print
- review
- digital handoff to technician repair workbench
- later customer-safe estimate packaging if needed

## Proposed workflow

### Step 1: Create estimate

Inside Diagnostics / Labor Guide, the action should be:

- **Create Estimate**

This action should create the estimate package from:

- selected labor lines
- selected parts lines
- tax boundary
- totals
- repair order context
- customer and vehicle context

### Step 2: Open official estimate document

After estimate creation, the user should open a separate branded document page.

This page becomes the official estimate package.

### Step 3: Choose the next action

From the official estimate document, the user should be able to:

- print official estimate
- transmit to technician repair workbench
- return to labor guide for edits

## Proposed document design

### Header

The official estimate document should include:

- Time Motor Sales official logo
- company name
- store identifier: TMS-001
- document title: Official Repair Estimate
- estimate number
- repair order number
- creation date/time

### Customer / vehicle section

This section should show:

- customer name
- vehicle year / make / model
- VIN when available
- concern summary

### Estimate lines section

This should list:

- labor lines
- parts lines
- line description
- quantity or hours
- line amount

### Summary section

This should show:

- labor total
- parts total
- subtotal
- tax
- total estimate

### Operational notes section

This section should explain:

- this is the official estimate package
- parts ordering continues in the governed parts workflow
- technician workbench should use this estimate as scope reference

## Content that should NOT appear on the document

The following should be excluded from the printable official document:

- sidebar navigation
- topbar / command-center chrome
- diagnostic catalog search tools
- workspace tabs
- edit buttons
- add labor / add manual part controls
- suggested add-ons panel
- general app shell UI

## Proposed terminology changes

To better match the real workflow, the following language is recommended:

- Replace **Present Estimate** with **Create Estimate**
- Replace generic print behavior with **Open Official Estimate**
- Keep **Send to Repair Workbench** as the handoff action

## Routing proposal

### From Diagnostics / Labor Guide

The user should have:

- Create Estimate
- Open Official Estimate
- Open Parts Ordering Workflow
- Send to Repair Workbench

### From Official Repair Estimate Document

The user should have:

- Print Official Estimate
- Send to Repair Workbench
- Return to Labor Guide

## Enterprise behavior expectations

The official estimate document should support:

- versioned estimate output
- consistent branded formatting
- repeatable print layout
- technician-ready digital handoff
- future support for customer-safe transmission

## Recommended first version

For initial release, the document should include:

- logo and brand header
- estimate ID and repair order ID
- customer and vehicle details
- concern summary
- labor and parts lines
- totals section
- print action
- send-to-repair-workbench action

Future versions can add:

- signature area
- approval status
- expiration date
- disclaimers
- customer authorization block

## Approval questions

Please review and approve or revise these items:

1. Should the main output title be exactly **Official Repair Estimate**?
2. Do you want **Time Motor Sales** and **TMS-001** shown in the header on every estimate?
3. Should **Open Official Estimate** replace the current print action in Diagnostics / Labor Guide?
4. Should the official document include the concern summary near the top?
5. Should technician digital handoff happen from the official document page rather than directly from the labor guide preview?

## Recommended decision

Recommended approval path:

- approve the document structure first
- approve the exact labels and branding
- then implement the official estimate surface
- then wire printing and technician handoff to that surface

## Current recommendation

Proceed only after this review document is approved.
