import type { SimulatorParams } from "@/lib/simulatorParams";
import { SectionLabel } from "./SectionLabel";
import { HELP_TEXT } from "@/lib/helpText";

const MODES = [
  { value: "static", label: "Static", title: "Static Spectrum" },
  { value: "dynamic", label: "Time slider", title: "Dynamic Time Slider" },
  { value: "3d", label: "3D surface", title: "3D Evolution Surface" },
] as const;

interface Props {
  mode: SimulatorParams["mode"];
  onChange: (mode: SimulatorParams["mode"]) => void;
}

export function ModeSelector({ mode, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel info={HELP_TEXT.type}>Type</SectionLabel>
      <div className="flex items-center gap-0.5 rounded bg-muted p-0.5">
        {MODES.map(({ value, label, title }) => (
          <button
            key={value}
            type="button"
            title={title}
            onClick={() => onChange(value)}
            aria-pressed={mode === value}
            className={[
              "flex-1 whitespace-nowrap rounded px-3 py-1 text-data-sm transition-all",
              mode === value
                ? "bg-background text-foreground font-semibold shadow-sm"
                : "text-foreground/60 font-medium hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
