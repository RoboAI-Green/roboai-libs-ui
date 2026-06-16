import { queryOptions } from "@tanstack/react-query";
import { fetchElements, fetchInfo, fetchJobStats, computeStatic, computeExposure } from "./api";
import { computeRequest } from "./computeRequest";
import type { SimulatorParams } from "./simulatorParams";

/** Available elements for the periodic-table picker. Stable for the session. */
export function elementsQuery() {
  return queryOptions({
    queryKey: ["elements"] as const,
    queryFn: fetchElements,
    staleTime: Infinity,
  });
}

/** Engine + ASD dataset SBOM for the provenance strip. Stable for the session. */
export function infoQuery() {
  return queryOptions({
    queryKey: ["info"] as const,
    queryFn: fetchInfo,
    staleTime: Infinity,
  });
}

/**
 * Live async-exposure Job counts for the waiting view (#97). Unlike info/elements
 * this is live data, so it is polled (5s) rather than cached; callers enable it
 * only while the waiting view is mounted. The endpoint is cheap and unthrottled.
 */
export function jobStatsQuery() {
  return queryOptions({
    queryKey: ["job-stats"] as const,
    queryFn: fetchJobStats,
    refetchInterval: 5000,
    staleTime: 0,
  });
}

/**
 * A computed spectrum for an exact configuration. Keyed by the full parameter
 * set, so identical configurations are served from cache — safe because the
 * computation is deterministic (CONTEXT.md: identical inputs → identical output).
 */
export function spectrumQuery(params: SimulatorParams, grid?: number[]) {
  const request = computeRequest(params, grid);
  return queryOptions({
    queryKey: request.queryKey,
    queryFn: () =>
      request.kind === "static" ? computeStatic(request.payload) : computeExposure(request.payload),
    staleTime: Infinity,
  });
}
