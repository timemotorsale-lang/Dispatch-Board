# Revenue pathway changes

New deals start with Step 1: Choose the revenue pathway, without preselecting a cash sale. After choosing a pathway, Continue opens customer and vehicle entry with that workflow and its matching form preset initialized together. The New deal button returns to this chooser. Saved deals retain their original pathway, and customer entry still allows resuming existing active deals before creating a separate one.

Staff may change the pathway of deals they are authorized to access, regardless of the current working, sold, completed or inactive status. Organization and record ownership checks remain enforced. Managers retain their existing organization-level access.

The optional server setting `DEAL_PATHWAY_CHANGE_ACCESS=MANAGERS_ONLY` restricts this action to managers. The default is `STAFF`. Apply environment changes through the normal application restart/deployment procedure. This setting does not grant other manager permissions.

Use Deals → Actions → Change revenue pathway, choose the new path and record the reason. The same deal number, shared customer and vehicle remain. The deal returns to Working to review the new pricing and paperwork. The previous amount and status are preserved in its change history. Signed packets and financial records are not rewritten or reversed.

Existing vehicle bookings remain linked and keep their original operational pathway for actual returns, extensions and reservation cancellations. The deal workspace exposes an Original vehicle assignment panel when needed. Changing the commercial pathway does not release an out-on-rental vehicle or close its return task.

Permission, tenant, revision and concurrency checks still apply. Changes are attributable in status history and identical retries do not create another history entry. No database migration is needed.
