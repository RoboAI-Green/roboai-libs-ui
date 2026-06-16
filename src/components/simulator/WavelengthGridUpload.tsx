import { useRef } from "react";
import { toast } from "sonner";
import { parseWavelengthGridFile } from "@/lib/wavelengthGrid";
import { MAX_WAVELENGTH_POINTS } from "@/lib/simulatorParams";
import { useSessionStore } from "@/stores/sessionStore";
import { SectionLabel } from "./SectionLabel";
import { FieldWarnings } from "./FieldWarnings";
import { PythonClientLink } from "./PythonClientLink";
import { HELP_TEXT } from "@/lib/helpText";

interface Props {
  /** Run-guard wavelength blockers, shown here (not by WavelengthRange) when a
   * grid is uploaded — the grid's point count is what's over the limit, so the
   * warning belongs next to the upload control rather than the disabled range. */
  warnings?: string[];
}

export function WavelengthGridUpload({ warnings = [] }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { wavelengthGrid, setWavelengthGrid } = useSessionStore();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const grid = await parseWavelengthGridFile(file);
      setWavelengthGrid(grid);
    } catch (err) {
      toast.error(`Invalid wavelength grid: ${(err as Error).message}`);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel info={HELP_TEXT.outputGrid}>Output Wavelength Grid</SectionLabel>
      <div className="flex gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 text-data-sm px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
        >
          Upload Grid
        </button>
        {wavelengthGrid && (
          <button
            onClick={() => setWavelengthGrid(null)}
            className="text-data-sm px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".npy,.csv,.txt,.tsv,.dat"
        className="hidden"
        onChange={handleFile}
      />
      {wavelengthGrid && (
        <div className="rounded border border-border bg-muted/30 px-3 py-2 flex flex-col gap-0.5">
          <p className="text-data-sm font-medium truncate">{wavelengthGrid.meta.filename}</p>
          <p className="text-data-xs text-muted-foreground font-mono tabular-nums">
            {wavelengthGrid.meta.point_count} pts · {wavelengthGrid.meta.range_min_nm.toFixed(3)}–
            {wavelengthGrid.meta.range_max_nm.toFixed(3)} nm
          </p>
          <p className="text-data-xs text-muted-foreground font-mono tabular-nums">
            step {wavelengthGrid.meta.step_min_nm.toFixed(4)}–
            {wavelengthGrid.meta.step_max_nm.toFixed(4)} nm · median{" "}
            {wavelengthGrid.meta.step_median_nm.toFixed(4)} nm
          </p>
        </div>
      )}
      <FieldWarnings
        warnings={warnings}
        hint={
          <>
            Run this grid as-is with the <PythonClientLink /> (up to{" "}
            {MAX_WAVELENGTH_POINTS.toLocaleString()} points).
          </>
        }
      />
    </div>
  );
}
