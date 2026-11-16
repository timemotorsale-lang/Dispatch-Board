import { hasCollectionsPermission } from "@/features/collections/config/permissions";
import { collectionsAccess } from "@/features/collections/server/access";
import { listAccounts } from "@/features/collections/server/account-service";
import { requireCollectionsPage } from "@/features/collections/server/page-gate";
import { AccountsScreen } from "@/features/collections/ui/accounts-screen";
import { CollectionsFrame } from "@/features/collections/ui/collections-frame";
import { prisma } from "@/server/db/client";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CollectionsAccountsPage({ searchParams }: { searchParams?: Search }) {
  const user = await requireCollectionsPage("VIEW");
  const query = (await searchParams) ?? {};
  const value = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const data = await listAccounts(user, { q: value("q"), sort: value("sort"), dir: value("dir"), page: Number(value("page")) || 1, type: value("type"), status: value("status") });
  const canAssign = hasCollectionsPermission(user, "EDIT_SETTINGS");
  const access = await collectionsAccess(user, "VIEW");
  const collectors = canAssign
    ? await prisma.user.findMany({ where: { isActive: true, appointmentLocationAccess: { some: { location: { organizationId: access.organizationId } } } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  return (
    <CollectionsFrame section="accounts" title="Accounts" description="Every DealerCenter account. Select several to change the type or assign a collector.">
      <AccountsScreen data={data} query={{ q: value("q"), type: value("type"), status: value("status") }} collectors={collectors} canChangeType={hasCollectionsPermission(user, "CHANGE_ACCOUNT_TYPE")} canAssign={canAssign} />
    </CollectionsFrame>
  );
}
