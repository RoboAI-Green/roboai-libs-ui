import { LoadingState } from "./LoadingState";
import { PreviewSpectrum } from "./PreviewSpectrum";
import { QueueHint } from "./QueueHint";
import type { ExposureResult } from "@/components/charts/DynamicPanel";
import type { JobStatsResponse } from "@/lib/api";

interface Props {
  progress: { done: number; total: number | null };
  onCancel?: () => void;
  /** Coarse submit-time preview, if available (best-effort). */
  preview?: ExposureResult | null;
  /** Live Job queue counts (#97); undefined until the first poll lands. */
  stats?: JobStatsResponse;
}

/**
 * Live view while an exposure Job streams (ADR-0015 D7). The partially-painted
 * snapshot surface reads as "broken" until the very end (mostly-empty heatmap),
 * so instead of showing it we reuse the static LoadingState animation and report
 * progress as a slice counter. The full surface, Te/Ne evolution, and
 * total-exposure spectrum are final-only and appear in the full panel on
 * completion — not here.
 */
export function StreamingState({ progress, onCancel, preview, stats }: Props) {
  // The leading dot stays grey (inactive) until the slice numbers are known, then
  // turns primary and pulses. Only the counted number pulses on change: remounting
  // it on `done` (via key) replays the one-shot pulse each time a slice lands.
  const hasNumbers = progress.total != null;
  const counter = (
    <span className="font-semibold">
      {/* Always active: we're computing the first slice from the start (1/?). */}
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle animate-pulse" />
      calculating{" "}
      {hasNumbers ? (
        <>
          <span key={progress.done} className="animate-slice-pulse inline-block">
            {progress.done}
          </span>
          /{progress.total}
        </>
      ) : (
        // The total arrives with the first completed slice (it rides the stream
        // schema), so before then show "1/?" — we're on slice 1, total resolving —
        // which fills to "1/9" without the numerator jumping.
        "1/?"
      )}
    </span>
  );
  return (
    <LoadingState
      estimate={counter}
      onCancel={onCancel}
      spectrum={preview ? <PreviewSpectrum preview={preview} /> : undefined}
      footer={<QueueHint stats={stats} />}
    />
  );
}
