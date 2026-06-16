import { useEffect, type Ref } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { elementsQuery } from "@/lib/queries";
import {
  addElement,
  removeElement,
  setProportion,
  setRange,
  setPlasmaPreset,
  setMode,
  TEMPORAL_DEFAULTS,
} from "@/lib/simulatorParams";
import type { SimulatorParams } from "@/lib/simulatorParams";
import { ModeSelector } from "@/components/simulator/ModeSelector";
import { TemporalParams } from "@/components/simulator/TemporalParams";
import { ElementSelector } from "@/components/simulator/ElementSelector";
import { WavelengthRange } from "@/components/simulator/WavelengthRange";
import { WavelengthGridUpload } from "@/components/simulator/WavelengthGridUpload";
import { PlasmaModel } from "@/components/simulator/PlasmaModel";
import { InstrumentBroadening } from "@/components/simulator/InstrumentBroadening";
import { RunButton } from "@/components/simulator/RunButton";
import { useSessionStore } from "@/stores/sessionStore";
import type { RunGuard } from "@/lib/runGuards";
import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

interface Props {
  params: SimulatorParams;
  update: (fn: (p: SimulatorParams) => SimulatorParams) => void;
  onRun: () => void;
  onReset: () => void;
  isPending: boolean;
  runGuard: RunGuard;
  runButtonRef?: Ref<HTMLButtonElement>;
}

export function Sidebar({
  params,
  update,
  onRun,
  onReset,
  isPending,
  runGuard,
  runButtonRef,
}: Props) {
  const { data, error } = useQuery(elementsQuery());
  const elementOptions = data?.elements ?? [];

  useEffect(() => {
    if (error) toast.error(`Failed to load elements: ${error.message}`);
  }, [error]);
  const wavelengthGrid = useSessionStore((s) => s.wavelengthGrid);
  // An uploaded grid disables the range/resolution inputs and drives the point
  // count itself, so its over-limit warning belongs by the grid control, not by
  // the disabled inputs (which would read as if the top section errored).
  const gridUploaded = wavelengthGrid !== null;

  return (
    <aside className="w-72 min-w-72 h-full border-r border-border bg-muted/20 flex flex-col">
      <div className="px-4 border-b border-border bg-muted/20 flex items-center gap-2.5 h-[57px]">
        <a
          href={import.meta.env.BASE_URL}
          title="Start a fresh session"
          onClick={(e) => {
            // Confirm so an accidental click can't discard the current session.
            if (
              !window.confirm(
                "Start a fresh session? This clears the current parameters and result.",
              )
            ) {
              e.preventDefault();
            }
          }}
          className="size-8 rounded bg-primary/10 flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
        >
          <img
            src="/logo.webp"
            alt="RoboAI"
            className="size-5 aspect-square object-contain dark:brightness-0 dark:invert dark:opacity-90"
          />
        </a>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-primary/90 uppercase tracking-wider leading-none mb-0.5">
            RoboAI
          </p>
          <h1 className="text-data-base font-semibold leading-none">LIBS Spectrum Simulator</h1>
        </div>
        <Link
          to="/documentation"
          title="Documentation"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <BookOpen className="size-4 mt-0.5" />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4">
        <ModeSelector mode={params.mode} onChange={(mode) => update((p) => setMode(p, mode))} />

        <ElementSelector
          elements={params.elements}
          proportions={params.proportions}
          elementOptions={elementOptions}
          onAdd={(el) => update((p) => addElement(p, el))}
          onRemove={(el) => update((p) => removeElement(p, el))}
          onProportionChange={(el, v) => update((p) => setProportion(p, el, v))}
        />

        <WavelengthRange
          min={params.range_min_nm}
          max={params.range_max_nm}
          resolution={params.resolution_nm}
          disabled={gridUploaded}
          warnings={gridUploaded ? [] : runGuard.wavelengthBlockers}
          onChange={(min, max) => update((p) => setRange(p, min, max))}
          onResolutionChange={(v) => update((p) => ({ ...p, resolution_nm: v }))}
        />

        <WavelengthGridUpload warnings={gridUploaded ? runGuard.wavelengthBlockers : []} />

        <InstrumentBroadening
          fwhm={params.fwhm_nm}
          profile={params.instrument_profile}
          onFwhmChange={(v) => update((p) => ({ ...p, fwhm_nm: v }))}
          onProfileChange={(v) => update((p) => ({ ...p, instrument_profile: v }))}
        />

        <PlasmaModel
          params={params}
          onChange={(key, value) => update((p) => ({ ...p, [key]: value }))}
          onPresetChange={(preset) => update((p) => setPlasmaPreset(p, preset))}
        />

        {(params.mode === "dynamic" || params.mode === "3d") && (
          <TemporalParams
            integrationTimeS={params.integration_time_s ?? 10e-6}
            timeResolutionS={params.time_resolution_s ?? 20e-9}
            showDecayParams
            betaTemp={params.temporal_beta_temp ?? TEMPORAL_DEFAULTS.beta_temp}
            gammaTemp={params.temporal_gamma_temp ?? TEMPORAL_DEFAULTS.gamma_temp}
            betaDens={params.temporal_beta_dens ?? TEMPORAL_DEFAULTS.beta_dens}
            gammaDens={params.temporal_gamma_dens ?? TEMPORAL_DEFAULTS.gamma_dens}
            expansionTauNs={params.temporal_expansion_tau_ns ?? TEMPORAL_DEFAULTS.expansion_tau_ns}
            warnings={runGuard.timeBlockers}
            onIntegrationChange={(v) => update((p) => ({ ...p, integration_time_s: v }))}
            onResolutionChange={(v) => update((p) => ({ ...p, time_resolution_s: v }))}
            onDecayChange={(key, value) => update((p) => ({ ...p, [key]: value }))}
          />
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-border">
        <RunButton
          onRun={onRun}
          onReset={onReset}
          isPending={isPending}
          disabled={!runGuard.canRun}
          runRef={runButtonRef}
        />
      </div>
    </aside>
  );
}
