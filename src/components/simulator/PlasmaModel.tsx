import { ChevronDown } from "lucide-react";
import type { SimulatorParams } from "@/lib/simulatorParams";
import { SectionLabel } from "./SectionLabel";
import { HELP_TEXT } from "@/lib/helpText";
import { rangeFillStyle } from "@/lib/utils";
import { NumberField } from "@/components/ui/number-field";

const PRESETS = [
  { value: "uniform", label: "Uniform", title: "Uniform Plasma" },
  { value: "weak", label: "Weak", title: "Weak Gradient" },
  { value: "strong", label: "Strong", title: "Strong Gradient" },
  { value: "custom", label: "Custom", title: "Custom Profile" },
] as const;

const NE_OPTIONS = [1e15, 5e15, 1e16, 5e16, 1e17, 5e17, 1e18, 5e18, 1e19];

interface Props {
  params: SimulatorParams;
  onChange: (key: keyof SimulatorParams, value: number | string) => void;
  onPresetChange: (preset: SimulatorParams["plasma_preset"]) => void;
}

export function PlasmaModel({ params, onChange, onPresetChange }: Props) {
  const isDynamic = params.mode === "dynamic" || params.mode === "3d";
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel info={isDynamic ? HELP_TEXT.teDynamic : HELP_TEXT.teStatic}>
        Te (eV)
      </SectionLabel>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.1}
          value={params.te_ev}
          aria-label="Te"
          tabIndex={-1}
          onChange={(e) => onChange("te_ev", parseFloat(e.target.value))}
          style={rangeFillStyle(params.te_ev, 0.1, 5)}
          className="flex-1"
        />
        <input
          type="number"
          min={0.1}
          max={5}
          step={0.1}
          value={params.te_ev.toFixed(1)}
          aria-label="Te value"
          onChange={(e) => onChange("te_ev", parseFloat(e.target.value))}
          className="w-20 font-mono tabular-nums text-data-base text-right border border-border rounded px-2 py-1 bg-background [&::-webkit-inner-spin-button]:ml-2"
        />
      </div>

      <p className="text-data-sm font-medium text-muted-foreground uppercase tracking-wider">
        Ne (cm⁻³)
      </p>
      <div className="relative">
        <select
          aria-label="Ne (cm⁻³)"
          value={params.ne_cm3}
          onChange={(e) => onChange("ne_cm3", parseFloat(e.target.value))}
          className="w-full appearance-none text-data-base font-mono border border-border rounded px-2 pr-8 py-1 bg-background"
        >
          {NE_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v.toExponential(1)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      <SectionLabel info={HELP_TEXT.plasmaModel} className="mt-1">
        Plasma Model
      </SectionLabel>
      <div className="grid grid-cols-2 gap-0.5 rounded bg-muted p-0.5">
        {PRESETS.map(({ value, label, title }) => (
          <button
            key={value}
            type="button"
            title={title}
            onClick={() => onPresetChange(value)}
            aria-pressed={params.plasma_preset === value}
            className={[
              "whitespace-nowrap rounded-sm px-3 py-1 text-data-sm transition-all",
              params.plasma_preset === value
                ? "bg-background text-foreground font-semibold shadow-sm"
                : "text-foreground/60 font-medium hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {params.plasma_preset === "custom" && (
        <div className="border border-border rounded p-3 flex flex-col gap-2 bg-muted/20 text-data-sm">
          {[
            { key: "plasma_layers", label: "Layers", min: 1, max: 5, step: 1 },
            { key: "plasma_te_ratio", label: "Te layer ratio", min: 0.5, max: 1, step: 0.01 },
            { key: "plasma_ne_ratio", label: "Ne layer ratio", min: 0.5, max: 1, step: 0.01 },
            {
              key: "plasma_length_proportion",
              label: "Core length fraction",
              min: 0.1,
              max: 0.99,
              step: 0.01,
            },
          ].map(({ key, label, min, max, step }) => (
            <div key={key}>
              <label htmlFor={key} className="text-muted-foreground mb-0.5 block">
                {label}
              </label>
              <NumberField
                id={key}
                min={min}
                max={max}
                step={step}
                value={(params as unknown as Record<string, number>)[key] ?? 0}
                onCommit={(v) => onChange(key as keyof SimulatorParams, v)}
                className="w-full font-mono tabular-nums text-data-base text-right border border-border rounded px-2 py-1 bg-background [&::-webkit-inner-spin-button]:ml-2"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
