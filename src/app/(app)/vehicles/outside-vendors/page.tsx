import { OutsideVendorDirectory } from "@/features/inventory/outside-vendor-directory";
import { requireCurrentUser } from "@/server/auth/current-user";
import { listRepairVendors } from "@/server/shop-completion/service";
import { getVendorRegistryReadModel } from "@/server/vendors/vendor-service";
import { normalizeVendorName } from "@/server/vendors/vendor-validation";

export default async function OutsideVendorsPage() {
  const user = await requireCurrentUser();
  const [repairVendors, vendorRegistry] = await Promise.all([
    listRepairVendors(user),
    getVendorRegistryReadModel(user).catch(() => null)
  ]);
  const crmVendorByName = new Map((vendorRegistry?.vendors ?? []).map((vendor) => [normalizeVendorName(vendor.name), vendor]));
  const vendors = repairVendors.map((vendor) => {
    const crmVendor = crmVendorByName.get(normalizeVendorName(vendor.name));
    return {
      ...vendor,
      crmVendor: crmVendor
        ? {
          categoryLabel: crmVendor.categoryLabel,
          id: crmVendor.id,
          statusLabel: crmVendor.statusLabel,
          vendorNumber: crmVendor.vendorNumber,
          warning: crmVendor.warning
        }
        : null
    };
  });
  return <OutsideVendorDirectory vendors={JSON.parse(JSON.stringify(vendors))} />;
}
