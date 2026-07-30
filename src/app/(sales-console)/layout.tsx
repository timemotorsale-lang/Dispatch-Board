import type { ReactNode } from "react";

import { requireCurrentUser } from "@/server/auth/current-user";

type SalesConsoleLayoutProps = {
  children: ReactNode;
};

export default async function SalesConsoleLayout({ children }: SalesConsoleLayoutProps) {
  await requireCurrentUser();

  return children;
}
