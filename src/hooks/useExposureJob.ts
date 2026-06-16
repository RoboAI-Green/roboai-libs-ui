import { useEffect, useRef, useState } from "react";
import type { ExposureResult } from "@/components/charts/DynamicPanel";
import { cancelJob } from "@/lib/api";
import {
  ExposureCancelledError,
  reconnectExposureJob,
  runExposureJob,
  type ExposureSurface,
} from "@/lib/exposureJob";

// Remembers the in-flight/last Job per run identity, so a view remount reconnects
// (and the server replays from the first batch, ADR-0016 D10) instead of
// resubmitting. Failed/cancelled runs are dropped so the next Run resubmits.
const jobRegistry = new Map<string, string>();

/** Test-only: reset the reconnect registry between cases. */
export function clearJobRegistry(): void {
  jobRegistry.clear();
}

export type ExposureJobStatus = "streaming" | "completed" | "failed" | "cancelled";

export interface ExposureJobState {
  status: ExposureJobStatus;
  preview: ExposureResult | null;
  surface: ExposureSurface | null;
  result: ExposureResult | null;
  error: Error | null;
  cancelReason: string | null;
  progress: { done: number; total: number | null };
  jobId: string | null;
  cancel: () => void;
}

/**
 * Drive one exposure as an async Job (ADR-0015): submit, stream the surface,
 * poll the summary, exposed as React state. Re-runs when the payload identity
 * changes; aborting on cleanup lets the server's disconnect grace handle it.
 * Static spectra do NOT use this — they stay on the synchronous Suspense query.
 */
export function useExposureJob(payload: unknown): ExposureJobState {
  const key = JSON.stringify(payload);
  const [state, setState] = useState<Omit<ExposureJobState, "cancel" | "jobId">>({
    status: "streaming",
    preview: null,
    surface: null,
    result: null,
    error: null,
    cancelReason: null,
    progress: { done: 0, total: null },
  });
  const jobIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    jobIdRef.current = null;
    let live = true;
    setState({
      status: "streaming",
      preview: null,
      surface: null,
      result: null,
      error: null,
      cancelReason: null,
      progress: { done: 0, total: null },
    });

    const callbacks = {
      signal: controller.signal,
      onBatch: (surface: ExposureSurface) => {
        if (live) setState((s) => ({ ...s, surface: { ...surface } }));
      },
      onProgress: (status: { slices_done?: number | null; slices_total?: number | null }) => {
        if (live)
          setState((s) => ({
            ...s,
            progress: { done: status.slices_done ?? 0, total: status.slices_total ?? null },
          }));
      },
    };

    // Reconnect to a known Job for this run identity (replays), else submit a new
    // one and remember it.
    const existing = jobRegistry.get(key);
    const run = existing
      ? ((jobIdRef.current = existing), reconnectExposureJob(existing, callbacks))
      : runExposureJob(payload, {
          ...callbacks,
          onSubmit: ({ jobId, preview }) => {
            jobIdRef.current = jobId;
            jobRegistry.set(key, jobId);
            if (live) setState((s) => ({ ...s, preview }));
          },
        });

    run
      .then((result) => {
        if (live) setState((s) => ({ ...s, result, status: "completed" }));
      })
      .catch((err: unknown) => {
        if (!live || controller.signal.aborted) return;
        if (err instanceof ExposureCancelledError) {
          jobRegistry.delete(key);
          setState((s) => ({ ...s, status: "cancelled", cancelReason: err.reason }));
          return;
        }
        jobRegistry.delete(key); // let the next Run resubmit after a failure
        const error = err instanceof Error ? err : new Error(String(err));
        setState((s) => ({ ...s, error, status: "failed" }));
      });

    return () => {
      live = false;
      controller.abort();
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = () => {
    abortRef.current?.abort();
    jobRegistry.delete(key); // a re-run after cancel should resubmit, not replay
    if (jobIdRef.current) void cancelJob(jobIdRef.current).catch(() => {});
    setState((s) => ({ ...s, status: "cancelled", cancelReason: "client_requested" }));
  };

  return { ...state, cancel, jobId: jobIdRef.current };
}
