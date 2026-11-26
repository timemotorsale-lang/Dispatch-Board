"use client";

import { createContext } from "react";

export type RepairTaskNavigation = { repairJobId?: string; repairAction?: "progress" };

export const RepairTaskNavigationContext = createContext<((task: RepairTaskNavigation) => void) | null>(null);
