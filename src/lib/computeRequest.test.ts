import { describe, it, expect } from "vitest";
import { computeRequest } from "./computeRequest";
import { DEFAULTS, EXPOSURE_DEFAULTS, setPlasmaPreset } from "./simulatorParams";

describe("computeRequest", () => {
  it("forms a static request with proportions ordered to match elements", () => {
    const p = {
      ...DEFAULTS,
      mode: "static" as const,
      elements: ["Ni", "Fe"],
      proportions: { Ni: 0.7, Fe: 0.3 },
    };
    const req = computeRequest(p);
    expect(req.kind).toBe("static");
    expect(req.payload.elements).toEqual(["Ni", "Fe"]);
    expect(req.payload.proportions).toEqual([0.7, 0.3]);
  });

  it("forms an exposure request for dynamic/3d with time fields and temporal config", () => {
    for (const mode of ["dynamic", "3d"] as const) {
      const p = { ...DEFAULTS, mode, elements: ["Ni"], proportions: { Ni: 1 } };
      const req = computeRequest(p);
      expect(req.kind, mode).toBe("exposure");
      expect(req.payload).toHaveProperty("integration_time_s");
      expect(req.payload).toHaveProperty("time_resolution_s");
      expect(req.payload).toHaveProperty("temporal_config");
    }
  });

  it("keys identical configurations the same and different ones apart, including the grid", () => {
    const a = { ...DEFAULTS, elements: ["Ni"], proportions: { Ni: 1 } };
    const b = { ...DEFAULTS, elements: ["Fe"], proportions: { Fe: 1 } };
    expect(computeRequest(a).queryKey).toEqual(computeRequest(a).queryKey);
    expect(computeRequest(a).queryKey).not.toEqual(computeRequest(b).queryKey);
    expect(computeRequest(a, [400, 401]).queryKey).not.toEqual(computeRequest(a).queryKey);
  });

  it("maps named plasma presets into plasma_config", () => {
    expect(computeRequest(DEFAULTS).payload.plasma_config).toMatchObject({
      number_of_layers: 1,
      Te_layer_ratio: 1.0,
    });
    expect(
      computeRequest({ ...DEFAULTS, plasma_preset: "weak" }).payload.plasma_config,
    ).toMatchObject({
      number_of_layers: 2,
      Te_layer_ratio: 0.95,
    });
  });

  it("fills custom plasma_config from the params", () => {
    const p = setPlasmaPreset({ ...DEFAULTS }, "custom");
    const cfg = computeRequest(p).payload.plasma_config;
    expect(cfg.number_of_layers).toBe(p.plasma_layers);
    expect(cfg.Te_layer_ratio).toBe(p.plasma_te_ratio);
  });

  it("includes the output wavelength grid only when provided", () => {
    expect(computeRequest(DEFAULTS).payload).not.toHaveProperty("output_wavelengths_nm");
    expect(computeRequest(DEFAULTS, [400, 401]).payload).toHaveProperty(
      "output_wavelengths_nm",
      [400, 401],
    );
  });

  it("fills exposure time defaults from the single source when params omit them", () => {
    const req = computeRequest({ ...DEFAULTS, mode: "dynamic" });
    expect(req.payload).toMatchObject({
      integration_time_s: EXPOSURE_DEFAULTS.integration_time_s,
      time_resolution_s: EXPOSURE_DEFAULTS.time_resolution_s,
    });
  });

  it("applies temporal decay params independent of the plasma preset", () => {
    const req = computeRequest({
      ...DEFAULTS,
      mode: "dynamic",
      plasma_preset: "uniform",
      temporal_beta_temp: 0.01,
      temporal_gamma_temp: 0.5,
      temporal_beta_dens: 0.02,
      temporal_gamma_dens: 3,
      temporal_expansion_tau_ns: 1200,
    });
    expect(req.kind).toBe("exposure");
    if (req.kind !== "exposure") throw new Error("Expected exposure request");
    expect(req.payload.temporal_config).toMatchObject({
      beta_temp: 0.01,
      gamma_temp: 0.5,
      beta_dens: 0.02,
      gamma_dens: 3,
      expansion_tau_ns: 1200,
    });
  });
});
