import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Download,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import PlotlyReact from "react-plotly.js";
import Plotly from "plotly.js-dist-min";
import {
  type ComparableSpectrum,
  estimateComparisonScale,
  parseComparableSpectrumFile,
  parseComparableSpectrumText,
} from "@/lib/spectrumCompare";
import { downloadCSV } from "@/lib/downloadCSV";
import { lineTraces, type SpectralLine } from "./spectralTraces";
import { useTheme } from "@/components/theme-provider";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = ((PlotlyReact as any).default ?? PlotlyReact) as typeof PlotlyReact;

interface StaticResult {
  wls: number[];
  intensity: number[];
  lines?: SpectralLine[];
}

interface Props {
  data: StaticResult;
}

const BTN =
  "inline-flex items-center gap-1.5 text-data-sm text-foreground border border-border rounded-md bg-background px-2.5 py-1.5 hover:bg-muted transition-colors";
const MIN_SCALE = 1e-6;
const MAX_SCALE = 1e6;
const SCALE_NUDGE_FACTOR = 1.1;

function formatScale(value: number) {
  if (value === 0) return "0";
  if (value >= 0.01 && value < 1000) {
    const text = value.toPrecision(3);
    return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
  }
  return value.toExponential(1);
}

function maxFinite(values: readonly number[], fallback = 1) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return fallback;
  return Math.max(...finite);
}

function finiteRange(values: readonly number[]) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return null;
  return [Math.min(...finite), Math.max(...finite)] as [number, number];
}

function overlapZoomRange(
  simulatedWavelengthNm: readonly number[],
  comparisonWavelengthNm: readonly number[],
) {
  const simulatedRange = finiteRange(simulatedWavelengthNm);
  const comparisonRange = finiteRange(comparisonWavelengthNm);
  if (!simulatedRange || !comparisonRange) return null;

  const overlapMin = Math.max(simulatedRange[0], comparisonRange[0]);
  const overlapMax = Math.min(simulatedRange[1], comparisonRange[1]);
  if (overlapMax <= overlapMin) return null;

  const padding = Math.max((overlapMax - overlapMin) * 0.02, 0.02);
  return [
    Math.max(simulatedRange[0], overlapMin - padding),
    Math.min(simulatedRange[1], overlapMax + padding),
  ] as [number, number];
}

function scaleToExponent(scale: number) {
  if (!Number.isFinite(scale) || scale <= 0) return 0;
  return Math.min(6, Math.max(-6, Math.log10(scale)));
}

