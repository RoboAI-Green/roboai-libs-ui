import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as A from "apache-arrow";
import { tableToIPC, vectorFromArray, Float64 } from "apache-arrow";

vi.stubEnv("VITE_API_BASE", "http://test-api");
vi.stubEnv("VITE_API_TOKEN", "test-token");

const { useExposureJob, clearJobRegistry } = await import("./useExposureJob");

function arrowStream(times: number[], spectra: number[][], wls: number[]): Uint8Array {
  const table = new A.Table({
    time_s: vectorFromArray(times, new Float64()),
    spectrum: vectorFromArray(spectra),
  });
  table.schema.metadata.set("wls", JSON.stringify(wls));
  return tableToIPC(table, "stream");
}

const toBody = (bytes: Uint8Array): BodyInit => bytes as unknown as BodyInit;

describe("useExposureJob", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearJobRegistry(); // isolate the per-run reconnect registry between tests
  });

  it("runs submit -> stream -> poll and ends completed with a merged result", async () => {
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
        lines: [],
      },
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/v1/spectra/exposure/jobs") && (init?.method ?? "GET") === "POST")
        return new Response(JSON.stringify({ job_id: "j1", status: "queued", preview: null }), {
          status: 202,
        });
      if (u.endsWith("/v1/jobs/j1/stream")) return new Response(toBody(stream), { status: 200 });
      if (u.endsWith("/v1/jobs/j1")) return new Response(JSON.stringify(summary), { status: 200 });
      throw new Error(`unexpected ${u}`);
    });

    const { result } = renderHook(() => useExposureJob({ elements: ["H"] }));

    await waitFor(() => expect(result.current.status).toBe("completed"));
    expect(result.current.result?.snapshot_matrix).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(result.current.result?.total_exposure).toEqual([9, 8, 7]);
    expect(result.current.error).toBeNull();
  });

  it("ends failed and surfaces the error when the Job fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/v1/spectra/exposure/jobs") && (init?.method ?? "GET") === "POST")
        return new Response(JSON.stringify({ job_id: "j2", status: "queued" }), { status: 202 });
      if (u.endsWith("/v1/jobs/j2/stream"))
        return new Response(toBody(new Uint8Array()), { status: 200 });
      if (u.endsWith("/v1/jobs/j2"))
        return new Response(JSON.stringify({ job_id: "j2", status: "failed", error: "boom" }), {
          status: 200,
        });
      throw new Error(`unexpected ${u}`);
    });

    const { result } = renderHook(() => useExposureJob({ elements: ["H"] }));
    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.error?.message).toContain("boom");
  });

  it("cancel() flags client_requested and issues DELETE", async () => {
    const deleteSpy = vi.fn();
    // Keep the stream pending so the Job stays running until we cancel.
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      const method = (init?.method ?? "GET").toUpperCase();
      if (u.endsWith("/v1/spectra/exposure/jobs") && method === "POST")
        return new Response(
          JSON.stringify({
            job_id: "j1",
            status: "queued",
            preview: { wls: [400], total_exposure: [] },
          }),
          { status: 202 },
        );
      if (u.endsWith("/v1/jobs/j1/stream")) return new Promise<Response>(() => {}); // never resolves
      if (u.endsWith("/v1/jobs/j1") && method === "DELETE") {
        deleteSpy();
        return new Response(null, { status: 204 });
      }
      throw new Error(`unexpected ${u}`);
    });

    const { result } = renderHook(() => useExposureJob({ elements: ["H"] }));
    await waitFor(() => expect(result.current.preview).not.toBeNull()); // submit landed -> jobId known
    act(() => result.current.cancel());

    await waitFor(() => expect(result.current.status).toBe("cancelled"));
    expect(result.current.cancelReason).toBe("client_requested");
    expect(deleteSpy).toHaveBeenCalled();
  });

  it("surfaces a server-side cancellation reason (e.g. policy_limit)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/v1/spectra/exposure/jobs") && (init?.method ?? "GET") === "POST")
        return new Response(JSON.stringify({ job_id: "j3", status: "queued" }), { status: 202 });
      if (u.endsWith("/v1/jobs/j3/stream"))
        return new Response(toBody(new Uint8Array()), { status: 200 });
      if (u.endsWith("/v1/jobs/j3"))
        return new Response(
          JSON.stringify({ job_id: "j3", status: "cancelled", cancel_reason: "policy_limit" }),
          { status: 200 },
        );
      throw new Error(`unexpected ${u}`);
    });

    const { result } = renderHook(() => useExposureJob({ elements: ["H"] }));
    await waitFor(() => expect(result.current.status).toBe("cancelled"));
    expect(result.current.cancelReason).toBe("policy_limit");
  });

  it("reconnects to the existing Job on remount instead of resubmitting", async () => {
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
        te_vector: [1, 1],
        ne_vector: [1e17, 1e17],
        lines: [],
      },
    };
    let posts = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      const method = (init?.method ?? "GET").toUpperCase();
      if (u.endsWith("/v1/spectra/exposure/jobs") && method === "POST") {
        posts += 1;
        return new Response(JSON.stringify({ job_id: "j1", status: "queued" }), { status: 202 });
      }
      if (u.endsWith("/v1/jobs/j1/stream")) return new Response(toBody(stream), { status: 200 });
      if (u.endsWith("/v1/jobs/j1")) return new Response(JSON.stringify(summary), { status: 200 });
      throw new Error(`unexpected ${u}`);
    });

    const payload = { elements: ["H"] };
    const first = renderHook(() => useExposureJob(payload));
    await waitFor(() => expect(first.result.current.status).toBe("completed"));
    first.unmount();

    // Remount with the same run identity → reconnect + replay, no new submit.
    const second = renderHook(() => useExposureJob(payload));
    await waitFor(() => expect(second.result.current.status).toBe("completed"));

    expect(posts).toBe(1);
    expect(second.result.current.result?.snapshot_matrix).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });
});
