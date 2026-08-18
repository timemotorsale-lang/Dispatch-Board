import { SHOP_RECON_STAGES, type ShopReconStageCode } from "@/server/shop-recon/foundation";

function normalizeReturnTo(returnTo?: string) {
  return returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined;
}

export function getShopReconStageHref(
  repairOrderId: string,
  stage: ShopReconStageCode | number,
  returnTo?: string,
) {
  const selectedStage =
    typeof stage === "number"
      ? SHOP_RECON_STAGES.find((candidate) => candidate.order === stage)
      : SHOP_RECON_STAGES.find((candidate) => candidate.code === stage);
  const params = new URLSearchParams();

  if (selectedStage) {
    params.set("stage", String(selectedStage.order));
  }

  const safeReturnTo = normalizeReturnTo(returnTo);
  if (safeReturnTo) {
    params.set("returnTo", safeReturnTo);
  }

  const query = params.toString();
  return `/vehicles/shop-recon/${encodeURIComponent(repairOrderId)}${query ? `?${query}` : ""}`;
}

export function getNextShopReconStageHref(
  repairOrderId: string,
  currentStage: ShopReconStageCode,
  returnTo?: string,
) {
  const currentIndex = SHOP_RECON_STAGES.findIndex((stage) => stage.code === currentStage);
  const nextStage = SHOP_RECON_STAGES[currentIndex + 1];

  if (!nextStage) {
    return getShopReconStageHref(repairOrderId, currentStage, returnTo);
  }

  return getShopReconStageHref(repairOrderId, nextStage.code, returnTo);
}
