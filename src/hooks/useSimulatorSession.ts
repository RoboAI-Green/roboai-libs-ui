import { useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { useSessionStore } from "@/stores/sessionStore";
import type { SimulatorParams } from "@/lib/simulatorParams";
import { evaluateRunGuard } from "@/lib/runGuards";
import { useSimulatorParams } from "./useSimulatorParams";

/** The configuration committed by the last Run — the spectrum query's input. */
interface CommittedRun {
  params: SimulatorParams;
  grid?: number[];
}

/** The Spectrum Simulator session: owns the run lifecycle (URL params, run
 * readiness, the committed run, presets, reset) so the route is a thin adapter. */
export function useSimulatorSession() {
  const { params, update, reset: resetParams } = useSimulatorParams();
  const wavelengthGrid = useSessionStore((s) => s.wavelengthGrid);
  const [committed, setCommitted] = useState<CommittedRun | null>(null);
  const runButtonRef = useRef<HTMLButtonElement>(null);
  const isPending = useIsFetching({ queryKey: ["spectrum"] }) > 0;
  const runGuard = evaluateRunGuard(params, wavelengthGrid?.wavelengths_nm);
  const canRun = !isPending && runGuard.canRun;

  const run = () => {
    if (!runGuard.canRun) return;
    setCommitted({ params, grid: wavelengthGrid?.wavelengths_nm });
  };

  const reset = () => {
    resetParams();
    setCommitted(null);
  };

  /** Drop the committed run (back to the empty state) while keeping the sidebar
   * params, so a cancelled exposure can be adjusted and re-run. */
  const clearCommitted = () => setCommitted(null);

  const applyPreset = (next: SimulatorParams) => {
    update(() => next);
    requestAnimationFrame(() => runButtonRef.current?.focus());
  };

  return {
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
  };
}
