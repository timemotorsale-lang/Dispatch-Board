import { BRAKE_BASELINE_VERSION, BRAKE_CROSS_REFERENCES, brakeOperationForId } from "@/lib/brake-baseline";

export function BrakeOperationScope({ operationId }: { operationId: string }) {
  const operation = brakeOperationForId(operationId);
  if (!operation) return null;
  return <details>
    <summary>Scope, parts & safety checks</summary>
    <p><strong>Scope:</strong> {operation.position}. {operation.applicability}</p>
    <p><strong>Included:</strong> {operation.included.join("; ")}.</p>
    <p><strong>Not included:</strong> {operation.excluded.join("; ")}.</p>
    <p><strong>Parts plan:</strong> {operation.parts.length ? operation.parts.map(part => `${part.quantity} × ${part.name}`).join("; ") : "No automatic replacement parts; add only when findings and scope require them"}. Fitment, fluid specification/volume, one-time-use hardware and supplier pricing need review; these are not OEM part numbers.</p>
    <p><strong>Verification:</strong> {operation.verification.join("; ")}.</p>
    <p><strong>Labor basis:</strong> {BRAKE_BASELINE_VERSION}; internally authored, unvalidated planning hours—not measured technician hours or a vehicle-specific labor standard. Review included access/bleeding/initialization before charging add-ons.</p>
    <p><strong>Related systems:</strong> {BRAKE_CROSS_REFERENCES.join("; ")}.</p>
  </details>;
}
