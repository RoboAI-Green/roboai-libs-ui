import { describe, it, expect, vi, beforeEach } from "vitest";

// Set env before importing api
vi.stubEnv("VITE_API_BASE", "http://test-api");
vi.stubEnv("VITE_API_TOKEN", "test-token-123");

const { fetchElements, fetchInfo, computeStatic, computeExposure, downloadJobResultHdf5 } =
  await import("./api");

describe("fetchInfo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the spectra info endpoint with the auth header", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ version: "0.1.0" }), { status: 200 }));
    await fetchInfo();
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://test-api/v1/spectra/info",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token-123" }),
      }),
    );
  });
});

describe("fetchElements", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends Authorization header with token", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ elements: ["Ni", "Fe"] }), { status: 200 }));
    await fetchElements();
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://test-api/v1/spectra/elements?with_lines=true",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token-123" }),
      }),
    );
  });

  it("throws with detail message on error response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid token" }), { status: 401 }),
    );
    await expect(fetchElements()).rejects.toThrow("Invalid token");
  });

  it("joins and de-duplicates array-shaped validation detail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ detail: [{ msg: "too low" }, { msg: "too high" }, { msg: "too low" }] }),
        { status: 422 },
      ),
    );
    await expect(fetchElements()).rejects.toThrow("too low; too high");
  });
});

describe("computeStatic", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to /v1/spectra/static with correct payload", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ wls: [], intensity: [], lines: [] }), { status: 200 }),
      );
    const payload = {
      elements: ["Ni"],
      proportions: [1.0],
      te_ev: 1.0,
      ne_cm3: 1e17,
      range_min_nm: 200,
      range_max_nm: 500,
      resolution_nm: 0.05,
      fwhm_nm: 0,
      instrument_profile: "gaussian",
      plasma_config: {
        number_of_layers: 1,
        Te_layer_ratio: 1.0,
        Ne_layer_ratio: 1.0,
        length_proportion: 1.0,
        max_length_m: 1e-3,
      },
    };
    await computeStatic(payload);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://test-api/v1/spectra/static",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws with detail message when a POST fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Bad payload" }), { status: 400 }),
    );
    await expect(computeStatic({})).rejects.toThrow("Bad payload");
  });
});

describe("computeExposure", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to /v1/spectra/exposure", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ wls: [] }), { status: 200 }));
    await computeExposure({});
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://test-api/v1/spectra/exposure",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("downloadJobResultHdf5", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetches the result with auth and triggers a file download", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(new Blob([new Uint8Array([1, 2, 3])]), { status: 200 }));
    URL.createObjectURL = vi.fn(() => "blob:x") as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await downloadJobResultHdf5("job_42");

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://test-api/v1/jobs/job_42/result",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token-123" }),
      }),
    );
    expect(clickSpy).toHaveBeenCalled();
  });

  it("throws with detail when the result is gone", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Result has expired" }), { status: 410 }),
    );
    await expect(downloadJobResultHdf5("job_42")).rejects.toThrow("Result has expired");
  });
});
