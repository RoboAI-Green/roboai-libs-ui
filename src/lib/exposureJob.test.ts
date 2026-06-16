import { describe, it, expect, vi, beforeEach } from "vitest";
import * as A from "apache-arrow";
import { tableToIPC, vectorFromArray, Float64, RecordBatchStreamWriter } from "apache-arrow";

vi.stubEnv("VITE_API_BASE", "http://test-api");
vi.stubEnv("VITE_API_TOKEN", "test-token");

const { readExposureSurface, runExposureJob, reconnectExposureJob, nextPollInterval } =
  await import("./exposureJob");

/** Build a server-shaped Arrow IPC stream: time_s + spectrum rows + wls metadata. */
function arrowStream(times: number[], spectra: number[][], wls: number[]): Uint8Array {
  const table = new A.Table({
    time_s: vectorFromArray(times, new Float64()),
    spectrum: vectorFromArray(spectra),
  });
  table.schema.metadata.set("wls", JSON.stringify(wls));
  table.schema.metadata.set("core_info", JSON.stringify({ version: "0.1.0" }));
  return tableToIPC(table, "stream");
}

/** Build a multi-batch Arrow stream — one record batch per slice — carrying the
 * `slices_total` denominator in schema metadata (#79). */
function arrowSlices(
  batches: { times: number[]; spectra: number[][] }[],
  wls: number[],
  slicesTotal: number,
): Uint8Array {
  const toBatch = (b: { times: number[]; spectra: number[][] }) =>
    new A.Table({
      time_s: vectorFromArray(b.times, new Float64()),
      spectrum: vectorFromArray(b.spectra),
    }).batches[0];
  const schema = toBatch(batches[0]).schema;
  schema.metadata.set("wls", JSON.stringify(wls));
  schema.metadata.set("slices_total", String(slicesTotal));
  const writer = new RecordBatchStreamWriter();
  writer.reset(undefined, schema);
  for (const b of batches) writer.write(toBatch(b));
  writer.close();
  return writer.toUint8Array(true);
}

/** A schema-only Arrow stream — opens and closes with zero batches, as a
 * cancelled/failed Job's stream may (#79). */
function arrowEmpty(wls: number[], slicesTotal: number): Uint8Array {
  const schema = new A.Table({
    time_s: vectorFromArray([0], new Float64()),
    spectrum: vectorFromArray([[0]]),
  }).batches[0].schema;
  schema.metadata.set("wls", JSON.stringify(wls));
  schema.metadata.set("slices_total", String(slicesTotal));
  const writer = new RecordBatchStreamWriter();
  writer.reset(undefined, schema);
  writer.close();
  return writer.toUint8Array(true);
}

const toBody = (bytes: Uint8Array): BodyInit => bytes as unknown as BodyInit;

describe("nextPollInterval", () => {
  it("backs off from a snappy start toward a 2s ceiling", () => {
    // Snappy at first so tiny Jobs still feel instant, then ramps up so a slow
    // line-rich Job doesn't spam GET /v1/jobs/{id} (#78).
    const seq: number[] = [];
    let ms = 250;
    for (let i = 0; i < 8; i++) {
      seq.push(ms);
      ms = nextPollInterval(ms);
    }
    expect(seq[0]).toBe(250);
    expect(seq[1]).toBeGreaterThan(seq[0]); // grows
    expect(Math.max(...seq)).toBeLessThanOrEqual(2000); // never above the ceiling
    expect(seq[seq.length - 1]).toBe(2000); // and settles there
  });
});

