import {
  COMPOSITION_TOLERANCE,
  EXPOSURE_DEFAULTS,
  compositionSum,
  type SimulatorParams,
} from "./simulatorParams";

// Interactive wavelength-point ceiling for the time-resolved exposure views
// (Time slider + 3D surface). Below the model's MAX_WAVELENGTH_POINTS — it
// bounds per-frame SVG/WebGL work so the slider stays responsive.
export const MAX_EXPOSURE_WAVELENGTH_POINTS = 4500;
// Interactive time-step ceiling — matches the backend display cap
// (roboai_spectra MAX_DISPLAY_TIME_STEPS). Higher counts up to MAX_TIME_STEPS
// require the windowed API path.
export const MAX_INTERACTIVE_TIME_STEPS = 100;
export const API_CLIENT_URL = "https://pypi.org/project/roboai-libs-client/";
const FLOAT_EPSILON = 1e-9;

export type RunGuard = {
  canRun: boolean;
  blockers: string[];
  interactiveBlockers: string[];
  wavelengthBlockers: string[];
  timeBlockers: string[];
  wavelengthPoints: number;
  timeSteps: number;
};

function isExposureMode(mode: SimulatorParams["mode"]) {
  return mode === "dynamic" || mode === "3d";
}

export function wavelengthPointCount(params: SimulatorParams, grid?: number[]): number {
  if (grid) return grid.length;
  return Math.max(
    1,
    Math.ceil((params.range_max_nm - params.range_min_nm) / params.resolution_nm - FLOAT_EPSILON),
  );
}

export function timeStepCount(params: SimulatorParams): number {
  if (!isExposureMode(params.mode)) return 1;
  const integrationTime = params.integration_time_s ?? EXPOSURE_DEFAULTS.integration_time_s;
  const timeResolution = params.time_resolution_s ?? EXPOSURE_DEFAULTS.time_resolution_s;
  return Math.max(1, Math.ceil(integrationTime / timeResolution - FLOAT_EPSILON));
}

export function evaluateRunGuard(params: SimulatorParams, grid?: number[]): RunGuard {
  const blockers: string[] = [];
  const interactiveBlockers: string[] = [];
  const wavelengthBlockers: string[] = [];
  const timeBlockers: string[] = [];
  const wavelengthPoints = wavelengthPointCount(params, grid);
  const timeSteps = timeStepCount(params);

  if (params.elements.length === 0) {
    blockers.push("Select at least one element.");
  } else if (
    Math.abs(compositionSum(params.elements, params.proportions) - 1) > COMPOSITION_TOLERANCE
  ) {
    blockers.push("Element proportions must sum to 1 before running.");
  }

  if (isExposureMode(params.mode)) {
    // Name the active mode (never both), using its UI tab label.
    const modeLabel = params.mode === "3d" ? "3D surface" : "Time slider";
    if (wavelengthPoints > MAX_EXPOSURE_WAVELENGTH_POINTS) {
      // An uploaded grid disables the Resolution/range inputs, so steer the user
      // to the grid control instead of advice they can't act on.
      const fix = grid
        ? "Upload a smaller grid or clear it."
        : "Raise Resolution (nm) or narrow the range.";
      wavelengthBlockers.push(
        `${modeLabel} supports up to ${MAX_EXPOSURE_WAVELENGTH_POINTS.toLocaleString()} wavelength points; this one has ${wavelengthPoints.toLocaleString()}. ${fix}`,
      );
    }
    if (timeSteps > MAX_INTERACTIVE_TIME_STEPS) {
      timeBlockers.push(
        `${modeLabel} supports up to ${MAX_INTERACTIVE_TIME_STEPS.toLocaleString()} time steps; this one has ${timeSteps.toLocaleString()}. Raise Time Step or shorten Total Time.`,
      );
    }
  }
  interactiveBlockers.push(...wavelengthBlockers, ...timeBlockers);
  blockers.push(...interactiveBlockers);

  return {
    canRun: blockers.length === 0,
    blockers,
    interactiveBlockers,
    wavelengthBlockers,
    timeBlockers,
    wavelengthPoints,
    timeSteps,
  };
}
