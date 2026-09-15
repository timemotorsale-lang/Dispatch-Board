import { notFound } from "next/navigation";

import { VendorProfilePage } from "@/features/vendors/vendor-profile-page";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVendorProfile } from "@/server/vendors/vendor-service";

export default async function CustomerVendorProfilePage({ params }: { params: Promise<{ vendorId: string }> }) {
  const user = await requireCurrentUser();
  const { vendorId } = await params;
  let readModel: Awaited<ReturnType<typeof getVendorProfile>>;

  try {
    readModel = await getVendorProfile(user, vendorId);
  } catch (error) {
    if (error instanceof Error && error.message === "Vendor not found.") {
      notFound();
    }

    throw error;
  }

  return <VendorProfilePage initialReadModel={readModel} />;
}
