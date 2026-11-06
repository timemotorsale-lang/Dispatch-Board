import { MobileCustomerIntake } from "@/features/mobile-capture/mobile-customer-intake";
import { captureReturnHref } from "@/features/mobile-capture/capture-navigation";

export default async function MobileCustomerPage({ searchParams }: { searchParams?: Promise<{ returnTo?: string | string[] }> }) {
  const params = await searchParams;
  return <MobileCustomerIntake returnTo={captureReturnHref(params?.returnTo)} />;
}
