# Dispatch Board Enterprise Refinement Standard

Use this standard for refinements across Dispatch Board, including Inventory, Service, Sales, Rentals, BHPH, CRM, Appointments, Reporting, and future consoles. For staff duties or approval ownership, consult the [Role and Duty Reference](ROLE_DUTY_REFERENCE.md). This standard governs engineering and release verification.

## Routine checklist

1. Confirm the repository, branch, intended base, and working-tree changes. Read the applicable repository instructions and workflow documentation. Preserve unrelated work.
2. Name the workflow, entry point, affected staff roles, current behavior, and expected outcome. Reproduce defects through the normal entry point when feasible. Write observable acceptance criteria before substantive edits.
3. Keep the change scoped. Reuse existing components and business rules. Verify the affected workflow and choose deeper checks from the table below.
4. Record the tested branch or detached worktree, commit, and included uncommitted changes. Report what passed, failed, or could not be verified. Review the final diff against the intended base for higher-impact changes.

## Workflow and layout

Use **Dispatch Overview as the first pilot for compact layout patterns** such as concise headers, responsive action rows, readable status indicators, and scannable summaries. Each console keeps the hierarchy its workflow requires. A calendar should prioritize appointments, a workbench should prioritize the current job and next action, and a dashboard should prioritize exceptions and summary metrics.

Before adopting a pattern across the application, verify it on a populated Dispatch Overview and a second console with a different workflow, such as Appointments or Service. Include realistic workloads, representative staff roles, desktop and mobile widths, keyboard navigation, and browser zoom. On Dispatch Overview, include blocked work, pending approvals, and delayed updates. Observe whether a manager can identify what needs attention and take the next action without hunting. On the second console, verify that staff can still complete their primary workflow. Record which patterns held up in both and promote only those with supporting evidence.

Keep frequent actions visible and verify representative desktop and mobile widths, including keyboard access and content wrapping where relevant. Preserve staff workflows and destinations unless the requested change alters them. Statuses must reflect actual state. When an action is blocked, show the specific reason, who can resolve it when relevant, and the next available action.

## Verification depth

| Change | Evidence to collect |
| --- | --- |
| Contained layout or copy | Check affected responsive layouts and controls through the normal entry point. Run focused regression checks. |
| Workflow transition or permission | Exercise the allowed path, the blocked path, the responsible role, and recovery. Enforce permissions and transitions on the server. |
| Existing records, money, or generated documents | Check representative historical records, manually entered values, calculations, and relevant preview, print, or PDF output. Verify retries, duplicate submissions, and partial failure where applicable. |
| Migration or release | Verify compatibility and migration behavior on isolated data. Document recovery if deployment fails and verify the deployed revision and critical workflows. |

Use the existing commands as applicable: `npm test -- <test-path>` for focused checks, `npm test` for broader coverage, `npm run lint`, `npm run typecheck`, and `npm run build`. Follow [local setup](SETUP.md) for prerequisites. Use isolated fixtures for checks that write data. A skipped or blocked critical workflow leaves its readiness unverified.

## Parallel work

Use one agent for contained work. Parallelize independent investigations or clearly bounded edits. Give each agent a defined assignment, expected evidence, and exclusive file ownership for edits. One lead integrates results and verifies the complete workflow. Keep tightly coupled changes under one owner.

A worktree isolates checked-out files. Set separate ports, database connections, and external-service configuration where isolation is required. Use separate worktrees when concurrent edits would interfere. If agents or worktrees are unavailable, work sequentially with the same verification requirements.

## Release

Preserve the repository's [CI workflow](../.github/workflows/deploy.yml) and [production deployment workflow](../.github/workflows/deploy-production.yml). Review the pull request and required checks before merging. The production workflow runs manually from `main` with `confirm_deployment` enabled. It retains the prior image, applies migrations, and checks health and revision. See the [Tailscale deployment runbook](TAILSCALE_DEPLOYMENT.md) for host procedures. Confirm production authorization, verify the intended revision and critical workflows after deployment, and escalate failures to the release owner.

The host runbook includes manual deployment commands. Confirm with the owner when those commands are intended for recovery versus routine release. Record the recovery procedure for any migration that an image rollback alone cannot safely reverse.

## Worked examples

**Calendar sidebar.** Open Appointments as staff and collapse and expand the sidebar at desktop and mobile widths. Verify keyboard focus and menu reachability. Open an appointment and complete the usual appointment action on a test record. Confirm navigation and calendar controls remain usable in both sidebar states.

**QC completion blocker.** Assign independent investigations for server-side transition rules, the UI's blocker feedback, and reproduction from the repair workbench. The lead verifies an eligible current vehicle and a representative older record. Confirm staff can see the actual blocker and who can resolve it, resolve it through the normal workflow, and advance QC afterward. Verify the manager approval path and that staff without approval authority cannot bypass it.
