import { STEERING_BASELINE_VERSION, STEERING_CROSS_REFERENCES, steeringOperationForId } from "@/lib/steering-baseline";

export function SteeringOperationScope({ operationId }: { operationId: string }) {
  const operation = steeringOperationForId(operationId);
  if (!operation) return null;
  return <details>
    <summary>Scope, parts & safety checks</summary>
    <p><strong>Scope:</strong> {operation.position}. {operation.applicability}</p>
    <p><strong>Included:</strong> {operation.included.join("; ")}.</p>
    <p><strong>Not included:</strong> {operation.excluded.join("; ")}.</p>
    <p><strong>Parts plan:</strong> {operation.parts.length ? operation.parts.map(part => `${part.quantity} × ${part.name}`).join("; ") : "No automatic replacement parts; add only when justified by findings and the selected scope"}. Fitment, quantities, hardware, materials and supplier pricing require review; these are not OEM part numbers.</p>
    <p><strong>Conditional follow-ups:</strong> {operation.conditional.join("; ")}.</p>
    <p><strong>Verification:</strong> {operation.verification.join("; ")}.</p>
    <p><strong>Labor basis:</strong> {STEERING_BASELINE_VERSION}; internally authored, unvalidated planning hours—not measured technician hours or a vehicle-specific labor standard. Review shared access and included work before charging related lines.</p>
    <p><strong>Related systems:</strong> {STEERING_CROSS_REFERENCES.join("; ")}.</p>
  </details>;
}
