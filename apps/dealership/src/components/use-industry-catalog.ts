"use client";

import { useEffect, useState } from "react";
import { publicPath } from "../lib/paths";
import { catalogValue, type CatalogMake, type CatalogModel } from "../lib/industry-options";

export function useIndustryCatalog(selected: string[]) {
  const [makes, setMakes] = useState<CatalogMake[]>([]);
  const [makeError, setMakeError] = useState("");
  const [makeLoading, setMakeLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [models, setModels] = useState<{ key: string; values: CatalogModel[]; error: string }>({ key: "", values: [], error: "" });
  const key = makes.filter(make => selected.some(name => catalogValue(name) === catalogValue(make.name))).map(make => make.id).sort((first, second) => first - second).join(",");
  useEffect(() => {
    const controller = new AbortController();
    fetch(publicPath("/api/vehicle-catalog"), { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.makes)) throw new Error(result.error || "Industry makes could not be loaded.");
      if (!controller.signal.aborted) { setMakes(result.makes); setMakeError(""); }
    }).catch(error => { if (!controller.signal.aborted) setMakeError(error instanceof Error ? error.message : "Industry makes could not be loaded."); }).finally(() => { if (!controller.signal.aborted) setMakeLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (!key || key.split(",").length > 20) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    key.split(",").forEach(id => params.append("makeId", id));
    fetch(publicPath(`/api/vehicle-catalog?${params}`), { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.models)) throw new Error(result.error || "Industry models could not be loaded.");
      if (!controller.signal.aborted) setModels({ key, values: result.models, error: "" });
    }).catch(error => { if (!controller.signal.aborted) setModels({ key, values: [], error: error instanceof Error ? error.message : "Industry models could not be loaded." }); });
    return () => controller.abort();
  }, [key, attempt]);
  return {
    makes, makeError, makeLoading,
    models: key && models.key === key ? models.values : [],
    modelLoading: Boolean(key) && models.key !== key && key.split(",").length <= 20,
    modelError: key.split(",").length > 20 ? "Choose up to 20 makes to explore their models at once." : models.key === key ? models.error : "",
    retry: () => { setMakeLoading(true); setAttempt(value => value + 1); }
  };
}
