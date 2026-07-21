# Diagnostic Procedure Authoring and Release

**Version:** 1.0 governing planning baseline  
**Status:** Official pre-implementation specification  
**Date:** 2026-07-20

## 1. Mission

Allow qualified experts to create and maintain diagnostic knowledge safely without burying technical logic in UI code, database blobs, or model prompts.

## 2. Authoring Products

The studio supports versioned system models, failure modes, symptoms/effects, test definitions, test-plan graphs, calculations, rules, applicability, expected results, interpretation branches, safety gates, confirmation policies, repair recommendations, and verification plans.

## 3. Authoring Contract

Every artifact requires owner, purpose, prohibited use, source/license, exact applicability/exclusions, prerequisites, hazards, tools/skills, inputs/units, procedure, evidence requirements, expected outcomes, interpretation, uncertainty, abstention, human authority, effective dates, scenarios, monitoring, and rollback predecessor.

Free-form prose may explain but cannot replace structured gates, inputs, outcomes, or branching.

## 4. Studio Workflow

```text
Draft -> schema/source/applicability validation -> technical peer review
  -> safety/rights review where applicable -> scenario simulation
  -> approval -> shadow -> limited activation -> monitored active
  -> suspend/retire/rollback
```

The same person cannot independently approve their safety-critical artifact where separation of duties is required.

## 5. Simulation and Diff

Before release, the studio shows semantic differences from the predecessor, affected vehicles/cases/procedures, scenario outcomes, changed branches/thresholds/sources, performance impact, and rollback behavior. Invalid, uncovered, ambiguous, cyclic, unreachable, or unsafe branches block release.

## 6. Source Withdrawal and Correction

Withdrawal or correction identifies every active artifact and published case evaluation that used the source. The system suspends unsafe use, marks affected results, preserves history, and requires reviewed replacement/reconfirmation where material.

## 7. Acceptance Gate

A qualified author must create or revise one no-start test plan, pass structured validation and gold scenarios, obtain independent approval, run shadow comparison, activate it for a bounded pilot, observe telemetry, and successfully roll back without changing historical case meaning.

