import { createContext, forwardRef, useImperativeHandle } from "react";
import type { DealVehicleChoice } from "../../../lib/deal-continuity";
export const SharedDealVehicleContext = createContext<DealVehicleChoice | null>(null);
export function useCanonicalDealVehicle() {}
export const CrmNextVinDecoder = forwardRef(function Decoder(_props, ref) {
  useImperativeHandle(ref, () => ({ decodeAndFill() {} }));
  return <span>Isolated vehicle decoder fixture</span>;
});
