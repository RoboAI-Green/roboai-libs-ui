import { simulatorSearchSchema } from "./searchSchema";

export type SimulatorParams = {
  mode: "static" | "dynamic" | "3d";
  elements: string[];
  proportions: Record<string, number>;
  te_ev: number;
  ne_cm3: number;
  range_min_nm: number;
  range_max_nm: number;
  resolution_nm: number;
  fwhm_nm: number;
  instrument_profile: "gaussian" | "lorentzian";
  plasma_preset: "uniform" | "weak" | "strong" | "custom";
  plasma_layers?: number;
  plasma_te_ratio?: number;
  plasma_ne_ratio?: number;
  plasma_length_proportion?: number;
  plasma_max_length_m?: number;
  temporal_beta_temp?: number;
  temporal_gamma_temp?: number;
  temporal_beta_dens?: number;
  temporal_gamma_dens?: number;
  temporal_expansion_tau_ns?: number;
  integration_time_s?: number;
  time_resolution_s?: number;
};

// Single source of base defaults: the values authored on the Zod schema.
// DEFAULTS is literally "the params from an empty URL", so the two cannot drift.
export const DEFAULTS: SimulatorParams = simulatorSearchSchema.parse({});

// Hard cap on output wavelength points, imposed by the compute model — mirrors
// roboai_spectra MAX_OUTPUT_WAVELENGTH_POINTS. The interactive UI guards below
// this (see MAX_EXPOSURE_WAVELENGTH_POINTS); reaching it requires the API.
export const MAX_WAVELENGTH_POINTS = 10_000;

// Hard cap on exposure time steps, imposed by the compute model — mirrors
// roboai_spectra MAX_EXPOSURE_TIME_STEPS. The interactive UI guards below this
// (see MAX_INTERACTIVE_TIME_STEPS); full-resolution time beyond the display cap
// is only reachable through the windowed API path.
export const MAX_TIME_STEPS = 500;

// Fill-in defaults applied when a config enters dynamic mode or the custom plasma
// preset. Authored once here; the request builder (computeRequest) reuses them, so
// a transform and the formed payload can never disagree on a default. Total Time
// 10 µs / Time Step 100 ns = 100 snapshots, matching MAX_INTERACTIVE_TIME_STEPS:
// a 10 µs window spans the continuum -> ion -> neutral-line decay, and 100 ns is
// a realistic time-resolved ICCD gate step.
export const EXPOSURE_DEFAULTS = { integration_time_s: 10e-6, time_resolution_s: 100e-9 } as const;
export const CUSTOM_PLASMA_DEFAULTS = {
  layers: 3,
  te_ratio: 0.9,
  ne_ratio: 0.7,
  length_proportion: 0.33,
  max_length_m: 1e-3,
} as const;
export const TEMPORAL_DEFAULTS = {
  beta_temp: 0.00233,
  gamma_temp: 0.24,
  beta_dens: 0.005,
  gamma_dens: 2.0,
  expansion_tau_ns: 800.0,
} as const;

function equalProportions(elements: string[]): Record<string, number> {
  const share = 1 / elements.length;
  return Object.fromEntries(elements.map((el) => [el, share]));
}

export function addElement(p: SimulatorParams, el: string): SimulatorParams {
  if (p.elements.includes(el)) return p;
  const elements = [...p.elements, el];
  // 0→1 fills the sole element; 1→2 balances the binary pair; 2→3+ adds the
  // newcomer at zero and leaves existing values for the user to free-edit.
  if (elements.length <= 2) {
    return { ...p, elements, proportions: equalProportions(elements) };
  }
  return { ...p, elements, proportions: { ...p.proportions, [el]: 0 } };
}

export function removeElement(p: SimulatorParams, el: string): SimulatorParams {
  const elements = p.elements.filter((e) => e !== el);
  if (elements.length === 0) return { ...p, elements, proportions: {} };
  // A lone survivor takes the whole sample; otherwise keep the remaining values
  // as the user set them — the Σ indicator flags any imbalance.
  if (elements.length === 1) return { ...p, elements, proportions: equalProportions(elements) };
  const proportions = Object.fromEntries(elements.map((e) => [e, p.proportions[e] ?? 0]));
  return { ...p, elements, proportions };
}

export function setProportion(p: SimulatorParams, el: string, value: number): SimulatorParams {
  const clamped = Math.min(1, Math.max(0, value));
  const proportions: Record<string, number> = { ...p.proportions, [el]: clamped };
  // Two-element compositions stay balanced as a binary mirror; with three or
  // more, only the edited element changes so target ratios remain reachable.
  if (p.elements.length === 2) {
    const other = p.elements.find((e) => e !== el);
    if (other) proportions[other] = Math.max(0, 1 - clamped);
  }
  return { ...p, proportions };
}

// Proportions may drift from 1 while the user edits; this slack absorbs
// rounding from the two-decimal inputs without flagging a valid composition.
export const COMPOSITION_TOLERANCE = 0.005;

export function compositionSum(elements: string[], proportions: Record<string, number>): number {
  return elements.reduce((acc, el) => acc + (proportions?.[el] ?? 0), 0);
}

export function isCompositionValid(
  elements: string[],
  proportions: Record<string, number>,
): boolean {
  if (elements.length === 0) return false;
  return Math.abs(compositionSum(elements, proportions) - 1) <= COMPOSITION_TOLERANCE;
}

export function setMode(p: SimulatorParams, mode: SimulatorParams["mode"]): SimulatorParams {
  if (mode === "static") {
    const { integration_time_s: _i, time_resolution_s: _t, ...rest } = p;
    return { ...rest, mode };
  }
  return {
    ...p,
    mode,
    integration_time_s: p.integration_time_s ?? EXPOSURE_DEFAULTS.integration_time_s,
    time_resolution_s: p.time_resolution_s ?? EXPOSURE_DEFAULTS.time_resolution_s,
  };
}

export function setRange(p: SimulatorParams, min: number, max: number): SimulatorParams {
  const clampedMin = Math.min(Math.max(min, 100), 1999);
  const clampedMax = Math.min(Math.max(max, 101), 2000);
  if (clampedMax <= clampedMin) {
    return { ...p, range_min_nm: clampedMin, range_max_nm: clampedMin + 1 };
  }
  return { ...p, range_min_nm: clampedMin, range_max_nm: clampedMax };
}

export function setPlasmaPreset(
  p: SimulatorParams,
  preset: SimulatorParams["plasma_preset"],
): SimulatorParams {
  if (preset !== "custom") {
    const {
      plasma_layers: _a,
      plasma_te_ratio: _b,
      plasma_ne_ratio: _c,
      plasma_length_proportion: _d,
      plasma_max_length_m: _e,
      ...rest
    } = p;
    return { ...rest, plasma_preset: preset };
  }
  return {
    ...p,
    plasma_preset: preset,
    plasma_layers: p.plasma_layers ?? CUSTOM_PLASMA_DEFAULTS.layers,
    plasma_te_ratio: p.plasma_te_ratio ?? CUSTOM_PLASMA_DEFAULTS.te_ratio,
    plasma_ne_ratio: p.plasma_ne_ratio ?? CUSTOM_PLASMA_DEFAULTS.ne_ratio,
    plasma_length_proportion:
      p.plasma_length_proportion ?? CUSTOM_PLASMA_DEFAULTS.length_proportion,
    plasma_max_length_m: p.plasma_max_length_m ?? CUSTOM_PLASMA_DEFAULTS.max_length_m,
  };
}
