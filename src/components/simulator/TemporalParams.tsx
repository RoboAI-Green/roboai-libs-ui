import { NumberField } from "@/components/ui/number-field";
import { MAX_TIME_STEPS } from "@/lib/simulatorParams";
import { FieldWarnings } from "./FieldWarnings";
import { PythonClientLink } from "./PythonClientLink";

type DecayKey =
  | "temporal_beta_temp"
  | "temporal_gamma_temp"
  | "temporal_beta_dens"
  | "temporal_gamma_dens"
  | "temporal_expansion_tau_ns";

interface Props {
  integrationTimeS: number;
  timeResolutionS: number;
  showDecayParams?: boolean;
  betaTemp?: number;
  gammaTemp?: number;
  betaDens?: number;
  gammaDens?: number;
  expansionTauNs?: number;
  warnings?: string[];
  onIntegrationChange: (v: number) => void;
  onResolutionChange: (v: number) => void;
  onDecayChange?: (key: DecayKey, value: number) => void;
}

export function TemporalParams({
  integrationTimeS,
  timeResolutionS,
  showDecayParams = false,
  betaTemp = 0.00233,
  gammaTemp = 0.24,
  betaDens = 0.005,
  gammaDens = 2.0,
  expansionTauNs = 800.0,
  warnings = [],
  onIntegrationChange,
  onResolutionChange,
  onDecayChange,
}: Props) {
  const decayFields = [
    {
      key: "temporal_beta_dens" as const,
      label: "Density β (ns⁻¹)",
      value: betaDens,
      min: 0,
      max: 1,
      step: 0.0001,
      format: (v: number) => String(v),
    },
    {
      key: "temporal_gamma_dens" as const,
      label: "Density γ",
      value: gammaDens,
      min: 0,
      max: 10,
      step: 0.05,
      format: (v: number) => String(v),
    },
    {
      key: "temporal_beta_temp" as const,
      label: "Temperature β (ns⁻¹)",
      value: betaTemp,
      min: 0,
      max: 1,
      step: 0.0001,
      format: (v: number) => String(v),
    },
    {
      key: "temporal_gamma_temp" as const,
      label: "Temperature γ",
      value: gammaTemp,
      min: 0,
      max: 10,
      step: 0.05,
      format: (v: number) => String(v),
    },
    {
      key: "temporal_expansion_tau_ns" as const,
      label: "Expansion τ (ns)",
      value: expansionTauNs,
      min: 1,
      max: 100000,
      step: 10,
      format: (v: number) => String(v),
    },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-data-sm font-medium text-muted-foreground uppercase tracking-wider">
        Temporal
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-data-sm text-muted-foreground">Total Time (µs)</label>
          <NumberField
            min={0.1}
            step={0.1}
            value={integrationTimeS * 1e6}
            format={(v) => v.toFixed(1)}
            aria-label="total time"
            onCommit={(v) => onIntegrationChange(v * 1e-6)}
            className="w-full font-mono tabular-nums text-data-base text-right border border-border rounded px-2 py-1 bg-background [&::-webkit-inner-spin-button]:ml-2"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-data-sm text-muted-foreground">Time Step (ns)</label>
          <NumberField
            min={1}
            step={1}
            value={timeResolutionS * 1e9}
            format={(v) => v.toFixed(0)}
            aria-label="time step"
            onCommit={(v) => onResolutionChange(v * 1e-9)}
            className="w-full font-mono tabular-nums text-data-base text-right border border-border rounded px-2 py-1 bg-background [&::-webkit-inner-spin-button]:ml-2"
          />
        </div>
      </div>
      <FieldWarnings
        warnings={warnings}
        hint={
          <>
            Want finer time resolution? Up to {MAX_TIME_STEPS.toLocaleString()} steps are available
            with the <PythonClientLink />.
          </>
        }
      />
      {showDecayParams && (
        <details className="mt-2 border border-border rounded bg-muted/20 text-data-sm">
          <summary className="cursor-pointer select-none px-3 py-2 text-data-sm font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground">
            Advanced
          </summary>
          <div className="border-t border-border px-3 py-3 flex flex-col gap-2">
            <p className="text-data-xs text-muted-foreground">
              Empirical plasma cooling controls for dynamic and 3D simulations.
            </p>
            <p className="text-data-xs text-muted-foreground">
              Defaults are starting values fitted from representative time-resolved copper LIBS
              data, not universal constants; adjust them to simulate specific experimental
              conditions.
            </p>
            <p className="text-data-xs text-muted-foreground">T, Ne = α₀ / (β·t_ns + 1)^γ</p>
            {decayFields.map(({ key, label, value, min, max, step, format }) => (
              <div key={key}>
                <label htmlFor={key} className="text-muted-foreground mb-0.5 block">
                  {label}
                </label>
                <NumberField
                  id={key}
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  format={format}
                  onCommit={(v) => onDecayChange?.(key, v)}
                  className="w-full font-mono tabular-nums text-data-base text-right border border-border rounded px-2 py-1 bg-background [&::-webkit-inner-spin-button]:ml-2"
                />
              </div>
            ))}
            <p className="text-data-xs text-muted-foreground">
              Plasma expansion uses Lmax·(1-exp(-t/τ)).
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