function clampScaleValue(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function StaticChart({ data }: Props) {
  // Re-render on theme change; read the resolved `.dark` class the provider
  // toggles on <html> (already accounts for the "system" setting).
  useTheme();
  const isDark = document.documentElement.classList.contains("dark");
  const axisFontColor = isDark ? "#d4d4d8" : "#444";

  const gdRef = useRef<HTMLElement | null>(null);
  const compareFileInputRef = useRef<HTMLInputElement | null>(null);
  const [comparison, setComparison] = useState<ComparableSpectrum | null>(null);
  const [compareScaleExponent, setCompareScaleExponent] = useState(0);
  const [compareError, setCompareError] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [compareZoomRange, setCompareZoomRange] = useState<[number, number] | null>(null);
  const [scaleInputValue, setScaleInputValue] = useState("1");
  const [scaleInputError, setScaleInputError] = useState("");

  const compareScale = useMemo(() => 10 ** compareScaleExponent, [compareScaleExponent]);
  const comparisonY = useMemo(
    () => (comparison ? comparison.intensity.map((value) => value * compareScale) : []),
    [comparison, compareScale],
  );
  const yTop = maxFinite(data.intensity) * 1.05 || 1;
  const comparisonTrace = comparison
    ? {
        x: comparison.wavelength_nm,
        y: comparisonY,
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "#9a3412", width: 1.4 },
        name: `Compare: ${comparison.name}`,
        yaxis: "y2",
      }
    : null;
  const traces = [
    {
      x: data.wls,
      y: data.intensity,
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#00A5CD", width: 1 },
      name: "Intensity",
    },
    ...(comparisonTrace ? [comparisonTrace] : []),
    ...lineTraces(data.lines ?? [], yTop),
  ];

  const downloadPNG = () => {
    if (!gdRef.current) return;
    Plotly.downloadImage(gdRef.current, {
      format: "png",
      filename: "spectrum",
      height: 600,
      width: 1200,
      scale: 2,
    });
  };

  const setScaleValue = (scale: number) => {
    const clamped = clampScaleValue(scale);
    setCompareScaleExponent(scaleToExponent(clamped));
    setScaleInputValue(formatScale(clamped));
    setScaleInputError("");
  };

  const applyComparison = (parsed: ComparableSpectrum) => {
    setComparison(parsed);
    setCompareZoomRange(overlapZoomRange(data.wls, parsed.wavelength_nm));
    setScaleValue(
      estimateComparisonScale(data.wls, data.intensity, parsed.wavelength_nm, parsed.intensity),
    );
    setCompareError("");
  };

  useEffect(() => {
    if (!comparison) return;
    setCompareZoomRange(overlapZoomRange(data.wls, comparison.wavelength_nm));
    setScaleValue(
      estimateComparisonScale(
        data.wls,
        data.intensity,
        comparison.wavelength_nm,
        comparison.intensity,
      ),
    );
  }, [comparison, data.wls, data.intensity]);

  const handleCompareFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      applyComparison(await parseComparableSpectrumFile(file));
    } catch (error) {
      setCompareError(errorMessage(error));
    } finally {
      event.target.value = "";
    }
  };

  const handlePasteCompare = () => {
    try {
      applyComparison(parseComparableSpectrumText(pasteText, "Pasted"));
      setPasteOpen(false);
      setPasteText("");
    } catch (error) {
      setCompareError(errorMessage(error));
    }
  };

  const autoScaleComparison = () => {
    if (!comparison) return;
    setScaleValue(
      estimateComparisonScale(
        data.wls,
        data.intensity,
        comparison.wavelength_nm,
        comparison.intensity,
      ),
    );
  };

  const commitScaleInput = () => {
    const nextScale = Number(scaleInputValue.trim());
    if (!Number.isFinite(nextScale) || nextScale <= 0) {
      setScaleInputError("Enter a positive scale.");
      return;
    }
    setScaleValue(nextScale);
  };

  const clearComparison = () => {
    setComparison(null);
    setCompareError("");
    setCompareScaleExponent(0);
    setScaleInputValue("1");
    setScaleInputError("");
    setCompareZoomRange(null);
  };

  return (
    <div className="flex flex-col w-full flex-1 min-h-0">
      <div className="flex min-h-[57px] flex-wrap items-center gap-3 justify-start border-b border-border bg-muted/20 px-4 py-2 shrink-0">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Static LTE Spectrum
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              downloadCSV("spectrum.csv", [
                ["wavelength_nm", "intensity"],
                ...data.wls.map((w, i) => [w, data.intensity[i]]),
              ])
            }
            className={BTN}
          >
            <Download className="size-3.5" /> Spectrum CSV
          </button>
          {(data.lines?.length ?? 0) > 0 && (
            <button
              onClick={() =>
                downloadCSV("spectral_lines.csv", [
                  ["wavelength_nm", "label", "charge"],
                  ...(data.lines ?? []).map((l) => [l.wl, l.label, l.charge]),
                ])
              }
              className={BTN}
            >
              <Download className="size-3.5" /> Lines CSV
            </button>
          )}
          <button onClick={downloadPNG} title="Download PNG" className={BTN}>
            <Camera className="size-3.5" /> PNG
          </button>
        </div>
        <div className="flex items-center gap-1 border-l border-border pl-3">
          <span className="text-data-sm text-muted-foreground">Compare spectrum</span>
          <input
            ref={compareFileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,.dat,.html,text/csv,text/plain,text/html"
            className="hidden"
            onChange={handleCompareFileUpload}
          />
          <button
            type="button"
            className={BTN}
            onClick={() => compareFileInputRef.current?.click()}
          >
            <Upload className="size-3.5" /> Upload
          </button>
          <button type="button" className={BTN} onClick={() => setPasteOpen((value) => !value)}>
            <Clipboard className="size-3.5" /> Paste
          </button>
        </div>
        {comparison && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="max-w-40 truncate text-data-sm font-semibold text-orange-900"
                title={comparison.name}
              >
                {comparison.name}
                {comparison.meta.converted_from_angstrom ? " (Å→nm)" : ""}
              </span>
              <button type="button" className={BTN} onClick={clearComparison}>
                <X className="size-3.5" />
                Clear
              </button>
            </div>
            <label className="flex items-center gap-1.5 text-data-sm text-muted-foreground">
              Scale
              <input
                aria-label="Comparison scale"
                type="text"
                inputMode="decimal"
                value={scaleInputValue}
                onChange={(event) => {
                  setScaleInputValue(event.target.value);
                  setScaleInputError("");
                }}
                onBlur={commitScaleInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                className="h-7 w-20 rounded border border-border bg-background px-2 font-mono text-data-sm text-foreground"
              />
            </label>
            <div className="flex h-7 flex-col overflow-hidden rounded border border-border bg-background">
              <button
                type="button"
                aria-label="Increase comparison scale"
                className="flex h-3.5 w-6 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setScaleValue(compareScale * SCALE_NUDGE_FACTOR)}
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                type="button"
                aria-label="Decrease comparison scale"
                className="flex h-3.5 w-6 items-center justify-center border-t border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setScaleValue(compareScale / SCALE_NUDGE_FACTOR)}
              >
                <ChevronDown className="size-3" />
              </button>
            </div>
            <button type="button" className={BTN} onClick={autoScaleComparison}>
              <RefreshCw className="size-3.5" /> Auto scale
            </button>
            {compareZoomRange && (
              <button type="button" className={BTN} onClick={() => setCompareZoomRange(null)}>
                Full range
              </button>
            )}
            {!compareZoomRange && (
              <button
                type="button"
                className={BTN}
                onClick={() =>
                  setCompareZoomRange(overlapZoomRange(data.wls, comparison.wavelength_nm))
                }
              >
                Zoom overlap
              </button>
            )}
          </div>
        )}
        {compareError && (
          <span className="max-w-80 truncate text-data-sm text-destructive" title={compareError}>
            {compareError}
          </span>
        )}
        {scaleInputError && (
          <span className="max-w-60 truncate text-data-sm text-destructive" title={scaleInputError}>
            {scaleInputError}
          </span>
        )}
      </div>
      {pasteOpen && (
        <div className="flex items-stretch gap-2 border-b border-border bg-orange-50 px-4 py-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder="Paste wavelength and intensity data, e.g. two columns or a table with Wavelength and Sum."
              className="min-h-16 resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-data-sm"
            />
            <p className="text-data-sm text-muted-foreground">
              Accepted formats include CSV, TSV, ASCII tables, and copied tables with
              wavelength/intensity columns.
            </p>
          </div>
          <button type="button" className={BTN} onClick={handlePasteCompare}>
            Apply
          </button>
          <button type="button" className={BTN} onClick={() => setPasteOpen(false)}>
            Cancel
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <Plot
          data={traces}
          layout={{
            autosize: true,
            paper_bgcolor: "transparent",
            plot_bgcolor: "#f8f9fa",
            font: { size: 11, color: axisFontColor },
            xaxis: {
              title: { text: "Wavelength (nm)", standoff: 12 },
              gridcolor: "#e0e0e0",
              zeroline: false,
              ...(compareZoomRange ? { range: compareZoomRange } : {}),
            },
            yaxis: {
              title: { text: "Simulated intensity (a.u.)", standoff: 12 },
              gridcolor: "#e0e0e0",
              rangemode: "tozero",
              range: [0, yTop],
              tickformat: ".1e",
              hoverformat: ".3e",
            },
            ...(comparison
              ? {
                  yaxis2: {
                    title: { text: "Comparison intensity (a.u., scaled)", standoff: 12 },
                    overlaying: "y",
                    side: "right",
                    showgrid: false,
                    tickformat: ".1e",
                    hoverformat: ".3e",
                    rangemode: "tozero",
                    range: [0, yTop],
                    zeroline: false,
                  },
                }
              : {}),
            margin: { t: 30, l: 85, r: comparison ? 95 : 20, b: 58 },
            legend: {
              title: { text: "&nbsp;Click to show/hide: &nbsp;", font: { size: 13 } },
              x: 0.84,
              xanchor: "left",
              y: 0.98,
              bgcolor: "rgba(255,255,255,0.94)",
              bordercolor: "#d1d5db",
              borderwidth: 1,
              font: { size: 13 },
            },
          }}
          onInitialized={(_, gd) => {
            gdRef.current = gd;
          }}
          onUpdate={(_, gd) => {
            gdRef.current = gd;
          }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
          config={{ scrollZoom: true, modeBarButtonsToRemove: ["toImage"] }}
        />
      </div>
    </div>
  );
}
