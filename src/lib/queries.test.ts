import { describe, it, expect, vi, beforeEach } from "vitest";

vi.stubEnv("VITE_API_BASE", "http://test-api");
vi.stubEnv("VITE_API_TOKEN", "test-token-123");

const { spectrumQuery, elementsQuery } = await import("./queries");
const { DEFAULTS } = await import("./simulatorParams");

const call = (fn: unknown) => (fn as () => Promise<unknown>)();

describe("spectrumQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("computes a static spectrum via /v1/spectra/static", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ wls: [] }), { status: 200 }));
    const params = {
      ...DEFAULTS,
      mode: "static" as const,
      elements: ["Ni"],
      proportions: { Ni: 1 },
    };
    await call(spectrumQuery(params).queryFn);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://test-api/v1/spectra/static",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("computes dynamic and 3d spectra via /v1/spectra/exposure", async () => {
    for (const mode of ["dynamic", "3d"] as const) {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(JSON.stringify({ wls: [] }), { status: 200 }));
      await call(
        spectrumQuery({ ...DEFAULTS, mode, elements: ["Ni"], proportions: { Ni: 1 } }).queryFn,
      );
      expect(fetchSpy, mode).toHaveBeenCalledWith(
        "http://test-api/v1/spectra/exposure",
        expect.objectContaining({ method: "POST" }),
      );
      vi.restoreAllMocks();
    }
  });

  it("keys identical configurations the same and different ones apart", () => {
    const a = { ...DEFAULTS, elements: ["Ni"], proportions: { Ni: 1 } };
    const b = { ...DEFAULTS, elements: ["Fe"], proportions: { Fe: 1 } };
    expect(spectrumQuery(a).queryKey).toEqual(spectrumQuery(a).queryKey);
    expect(spectrumQuery(a).queryKey).not.toEqual(spectrumQuery(b).queryKey);
  });

  it("includes the output wavelength grid in the key", () => {
    const p = { ...DEFAULTS, elements: ["Ni"], proportions: { Ni: 1 } };
    expect(spectrumQuery(p, [400, 401]).queryKey).not.toEqual(spectrumQuery(p).queryKey);
  });
});

describe("elementsQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the elements list under a stable key", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ elements: ["Ni"] }), { status: 200 }));
    expect(elementsQuery().queryKey).toEqual(["elements"]);
    await call(elementsQuery().queryFn);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://test-api/v1/spectra/elements?with_lines=true",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token-123" }),
      }),
    );
  });
});
