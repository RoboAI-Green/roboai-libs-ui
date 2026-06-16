import { NumberField } from "@/components/ui/number-field";
import { MAX_WAVELENGTH_POINTS } from "@/lib/simulatorParams";
import { FieldWarnings } from "./FieldWarnings";
import { PythonClientLink } from "./PythonClientLink";

interface Props {
  min: number;
  max: number;
  resolution: number;
  disabled: boolean;
  warnings?: string[];
  onChange: (min: number, max: number) => void;
  onResolutionChange: (v: number) => void;
}

const INPUT_CLASS =
  "w-full font-mono tabular-nums text-data-base text-right border border-border rounded px-2 py-1 disabled:opacity-40 bg-background [&::-webkit-inner-spin-button]:ml-2";

export function WavelengthRange({
  min,
  max,
  resolution,
  disabled,
  warnings = [],
  onChange,
  onResolutionChange,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-data-sm font-medium text-muted-foreground uppercase tracking-wider">
        Wavelength (nm)
      </p>
      <div className="flex items-center gap-2">
        <NumberField
          min={100}
          max={1999}
          value={min}
          disabled={disabled}
          aria-label="wavelength min"
          onCommit={(v) => onChange(v, max)}
          className={INPUT_CLASS}
        />
        <span className="text-muted-foreground text-data-sm">–</span>
        <NumberField
          min={101}
          max={2000}
          value={max}
          disabled={disabled}
          aria-label="wavelength max"
          onCommit={(v) => onChange(min, v)}
          className={INPUT_CLASS}
        />
      </div>
      <p className="text-data-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">
        Resolution (nm)
      </p>
      <NumberField
        step={0.001}
        min={0.0001}
        max={1}
        value={resolution}
        disabled={disabled}
        aria-label="resolution"
        onCommit={onResolutionChange}
        className={INPUT_CLASS}
      />
      <FieldWarnings
        warnings={warnings}
        hint={
          <>
            Want a finer grid? Up to {MAX_WAVELENGTH_POINTS.toLocaleString()} points are available
            with the <PythonClientLink />.
          </>
        }
      />
    </div>
  );
}
