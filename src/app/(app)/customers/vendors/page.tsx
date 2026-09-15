import { VendorRegistryPage } from "@/features/vendors/vendor-registry-page";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getVendorRegistryReadModel, normalizeVendorListQuery } from "@/server/vendors/vendor-service";

export default async function CustomersVendorsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCurrentUser();
  const resolvedSearchParams = await searchParams;
  const urlSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string") urlSearchParams.set(key, value);
  }

  const readModel = await getVendorRegistryReadModel(user, normalizeVendorListQuery(urlSearchParams));
  return <VendorRegistryPage initialReadModel={readModel} />;
}
