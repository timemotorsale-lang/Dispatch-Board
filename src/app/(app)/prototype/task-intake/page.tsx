import { redirect } from "next/navigation";

export default async function TaskIntakePrototypePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const requestedReturnTo = (await searchParams).returnTo;
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "/tasks";
  redirect(`/tasks/intake?returnTo=${encodeURIComponent(returnTo)}`);
}
