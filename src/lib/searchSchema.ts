import { z } from "zod";

export const simulatorSearchSchema = z.object({
  mode: z.enum(["static", "dynamic", "3d"]).default("static"),
  elements: z.array(z.string()).default([]),
  proportions: z.record(z.string(), z.coerce.number()).default({}),
  te_ev: z.coerce.number().default(1.0),
  ne_cm3: z.coerce.number().default(1e17),
  range_min_nm: z.coerce.number().default(200),
  range_max_nm: z.coerce.number().default(500),
  resolution_nm: z.coerce.number().default(0.2),
  fwhm_nm: z.coerce.number().default(0.1),
  instrument_profile: z.enum(["gaussian", "lorentzian"]).default("gaussian"),
  plasma_preset: z.enum(["uniform", "weak", "strong", "custom"]).default("uniform"),
  // custom plasma — optional, only present when preset === "custom"
  plasma_layers: z.coerce.number().optional(),
  plasma_te_ratio: z.coerce.number().optional(),
  plasma_ne_ratio: z.coerce.number().optional(),
  plasma_length_proportion: z.coerce.number().optional(),
  plasma_max_length_m: z.coerce.number().optional(),
  // temporal decay — optional
  temporal_beta_temp: z.coerce.number().optional(),
  temporal_gamma_temp: z.coerce.number().optional(),
  temporal_beta_dens: z.coerce.number().optional(),
  temporal_gamma_dens: z.coerce.number().optional(),
  temporal_expansion_tau_ns: z.coerce.number().optional(),
  // dynamic/3d only
  integration_time_s: z.coerce.number().optional(),
  time_resolution_s: z.coerce.number().optional(),
});

export type SimulatorSearch = z.infer<typeof simulatorSearchSchema>;
