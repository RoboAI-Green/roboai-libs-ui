import { RecordBatchReader } from "apache-arrow";
import type { ExposureResult } from "@/components/charts/DynamicPanel";
import { openExposureStream, pollJob, submitExposureJob, type JobStatusResponse } from "./api";

/** The progressively-built snapshot surface decoded from the Arrow stream. */
export interface ExposureSurface {
  wls: number[];
  time_vector: number[];
  snapshot_matrix: number[][];
  /** Raw Arrow schema metadata (wls, core_info SBOM, fwhm, params) for provenance. */
  metadata: Record<string, string>;
}

const TERMINAL = new Set(["completed", "failed", "cancelled", "expired"]);

/** Thrown when a Job ends cancelled, carrying the structured reason (ADR-0016). */
export class ExposureCancelledError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`Exposure Job cancelled (${reason})`);
    this.name = "ExposureCancelledError";
    this.reason = reason;
  }
}

/**
 * Decode the Arrow IPC stream into the snapshot surface: one row per record-batch
 * row (time_s + spectrum), with the wavelength axis read from schema metadata.
 * `onBatch` (optional) is invoked after each batch with the surface-so-far, for
 * progressive rendering.
 */
export async function readExposureSurface(
  response: Response,
  onBatch?: (surface: ExposureSurface) => void,
): Promise<ExposureSurface> {
  if (!response.ok) throw new Error(`Stream failed: ${response.status}`);
  const reader = await (await RecordBatchReader.from(response)).open();
  const metadata = Object.fromEntries(reader.schema.metadata as Map<string, string>);
  const surface: ExposureSurface = {
    wls: metadata.wls ? (JSON.parse(metadata.wls) as number[]) : [],
    time_vector: [],
    snapshot_matrix: [],
    metadata,
  };
  for await (const batch of reader) {
    const times = batch.getChild("time_s");
    const spectra = batch.getChild("spectrum");
    if (!times || !spectra) continue;
    for (let i = 0; i < batch.numRows; i++) {
      surface.time_vector.push(Number(times.get(i)));
      surface.snapshot_matrix.push(Array.from(spectra.get(i) as ArrayLike<number>, Number));
    }
    onBatch?.(surface);
  }
  return surface;
}

const INITIAL_POLL_MS = 250;
const MAX_POLL_MS = 2000;

/**
 * Next status-poll delay, exponential backoff capped at a ceiling (#78). A fixed
 * fast interval spammed `GET /v1/jobs/{id}` for the whole life of a Job (~200
 * redundant polls on a slow line-rich Job); backing off keeps tiny Jobs snappy
 * while a long one settles to one poll every couple of seconds.
 */
export function nextPollInterval(currentMs: number, maxMs = MAX_POLL_MS, factor = 1.5): number {
  return Math.min(maxMs, Math.round(currentMs * factor));
}

async function pollUntilTerminal(
  jobId: string,
  signal: AbortSignal | undefined,
  onProgress: ((s: JobStatusResponse) => void) | undefined,
  initialMs = INITIAL_POLL_MS,
): Promise<JobStatusResponse> {
  let intervalMs = initialMs;
  for (;;) {
    const status = await pollJob(jobId, signal);
    onProgress?.(status);
    if (TERMINAL.has(status.status)) return status;
    await new Promise((r) => setTimeout(r, intervalMs));
    intervalMs = nextPollInterval(intervalMs);
  }
}

export interface RunExposureOptions {
  cancelOnDisconnect?: boolean;
  signal?: AbortSignal;
  onSubmit?: (info: { jobId: string; preview: ExposureResult | null }) => void;
  onBatch?: (surface: ExposureSurface) => void;
  onProgress?: (status: JobStatusResponse) => void;
}

/**
 * Run one exposure as an async Job (ADR-0015): submit, stream the display-capped
 * surface via Arrow IPC, poll for the final summary, and merge into a single
 * ExposureResult. The streamed snapshot surface and the polled summary
 * (total_exposure, te/ne/length, lines) together reproduce compute_exposure's
 * display output.
 */
export async function runExposureJob(
  payload: unknown,
  opts: RunExposureOptions = {},
): Promise<ExposureResult> {
  const submitted = await submitExposureJob(payload, opts.cancelOnDisconnect ?? true);
  const jobId = submitted.job_id;
  opts.onSubmit?.({ jobId, preview: (submitted.preview as ExposureResult) ?? null });
  return collectExposureResult(jobId, opts);
}

/**
 * Reconnect to an already-submitted Job (ADR-0016 D10): reopen the stream — which
 * replays from the first batch — and poll the summary. Used when the view remounts
 * or a completed Job is revisited; no new Job is submitted.
 */
export async function reconnectExposureJob(
  jobId: string,
  opts: RunExposureOptions = {},
): Promise<ExposureResult> {
  return collectExposureResult(jobId, opts);
}

async function collectExposureResult(
  jobId: string,
  opts: RunExposureOptions,
): Promise<ExposureResult> {
  // Live progress is derived from the Arrow stream — one record batch per slice
  // (#79) — counted against `slices_total` from the schema metadata. No polling
  // during compute. A failed Job may close the stream empty, so the terminal
  // status still comes from a poll; don't fail on stream read.
  let slicesDone = 0;
  const surface = await (async (): Promise<ExposureSurface | null> => {
    try {
      const response = await openExposureStream(jobId, opts.signal);
      return await readExposureSurface(response, (s) => {
        slicesDone += 1;
        const total = s.metadata.slices_total != null ? Number(s.metadata.slices_total) : null;
        opts.onProgress?.({
          job_id: jobId,
          status: "running",
          slices_done: slicesDone,
          slices_total: total,
        });
        opts.onBatch?.(s);
      });
    } catch {
      return null;
    }
  })();
  // Stream ended => the Job is terminal and its summary is persisted, so a single
  // poll is enough. Only when the stream couldn't be read do we fall back to the
  // backed-off poll loop (#78) to observe terminal status + cancel reason (#79).
  const status =
    surface !== null
      ? await pollJob(jobId, opts.signal)
      : await pollUntilTerminal(jobId, opts.signal, opts.onProgress);
  if (status.status === "failed") throw new Error(status.error ?? "Exposure Job failed");
  if (status.status === "cancelled")
    throw new ExposureCancelledError(status.cancel_reason ?? "unknown");

  const summary = (status.result ?? {}) as Partial<ExposureResult>;
  // Prefer the streamed surface; fall back to the summary (a complete capped
  // ExposureResult) if the stream couldn't be read.
  return {
    wls: surface?.wls ?? summary.wls ?? [],
    time_vector: surface?.time_vector ?? summary.time_vector ?? [],
    snapshot_matrix: surface?.snapshot_matrix ?? summary.snapshot_matrix ?? [],
    total_exposure: summary.total_exposure ?? [],
    te_vector: summary.te_vector ?? [],
    ne_vector: summary.ne_vector ?? [],
    length_vector: summary.length_vector,
    lines: summary.lines,
    fwhm_nm: summary.fwhm_nm,
    instrument_profile: summary.instrument_profile,
  };
}
