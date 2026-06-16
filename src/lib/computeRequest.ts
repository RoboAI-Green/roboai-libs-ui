import { CUSTOM_PLASMA_DEFAULTS, EXPOSURE_DEFAULTS, TEMPORAL_DEFAULTS } from "./simulatorParams";
import type { SimulatorParams } from "./simulatorParams";

// Layered plasma presets (server contract). Custom is filled from the params,
// falling back to the single CUSTOM_PLASMA_DEFAULTS source.
const PLASMA_PRESETS = {
  uniform: {
    number_of_layers: 1,
    Te_layer_ratio: 1.0,
    Ne_layer_ratio: 1.0,
    length_proportion: 1.0,
    max_length_m: 1e-3,
  },
  weak: {
    number_of_layers: 2,
    Te_layer_ratio: 0.95,
    Ne_layer_ratio: 0.95,
    length_proportion: 0.8,
    max_length_m: 1e-3,
  },
  strong: {
    number_of_layers: 2,
    Te_layer_ratio: 0.7,
    Ne_layer_ratio: 0.7,
    length_proportion: 0.8,
    max_length_m: 1e-3,
  },
};

// Times of peak Te/Ne are fixed (not user-editable), so they live only here.
const TIME_OF_HIGHEST = { time_of_highest_temp_ns: 100.0, time_of_highest_dens_ns: 100.0 };

function plasmaConfig(p: SimulatorParams) {
  if (p.plasma_preset === "custom") {
    return {
      number_of_layers: p.plasma_layers ?? CUSTOM_PLASMA_DEFAULTS.layers,
      Te_layer_ratio: p.plasma_te_ratio ?? CUSTOM_PLASMA_DEFAULTS.te_ratio,
      Ne_layer_ratio: p.plasma_ne_ratio ?? CUSTOM_PLASMA_DEFAULTS.ne_ratio,
      length_proportion: p.plasma_length_proportion ?? CUSTOM_PLASMA_DEFAULTS.length_proportion,
      max_length_m: p.plasma_max_length_m ?? CUSTOM_PLASMA_DEFAULTS.max_length_m,
    };
  }
  return PLASMA_PRESETS[p.plasma_preset] ?? PLASMA_PRESETS.uniform;
}

function temporalConfig(p: SimulatorParams) {
  return {
    beta_temp: p.temporal_beta_temp ?? TEMPORAL_DEFAULTS.beta_temp,
    gamma_temp: p.temporal_gamma_temp ?? TEMPORAL_DEFAULTS.gamma_temp,
    beta_dens: p.temporal_beta_dens ?? TEMPORAL_DEFAULTS.beta_dens,
    gamma_dens: p.temporal_gamma_dens ?? TEMPORAL_DEFAULTS.gamma_dens,
    expansion_tau_ns: p.temporal_expansion_tau_ns ?? TEMPORAL_DEFAULTS.expansion_tau_ns,
    ...TIME_OF_HIGHEST,
  };
}

function staticPayload(p: SimulatorParams, grid?: number[]) {
  const proportions = p.elements.map((el) => p.proportions?.[el] ?? 1 / p.elements.length);
  return {
    elements: p.elements,
    proportions,
    temperature_ev: p.te_ev,
    ne_cm3: p.ne_cm3,
    resolution_nm: p.resolution_nm,
    fwhm_nm: p.fwhm_nm,
    instrument_profile: p.instrument_profile,
    range_min_nm: p.range_min_nm,
    range_max_nm: p.range_max_nm,
    plasma_config: plasmaConfig(p),
    ...(grid ? { output_wavelengths_nm: grid } : {}),
  };
}

function exposurePayload(p: SimulatorParams, grid?: number[]) {
  return {
    ...staticPayload(p, grid),
    integration_time_s: p.integration_time_s ?? EXPOSURE_DEFAULTS.integration_time_s,
    time_resolution_s: p.time_resolution_s ?? EXPOSURE_DEFAULTS.time_resolution_s,
    temporal_config: temporalConfig(p),
  };
}

/** Forms the Compute request for a configuration: the payload to send and the
 * query key that identifies it. The single place that owns mode rules, payload
 * shape, and query-key identity. */
export function computeRequest(params: SimulatorParams, grid?: number[]) {
  const queryKey = ["spectrum", params, grid ?? null] as const;
  return params.mode === "static"
    ? { kind: "static" as const, payload: staticPayload(params, grid), queryKey }
    : { kind: "exposure" as const, payload: exposurePayload(params, grid), queryKey };
}
