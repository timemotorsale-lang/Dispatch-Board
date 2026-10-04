import { Suspense } from "react";
import { MobileCaptureTool } from "@/features/mobile-capture/mobile-capture-tool";

export default function CapturePage() {
  return <Suspense fallback={null}><MobileCaptureTool /></Suspense>;
}
