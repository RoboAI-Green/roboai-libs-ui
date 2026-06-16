import { EXPOSURE_DEFAULTS, type SimulatorParams } from "./simulatorParams";

// Rough compute-time hint for the loading state — "seconds vs minutes" only,
// NOT a promise. Calibrated on the dev CPU worker: compute time is ~linear in
// (time steps × in-range spectral lines × wavelength points) at ~5.6 ns/unit.
//
// HARDCODED placeholder: we don't yet know per-element line counts in the UI, so
// we assume a nominal lines-per-element. NOMINAL_LINES_PER_ELEMENT is tuned so a
// typical multi-element run lands in the right ballpark (the measured Fe+Cu run
// → ~76 s). Replace it once the elements payload carries real line density —
// then nLines = Σ density[el] × range_nm.
const RATE_S_PER_UNIT = 5.6e-9;
const NOMINAL_LINES_PER_ELEMENT = 3000;

function gridDimensions(p: SimulatorParams): { nTime: number; nWls: number } {
  const nWls = Math.max(1, Math.ceil((p.range_max_nm - p.range_min_nm) / p.resolution_nm));
  const nTime =
    p.mode === "static"
      ? 1
      : Math.max(
          1,
          Math.ceil(
            (p.integration_time_s ?? EXPOSURE_DEFAULTS.integration_time_s) /
              (p.time_resolution_s ?? EXPOSURE_DEFAULTS.time_resolution_s),
          ),
        );
  return { nTime, nWls };
}

/** Rough estimated compute time in seconds for a configuration. */
export function estimateComputeSeconds(p: SimulatorParams): number {
  const { nTime, nWls } = gridDimensions(p);
  const nLines = Math.max(1, p.elements.length) * NOMINAL_LINES_PER_ELEMENT;
  return RATE_S_PER_UNIT * nTime * nLines * nWls;
}

/** Render an estimate as a compact hint, e.g. "est. <1s", "est. 76s", "est. ~3 min". */
export function formatEstimate(seconds: number): string {
  if (seconds < 1) return "est. <1s";
  if (seconds < 90) return `est. ${Math.round(seconds)}s`;
  return `est. ~${Math.round(seconds / 60)} min`;
}
