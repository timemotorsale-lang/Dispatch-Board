import { OutsideVendorDirectory } from "@/features/inventory/outside-vendor-directory";
import { requireCurrentUser } from "@/server/auth/current-user";
import { listRepairVendors } from "@/server/shop-completion/service";

export default async function OutsideVendorsPage() {
  const user = await requireCurrentUser();
  const vendors = await listRepairVendors(user);
  return <OutsideVendorDirectory vendors={JSON.parse(JSON.stringify(vendors))} />;
}
