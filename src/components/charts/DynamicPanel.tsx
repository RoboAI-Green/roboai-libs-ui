import { useState, useDeferredValue, type CSSProperties } from "react";
import PlotlyReact from "react-plotly.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = ((PlotlyReact as any).default ?? PlotlyReact) as typeof PlotlyReact;
import { Download } from "lucide-react";
import { computeCumulative, formatNs, formatSci } from "@/lib/dynamicCalc";
import { downloadCSV } from "@/lib/downloadCSV";
import { lineTraces, type SpectralLine } from "./spectralTraces";
import { rangeFillStyle } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

const BTN =
  "inline-flex items-center gap-1.5 text-data-sm text-foreground border border-border rounded-md bg-background px-2.5 py-1.5 hover:bg-muted transition-colors";

export interface ExposureResult {
  wls: number[];
  time_vector: number[];
  te_vector: number[];
  ne_vector: number[];
  length_vector?: number[];
  snapshot_matrix: number[][];
  total_exposure: number[];
  lines?: SpectralLine[];
  fwhm_nm?: number;
  instrument_profile?: string;
}

interface Props {
  data: ExposureResult;
  /** Trigger a server-built HDF5 download of the full Job result (#46). */
  onDownloadHdf5?: () => void;
}

const DEFAULT_FRAME_TIME_S = 100e-9;
const SHARED = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "#f8f9fa",
  font: { size: 11 },
  margin: { t: 36, l: 60, r: 20, b: 50 },
  autosize: true,
};

