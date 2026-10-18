import { LIGHT_DUTY_CATALOG_VERSION, lightDutyOperationForId } from "@/lib/light-duty-baseline";
import { lightDutyScopeProfile } from "@/lib/light-duty-scope-profiles";

export function LightDutyOperationScope({ operationId }: { operationId: string }) {
  const operation = lightDutyOperationForId(operationId);
  if (!operation) return null;
  const profile = lightDutyScopeProfile(operation.systemId, operation.groupId, operation.label, operation.diagnosis);
  return <details><summary>Scope, parts & safety checks</summary>
    <p><strong>Scope:</strong> {operation.position} {operation.applicability}</p>
    <p><strong>Configuration checklist:</strong> {profile.configurationFields.join("; ")}.</p>
    <p><strong>Execution requirements:</strong> {[...profile.requirements.requiredSkills, ...profile.requirements.requiredCertifications, ...profile.requirements.bayRequirements, ...profile.requirements.toolRequirements].join(", ")}. These internal capability codes must be recorded against the assigned technician and selected resources.</p>
    <p><strong>Included:</strong> {operation.included.join("; ")}.</p>
    {operation.contains.length > 0 && <details><summary>Included catalog work ({operation.contains.length})</summary><ul>{operation.contains.map(id => <li key={id}>{lightDutyOperationForId(id)?.label ?? id}</li>)}</ul><p>These included labor operations cannot be added again for the same unit. Separately required parts and vehicle-specific supplied contents still need review.</p></details>}
    <p><strong>Not included:</strong> {operation.excluded.join("; ")}.</p>
    <p><strong>Parts plan:</strong> {operation.parts.length ? operation.parts.map(part => part.name).join("; ") : "No automatic replacement parts; add justified consumables or materials after procedure review"}. One listed allowance is not a verified fluid capacity, kit quantity or OEM part number. Confirm fitment, supplied contents, quantity and price.</p>
    <p><strong>Conditional follow-ups:</strong> {operation.conditional.join("; ")}.</p>
    <p><strong>Verification:</strong> {operation.verification.join("; ")}.</p>
    <p><strong>Labor basis:</strong> {LIGHT_DUTY_CATALOG_VERSION}; internally authored, unvalidated planning hours. Stage allocations are illustrative, not measured technician observations or vehicle-specific labor standards.</p>
    <p><strong>Review status:</strong> Expanded coverage awaiting shop approval{operation.specialistReview ? "; specialist capability review required" : ""}. Selecting work does not authorize repair.</p>
  </details>;
}
