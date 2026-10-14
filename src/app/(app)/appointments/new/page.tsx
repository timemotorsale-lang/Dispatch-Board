import { redirect } from "next/navigation";

type AppointmentNewRouteProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppointmentNewRoute({ searchParams }: AppointmentNewRouteProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  query.set("action", "new");

  for (const [key, value] of Object.entries(params ?? {})) {
    if (key === "action") continue;
    const normalized = firstParam(value);
    if (normalized) {
      query.set(key, normalized);
    }
  }

  redirect(`/appointments?${query.toString()}`);
}
