import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { simulatorSearchSchema } from "@/lib/searchSchema";
import { useSimulatorSession } from "@/hooks/useSimulatorSession";
import { elementsQuery } from "@/lib/queries";
import { Sidebar } from "@/components/layout/Sidebar";
import { EmptyState } from "@/components/simulator/EmptyState";
import { LoadingState } from "@/components/simulator/LoadingState";
import { SpectrumResult } from "@/components/simulator/SpectrumResult";
import { SpectrumErrorBoundary } from "@/components/simulator/SpectrumErrorBoundary";
import { useRunShortcut } from "@/hooks/useRunShortcut";

export const Route = createFileRoute("/")({
  validateSearch: simulatorSearchSchema,
  loader: ({ context }) => {
    // Warm the elements list as the page mounts (non-blocking).
    void context.queryClient.prefetchQuery(elementsQuery());
  },
  component: SimulatorPage,
});

function SimulatorPage() {
  const {
    params,
    update,
    reset,
    applyPreset,
    run,
    clearCommitted,
    committed,
    isPending,
    canRun,
    runGuard,
    runButtonRef,
  } = useSimulatorSession();

  useRunShortcut(canRun, run);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        params={params}
        update={update}
        onRun={run}
        onReset={reset}
        isPending={isPending}
        runGuard={runGuard}
        runButtonRef={runButtonRef}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-muted/30">
        <div className="flex-1 flex flex-col min-h-0">
          {committed === null ? (
            <EmptyState onApplyPreset={applyPreset} />
          ) : (
            <QueryErrorResetBoundary>
              {({ reset: resetBoundary }) => (
                <SpectrumErrorBoundary onReset={resetBoundary} resetKeys={[committed]}>
                  {/* Static is the only path that suspends here (exposure drives its
                      own StreamingState); it's near-instant, so no estimate. */}
                  <Suspense fallback={<LoadingState />}>
                    <SpectrumResult
                      params={committed.params}
                      grid={committed.grid}
                      onCancelled={clearCommitted}
                    />
                  </Suspense>
                </SpectrumErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          )}
        </div>
      </main>
    </div>
  );
}
