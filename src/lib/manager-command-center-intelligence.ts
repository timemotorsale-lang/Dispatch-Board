import type { ManagerAction, ManagerMode, ManagerWorkspaceModel } from "@/server/manager-workspace/service";

export type ManagerExceptionCard = {
  actionLabel: string;
  count: number;
  detail: string;
  href: string;
  id: string;
  title: string;
  tone: "blue" | "green" | "red" | "yellow";
};

export type ManagerCommandCenterBrief = {
  exceptionCards: ManagerExceptionCard[];
  headline: string;
  primaryAction: ManagerAction | null;
};

function actionPriority(action: ManagerAction) {
  const modeBoost = action.mode === "CEO" ? 40 : action.mode === "COO" ? 30 : 10;
  const overdueBoost = action.overdue ? 200 : 0;
  return action.score + modeBoost + overdueBoost;
}

function topActionFor(mode: ManagerMode, actions: ManagerAction[]) {
  const modeActions = actions.filter((item) =>
    mode === "CEO"
      ? item.mode === "CEO"
      : mode === "COO"
        ? item.mode !== "WORK"
        : item.mode === "WORK"
  );
  return [...modeActions].sort((left, right) => actionPriority(right) - actionPriority(left) || left.dueAt.localeCompare(right.dueAt))[0] ?? null;
}

export function buildManagerCommandCenterBrief(model: ManagerWorkspaceModel, mode: ManagerMode): ManagerCommandCenterBrief {
  const h = model.health;
  const exceptionCards: ManagerExceptionCard[] = [
    {
      actionLabel: "Open customer queue",
      count: h.advisorAttention,
      detail: "Promises, approvals, and customer updates that can slow delivery.",
      href: "/vehicles/advisor?inbox=1",
      id: "customer-attention",
      title: "Customers needing attention",
      tone: h.advisorAttention > 0 ? "red" : "green"
    },
    {
      actionLabel: "Review overdue",
      count: h.overdue,
      detail: "Work past promise, target, or personal follow-up time.",
      href: "/tasks?focus=overdue",
      id: "overdue-work",
      title: "Overdue follow-ups",
      tone: h.overdue > 0 ? "red" : "green"
    },
    {
      actionLabel: "Open approvals",
      count: h.approvals + h.reviews,
      detail: "Manager approvals, reviews, and release decisions waiting.",
      href: "/manager-review?scope=inventory&view=approvals",
      id: "manager-queue",
      title: "Manager decision queue",
      tone: h.approvals + h.reviews > 0 ? "yellow" : "green"
    },
    {
      actionLabel: "Open recon flow",
      count: h.blocked + h.waitingParts,
      detail: "Blocked vehicles, shop constraints, and unresolved parts demand.",
      href: "/vehicles/control-tower?focus=EXCEPTIONS",
      id: "vehicle-flow",
      title: "Vehicle flow exceptions",
      tone: h.blocked + h.waitingParts > 0 ? "yellow" : "green"
    }
  ];
  const openExceptions = exceptionCards.filter((card) => card.count > 0).length;

  return {
    exceptionCards,
    headline: openExceptions
      ? `${openExceptions} exception lane${openExceptions === 1 ? "" : "s"} need manager attention.`
      : "No high-signal manager exceptions are currently open.",
    primaryAction: topActionFor(mode, model.actions)
  };
}
