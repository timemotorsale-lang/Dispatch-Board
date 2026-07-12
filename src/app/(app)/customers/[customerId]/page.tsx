import { CustomerCommandCenter } from "@/features/customers/customer-command-center";

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <CustomerCommandCenter customerId={customerId} />;
}