describe("readExposureSurface", () => {
  it("decodes time_s, spectrum rows, and the wls axis from schema metadata", async () => {
    const bytes = arrowStream(
      [0.0, 0.5],
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
      [400, 401, 402],
    );
    const surface = await readExposureSurface(new Response(toBody(bytes)));
    expect(surface.wls).toEqual([400, 401, 402]);
    expect(surface.time_vector).toEqual([0.0, 0.5]);
    expect(surface.snapshot_matrix).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it("captures the schema metadata (core_info etc.) for provenance", async () => {
    const bytes = arrowStream([0.0], [[1, 2, 3]], [400, 401, 402]);
    const surface = await readExposureSurface(new Response(toBody(bytes)));
    expect(surface.metadata?.core_info).toBe(JSON.stringify({ version: "0.1.0" }));
  });
});

describe("runExposureJob", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("submits, streams the surface, polls the summary, and merges an ExposureResult", async () => {
    const preview = {
      wls: [400],
      total_exposure: [0.05],
      snapshot_matrix: [[0.05]],
      time_vector: [0],
      te_vector: [1],
      ne_vector: [1e17],
    };
    const stream = arrowStream(
      [0.0, 0.5],
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
      [400, 401, 402],
    );
    const summary = {
      job_id: "j1",
      status: "completed",
      slices_done: 2,
      slices_total: 2,
      result: {
        wls: [400, 401, 402],
        total_exposure: [9, 8, 7],
        snapshot_matrix: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        time_vector: [0.0, 0.5],
        te_vector: [1.0, 0.9],
        ne_vector: [1e17, 9e16],
        length_vector: [1e-3, 1e-3],
        lines: [],
        fwhm_nm: 0.0,
        instrument_profile: "gaussian",
      },
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      const method = (init?.method ?? "GET").toUpperCase();
      if (u.endsWith("/v1/spectra/exposure/jobs") && method === "POST")
        return new Response(JSON.stringify({ job_id: "j1", status: "queued", preview }), {
          status: 202,
        });
      if (u.endsWith("/v1/jobs/j1/stream"))
        return new Response(toBody(stream), {
          status: 200,
          headers: { "content-type": "application/vnd.apache.arrow.stream" },
        });
      // Stream ended => terminal; the single poll returns the completed summary (#79).
      if (u.endsWith("/v1/jobs/j1")) return new Response(JSON.stringify(summary), { status: 200 });
      throw new Error(`unexpected ${method} ${u}`);
    });

    const onSubmit = vi.fn();
    const result = await runExposureJob({ elements: ["H"] }, { onSubmit });

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ jobId: "j1" }));
    // surface comes from the stream
    expect(result.wls).toEqual([400, 401, 402]);
    expect(result.snapshot_matrix).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(result.time_vector).toEqual([0.0, 0.5]);
    // summary fields come from the poll result
    expect(result.total_exposure).toEqual([9, 8, 7]);
    expect(result.te_vector).toEqual([1.0, 0.9]);
    expect(result.lines).toEqual([]);
  });

  it("backs off the fallback poll loop so a long Job doesn't spam GET /v1/jobs/{id} (#78/#79)", async () => {
    // Under #79 the happy path is single-poll; the backed-off loop survives only
    // as the fallback when the stream can't be read. Make the stream fail so the
    // fallback engages, then assert its inter-poll gaps *grow* (the #78 fix) and
    // don't sit at a fixed interval spamming the endpoint.
    const running = { job_id: "j1", status: "running", slices_done: 1, slices_total: 6 };
    const done = { job_id: "j1", status: "completed", slices_done: 6, slices_total: 6, result: {} };

    let polls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/v1/jobs/j1/stream")) throw new Error("stream unavailable"); // forces the fallback
      if (u.endsWith("/v1/jobs/j1")) {
        polls += 1;
        return new Response(JSON.stringify(polls < 6 ? running : done), { status: 200 });
      }
      throw new Error(`unexpected ${u}`);
    });

    // Capture each sleep's delay while letting the loop proceed immediately, so
    // the test doesn't wait real seconds.
    const delays: number[] = [];
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void, ms?: number) => {
      delays.push(ms ?? 0);
      Promise.resolve().then(fn);
      return 0;
    }) as typeof setTimeout);

    await reconnectExposureJob("j1");

    expect(delays.length).toBeGreaterThanOrEqual(3); // five non-terminal polls
    expect(delays[0]).toBe(250); // snappy start
    expect(new Set(delays).size).toBeGreaterThan(1); // not a fixed interval — it ramps
    for (let i = 1; i < delays.length; i++) expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    expect(Math.max(...delays)).toBeLessThanOrEqual(2000); // capped at the ceiling
  });
});

describe("collectExposureResult — stream-driven progress (#79)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("derives live progress from stream batches: slices_done counts batches, total from metadata", async () => {
    // One record batch per slice; slices_total is the schema-metadata denominator.
    // The terminal poll carries NO slices counters, so progress reaching {2,2}
    // can only have come from the stream — not the poll.
    const stream = arrowSlices(
      [
        { times: [0.0], spectra: [[1, 2, 3]] },
        { times: [0.5], spectra: [[4, 5, 6]] },
      ],
      [400, 401, 402],
      2,
    );
    const summary = {
      job_id: "j1",
      status: "completed",
      result: { wls: [400, 401, 402], total_exposure: [9, 8, 7] },
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/v1/jobs/j1/stream")) return new Response(toBody(stream), { status: 200 });
      if (u.endsWith("/v1/jobs/j1")) return new Response(JSON.stringify(summary), { status: 200 });
      throw new Error(`unexpected ${u}`);
    });

    const progress: Array<{ done?: number | null; total?: number | null }> = [];
    await reconnectExposureJob("j1", {
      onProgress: (s) => progress.push({ done: s.slices_done, total: s.slices_total }),
    });

    expect(progress).toEqual([
      { done: 1, total: 2 },
      { done: 2, total: 2 },
    ]);
  });

  it("issues exactly one terminal status poll after the stream ends — never a loop", async () => {
    // The stream closing means the Job is terminal (server writes the summary
    // before marking terminal), so one GET suffices. A loop would poll again on a
    // non-terminal response; we must not. Poll returns `running` first to prove it.
    const stream = arrowSlices([{ times: [0.0], spectra: [[1]] }], [400], 1);
    let polls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/v1/jobs/j1/stream")) return new Response(toBody(stream), { status: 200 });
      if (u.endsWith("/v1/jobs/j1")) {
        polls += 1;
        const body =
          polls === 1
            ? { job_id: "j1", status: "running" }
            : { job_id: "j1", status: "completed", result: {} };
        return new Response(JSON.stringify(body), { status: 200 });
      }
      throw new Error(`unexpected ${u}`);
    });

    await reconnectExposureJob("j1");
    expect(polls).toBe(1);
  });

  it("surfaces a cancelled Job's reason from the terminal poll when the stream closed empty", async () => {
    // A cancelled Job may close its stream with no batches and no reason on the
    // stream — the single terminal poll is the source of truth for the reason.
    const stream = arrowEmpty([400], 1);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.endsWith("/v1/jobs/j1/stream")) return new Response(toBody(stream), { status: 200 });
      if (u.endsWith("/v1/jobs/j1"))
        return new Response(
          JSON.stringify({
            job_id: "j1",
            status: "cancelled",
            cancel_reason: "between_slice_timeout",
          }),
          { status: 200 },
        );
      throw new Error(`unexpected ${u}`);
    });

    await expect(reconnectExposureJob("j1")).rejects.toMatchObject({
      name: "ExposureCancelledError",
      reason: "between_slice_timeout",
    });
  });
});
