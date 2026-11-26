import { Suspense } from "react";
import { MobileCaptureTool } from "@/features/mobile-capture/mobile-capture-tool";
import { getCurrentUser } from "@/server/auth/current-user";
import { canViewCapturedId } from "@/server/document-library/capture-archive";

export default async function CapturePage() {
  const canPrintId = canViewCapturedId(await getCurrentUser());
  return <Suspense fallback={null}><MobileCaptureTool canPrintId={canPrintId} /></Suspense>;
}
