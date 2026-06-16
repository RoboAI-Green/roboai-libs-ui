import { DEFAULTS } from "@/lib/simulatorParams";
import type { SimulatorParams } from "@/lib/simulatorParams";

export interface EmptyStatePreset {
  id: string;
  label: string;
  body: string;
  /** Builds a full, reproducible parameter set from DEFAULTS, independent of current state. */
  apply: () => SimulatorParams;
}

/**
 * Example presets shown in the EmptyState. Applying one writes the result through the URL
 * search-param path (ADR-0010), so the resulting configuration stays shareable.
 */
export const EMPTY_STATE_PRESETS: ReadonlyArray<EmptyStatePreset> = [
  {
    id: "fe-cu-trace",
    label: "Fe matrix + Cu trace",
    body: "Iron base with a 1% copper trace",
    apply: () => ({
      ...DEFAULTS,
      mode: "static",
      elements: ["Fe", "Cu"],
      proportions: { Fe: 0.99, Cu: 0.01 },
      range_min_nm: 200,
      range_max_nm: 500,
      plasma_preset: "uniform",
    }),
  },
  {
    id: "mars-basalt",
    label: "Mars basalt",
    body: "ChemCam-style run over basalt majors",
    apply: () => ({
      ...DEFAULTS,
      mode: "static",
      elements: ["Si", "Al", "Fe", "Ca", "Mg", "Na"],
      proportions: { Si: 0.45, Al: 0.15, Fe: 0.15, Ca: 0.1, Mg: 0.1, Na: 0.05 },
      range_min_nm: 240,
      range_max_nm: 800,
      plasma_preset: "uniform",
    }),
  },
  {
    id: "cu-concentrate",
    label: "Copper concentrate",
    body: "Copper with As/Sb/Bi/Pb penalty elements",
    apply: () => ({
      ...DEFAULTS,
      mode: "static",
      elements: ["Cu", "As", "Sb", "Bi", "Pb"],
      proportions: { Cu: 0.9, As: 0.03, Sb: 0.03, Bi: 0.02, Pb: 0.02 },
      range_min_nm: 200,
      range_max_nm: 500,
      plasma_preset: "strong",
    }),
  },
];
