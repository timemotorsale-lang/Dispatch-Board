"use client";

import type { ComponentProps } from "react";
import { RepairHistorySearch } from "@/features/repair-history/repair-history-search";

export function GuideRepairHistory(props: ComponentProps<typeof RepairHistorySearch>) {
  return (
    <div>
      <RepairHistorySearch {...props} linkTarget="_blank" />
      <small>Results open in a new tab so you can keep working here.</small>
    </div>
  );
}