function nearestFrameIndex(times: number[], targetS: number): number {
  if (times.length === 0) return 0;
  let bestIdx = 0;
  let bestDistance = Math.abs(times[0] - targetS);
  for (let i = 1; i < times.length; i++) {
    const distance = Math.abs(times[i] - targetS);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function DynamicPanel({ data, onDownloadHdf5 }: Props) {
  // Re-render on theme change; read the resolved `.dark` class the provider
  // toggles on <html> (already accounts for the "system" setting).
  useTheme();
  const isDark = document.documentElement.classList.contains("dark");
  // Default text color for axis ticks/titles. Per-axis `color` (e.g. the
  // mediumpurple Ne axis) still overrides this, so colored axes are unaffected.
  const themed = { ...SHARED, font: { ...SHARED.font, color: isDark ? "#d4d4d8" : "#444" } };

  const maxIdx = data.time_vector.length - 1;
  const [frameIdx, setFrameIdx] = useState(() =>
    nearestFrameIndex(data.time_vector, DEFAULT_FRAME_TIME_S),
  );
  const deferredFrameIdx = useDeferredValue(frameIdx);
  const safeIdx = Math.min(deferredFrameIdx, maxIdx);

  const cumulative = computeCumulative(data.snapshot_matrix, safeIdx);
  const timeNs = formatNs(data.time_vector[safeIdx]);
  const tNs = data.time_vector.map((t) => t * 1e9);
  const lengthMm = data.length_vector?.map((v) => v * 1000);

  const yTop = Math.max(...cumulative, ...data.total_exposure) * 1.05;
  const traces = lineTraces(data.lines ?? [], yTop);

  const handleDownloadAccumulated = () => {
    downloadCSV(`accumulated_spectrum_${timeNs}ns.csv`, [
      ["wavelength_nm", "accumulated_flux", "full_exposure_flux"],
      ...data.wls.map((w, i) => [w, cumulative[i], data.total_exposure[i] ?? ""]),
    ]);
  };

  const handleDownloadTimeSeries = () => {
    const hasLen = !!lengthMm;
    downloadCSV("time_series.csv", [
      ["time_ns", "Te_eV", "Ne_cm3", ...(hasLen ? ["length_mm"] : [])],
      ...data.time_vector.map((t, i) => [
        (t * 1e9).toFixed(4),
        data.te_vector[i],
        data.ne_vector[i],
        ...(hasLen ? [lengthMm![i].toFixed(6)] : []),
      ]),
    ]);
  };

  const handleDownloadSnapshots = () => {
    downloadCSV("snapshot_matrix.csv", [
      ["time_ns", ...data.wls.map((w) => `wl_${w.toFixed(3)}nm`)],
      ...data.time_vector.map((t, i) => [(t * 1e9).toFixed(4), ...data.snapshot_matrix[i]]),
    ]);
  };

  const metrics = [
    { label: "Frame", value: `${safeIdx + 1} / ${maxIdx + 1}` },
    { label: "Time", value: `${timeNs} ns` },
    { label: "Te", value: `${data.te_vector[safeIdx]?.toFixed(3)} eV` },
    { label: "Ne", value: formatSci(data.ne_vector[safeIdx]) },
    { label: "Length", value: lengthMm ? `${lengthMm[safeIdx]?.toFixed(3)} mm` : "—" },
  ];

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      {/* Title + downloads */}
      <div className="flex items-center gap-3 px-4 h-[57px] border-b border-border bg-muted/20 shrink-0">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Interactive Time Exposure & Plasma Evolution
        </span>
        <div className="flex items-center gap-1">
          {[
            { label: "Accumulated Spectrum", fn: handleDownloadAccumulated },
            { label: "Time Series (Te/Ne/L)", fn: handleDownloadTimeSeries },
            { label: "Snapshot Matrix", fn: handleDownloadSnapshots },
          ].map(({ label, fn }) => (
            <button key={label} onClick={fn} className={BTN}>
              <Download className="size-3.5" /> {label}
            </button>
          ))}
          {onDownloadHdf5 && (
            <button onClick={onDownloadHdf5} className={BTN} title="Full result as HDF5">
              <Download className="size-3.5" /> HDF5
            </button>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="flex items-center gap-3 px-4 py-2 bg-muted/20 border-b border-border shrink-0">
        <span className="text-data-sm font-medium text-foreground">⏱ Time</span>
        <input
          type="range"
          min={0}
          max={maxIdx}
          step={1}
          value={safeIdx}
          onChange={(e) => setFrameIdx(Number(e.target.value))}
          style={
            {
              ...rangeFillStyle(safeIdx, 0, maxIdx),
            } as CSSProperties
          }
          className="flex-1"
        />
        <span className="font-mono tabular-nums text-data-sm min-w-16 text-right">{timeNs} ns</span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-border shrink-0">
        {metrics.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col border border-border rounded px-2 py-1.5 bg-muted/10"
          >
            <span className="text-data-xs text-muted-foreground font-medium uppercase tracking-wider">
              {label}
            </span>
            <span className="font-mono tabular-nums text-data-sm font-semibold">{value}</span>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="flex-1 grid grid-cols-[2fr_1fr] grid-rows-2 gap-1 p-2 min-h-0">
        {/* Accumulated flux — spans 2 rows */}
        <div className="row-span-2 min-h-0">
          <Plot
            data={[
              {
                x: data.wls,
                y: cumulative,
                type: "scatter",
                mode: "lines",
                line: { color: "#00A5CD", width: 1.2 },
                name: "accumulated flux",
              },
              {
                x: data.wls,
                y: data.total_exposure,
                type: "scatter",
                mode: "lines",
                line: { color: "forestgreen", width: 1, dash: "dash" },
                opacity: 0.65,
                name: "full exposure",
              },
              ...traces,
            ]}
            layout={{
              ...themed,
              title: {
                text: `Accumulated Time-Integrated Intensity (up to ${timeNs} ns, a.u.·s)`,
                font: { size: 12 },
              },
              xaxis: { title: { text: "Wavelength (nm)" }, gridcolor: "#e0e0e0", zeroline: false },
              yaxis: {
                title: { text: "Time-integrated intensity (a.u.·s)" },
                gridcolor: "#e0e0e0",
                rangemode: "tozero",
                tickformat: ".1e",
                hoverformat: ".3e",
              },
              legend: {
                title: { text: "&nbsp;Click to show/hide: &nbsp;", font: { size: 13 } },
                x: 0.98,
                xanchor: "right",
                y: 0.98,
                bgcolor: "rgba(255,255,255,0.94)",
                bordercolor: "#d1d5db",
                borderwidth: 1,
                font: { size: 13 },
              },
            }}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            config={{ scrollZoom: true }}
          />
        </div>

        {/* Snapshot */}
        <div className="min-h-0">
          <Plot
            data={[
              {
                x: data.wls,
                y: data.snapshot_matrix[safeIdx],
                type: "scatter",
                mode: "lines",
                line: { color: "#1f77b4", width: 1 },
                name: "snapshot",
              },
            ]}
            layout={{
              ...themed,
              title: {
                text: `Time-bin Integrated Snapshot [i=${safeIdx}]: ${timeNs} ns`,
                font: { size: 10 },
              },
              xaxis: { gridcolor: "#e0e0e0", zeroline: false },
              yaxis: {
                title: { text: "Time-bin integrated intensity (a.u.·s)" },
                gridcolor: "#e0e0e0",
                tickformat: ".1e",
                hoverformat: ".3e",
              },
            }}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            config={{ scrollZoom: true }}
          />
        </div>

        {/* Te/Ne/Length evolution */}
        <div className="min-h-0">
          <Plot
            data={[
              {
                x: tNs,
                y: data.ne_vector,
                type: "scatter",
                mode: "lines",
                line: { color: "mediumpurple", dash: "dash" },
                name: "Ne (cm⁻³)",
                yaxis: "y",
              },
              {
                x: [Number(timeNs)],
                y: [data.ne_vector[safeIdx]],
                type: "scatter",
                mode: "markers",
                marker: { color: "mediumpurple", size: 7 },
                showlegend: false,
                yaxis: "y",
              },
              {
                x: tNs,
                y: data.te_vector,
                type: "scatter",
                mode: "lines",
                line: { color: "darkorange" },
                name: "Te (eV)",
                yaxis: "y2",
              },
              {
                x: [Number(timeNs)],
                y: [data.te_vector[safeIdx]],
                type: "scatter",
                mode: "markers",
                marker: { color: "darkorange", size: 7 },
                showlegend: false,
                yaxis: "y2",
              },
              ...(lengthMm
                ? [
                    {
                      x: tNs,
                      y: lengthMm,
                      type: "scatter" as const,
                      mode: "lines" as const,
                      line: { color: "seagreen" },
                      name: "length (mm)",
                      yaxis: "y2" as const,
                    },
                    {
                      x: [Number(timeNs)],
                      y: [lengthMm[safeIdx]],
                      type: "scatter" as const,
                      mode: "markers" as const,
                      marker: { color: "seagreen", size: 7 },
                      showlegend: false,
                      yaxis: "y2" as const,
                    },
                  ]
                : []),
            ]}
            layout={{
              ...themed,
              title: { text: "Te / Ne / Length Evolution", font: { size: 10 } },
              margin: { t: 36, l: 58, r: 18, b: 44 },
              hovermode: "x unified",
              xaxis: { title: { text: "time (ns)" }, gridcolor: "#e0e0e0", zeroline: false },
              yaxis: {
                title: { text: "Ne (cm⁻³)", standoff: 14 },
                type: "log",
                gridcolor: "#e0e0e0",
                color: "mediumpurple",
                tickformat: ".1e",
                hoverformat: ".3e",
                automargin: true,
              },
              yaxis2: {
                title: { text: "Te (eV) / length (mm)", standoff: 18 },
                overlaying: "y",
                side: "right",
                showgrid: false,
                automargin: true,
              },
              legend: {
                title: { text: "&nbsp;Click to show/hide: &nbsp;" },
                bgcolor: "rgba(255,255,255,0.94)",
                bordercolor: "#d1d5db",
                borderwidth: 1,
                font: { size: 10 },
                x: 0.99,
                xanchor: "right",
                y: 0.98,
              },
            }}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
            config={{ scrollZoom: true }}
          />
        </div>
      </div>
    </div>
  );
}
