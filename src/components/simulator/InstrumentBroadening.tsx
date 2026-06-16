import { ChevronDown } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { HELP_TEXT } from "@/lib/helpText";
import { rangeFillStyle } from "@/lib/utils";
import { NumberField } from "@/components/ui/number-field";

interface Props {
  fwhm: number;
  profile: "gaussian" | "lorentzian";
  onFwhmChange: (v: number) => void;
  onProfileChange: (v: "gaussian" | "lorentzian") => void;
}

export function InstrumentBroadening({ fwhm, profile, onFwhmChange, onProfileChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel info={HELP_TEXT.fwhm}>Instrument FWHM (nm)</SectionLabel>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={fwhm}
          aria-label="FWHM"
          tabIndex={-1}
          onChange={(e) => onFwhmChange(parseFloat(e.target.value))}
          style={rangeFillStyle(fwhm, 0, 2)}
          className="flex-1"
        />
        <NumberField
          min={0}
          max={2}
          step={0.01}
          value={fwhm}
          format={(v) => v.toFixed(2)}
          aria-label="FWHM value"
          onCommit={onFwhmChange}
          className="w-20 font-mono tabular-nums text-data-base text-right border border-border rounded px-2 py-1 bg-background [&::-webkit-inner-spin-button]:ml-2"
        />
      </div>
      <SectionLabel info={HELP_TEXT.instrumentProfile} className="mt-1">
        Instrument profile
      </SectionLabel>
      <div className="relative">
        <select
          aria-label="Instrument profile"
          value={profile}
          disabled={fwhm <= 0}
          onChange={(e) => onProfileChange(e.target.value as "gaussian" | "lorentzian")}
          className="w-full appearance-none text-data-base border border-border rounded px-2 pr-8 py-1 bg-background disabled:opacity-40"
        >
          <option value="gaussian">Gaussian</option>
          <option value="lorentzian">Lorentzian</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
