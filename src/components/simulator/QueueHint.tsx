import { InfoButton } from "@/components/ui/info-button";
import type { JobStatsResponse } from "@/lib/api";

interface Props {
  stats?: JobStatsResponse;
}

/**
 * A quiet footer line under the Cancel action (#97): overall server load, plus
 * the caller's own runs when they are actually paced (queued, or at the running
 * cap). The info icon carries the caveat that the server numbers are not a queue
 * position (dispatch is paced per user, not a global FIFO).
 *
 * The line (label + info icon) is rendered even before the first stats poll lands
 * — the numbers fill in place — so the waiting view never reflows when the counts
 * arrive or update.
 */
export function QueueHint({ stats }: Props) {
  const paced =
    stats != null && (stats.you.queued > 0 || stats.you.running >= stats.you.max_running);

  return (
    <div className="mt-4 border-t border-border/50 pt-2 flex items-center gap-2 text-data-xs text-muted-foreground">
      <span className="font-medium">Server load:</span>
      <span className="tabular-nums">
        {stats ? (
          <>
            {stats.system.queued} queued, {stats.system.running} running
            {paced &&
              ` · your runs: ${stats.you.running}/${stats.you.max_running} (${stats.you.queued} queued)`}
          </>
        ) : (
          "…"
        )}
      </span>
      <InfoButton
        info="Overall load across all users, not your position in line. Jobs are paced per user, so another user's queue does not delay yours."
        label="What the server numbers mean"
      />
    </div>
  );
}
