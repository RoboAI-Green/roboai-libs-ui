import { useState } from "react";
import PlotlyReact from "react-plotly.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = ((PlotlyReact as any).default ?? PlotlyReact) as typeof PlotlyReact;
import type { PlotParams } from "react-plotly.js";
import { buildSurfaceColor } from "@/lib/surfaceColor";
import type { ExposureResult } from "./DynamicPanel";

const COLORSCALE: [number, string][] = [
  [0.0, "#f1f1ed"],
  [0.025, "#d9d2cf"],
  [0.065, "#7f647b"],
  [0.105, "#24133d"],
  [0.18, "#35106d"],
  [0.32, "#68128a"],
  [0.44, "#a52a86"],
  [0.6, "#d94770"],
  [0.74, "#f46d59"],
  [0.88, "#ffa768"],
  [1.0, "#fff1aa"],
];

const DEFAULT_CAMERA = { eye: { x: 1.55, y: 1.55, z: 0.85 } };

interface Props {
  data: ExposureResult;
}

export function Surface3D({ data }: Props) {
  const [camera, setCamera] = useState(DEFAULT_CAMERA);
  const { surfaceColor, tickvals, ticktext } = buildSurfaceColor(data.snapshot_matrix);
  const timeUs = data.time_vector.map((t) => parseFloat((t * 1e6).toFixed(3)));

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
      {/* Title */}
      <div className="flex items-center px-4 h-[57px] border-b border-border bg-muted/20 shrink-0">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Time Integration & 3D Surface of Plasma Cooling
        </span>
      </div>

      {/* 3D surface — 2/3 height */}
      <div className="flex-[2] min-h-0">
        <Plot
          data={
            [
              {
                type: "surface",
                x: data.wls,
                y: timeUs,
                z: data.snapshot_matrix,
                surfacecolor: surfaceColor,
                colorscale: COLORSCALE,
                cmin: 0,
                cmax: 1,
                showscale: true,
                colorbar: {
                  thickness: 12,
                  len: 0.62,
                  tickvals,
                  ticktext,
                  title: { text: "Time-bin integrated intensity (a.u.·s)", side: "right" },
                },
                lighting: {
                  ambient: 0.82,
                  diffuse: 0.68,
                  specular: 0.06,
                  roughness: 0.95,
                  fresnel: 0.04,
                },
                hovertemplate:
                  "Wavelength: %{x:.3f} nm<br>Time: %{y:.3f} μs<br>Time-bin integrated intensity: %{z:.3e} a.u.·s<extra></extra>",
                contours: { z: { show: false } },
              },
              // @types/plotly.js doesn't model surface traces (surfacecolor,
              // lighting, contours.z); cast the data array to keep them.
            ] as unknown as PlotParams["data"]
          }
          layout={{
            paper_bgcolor: "#ffffff",
            plot_bgcolor: "#ffffff",
            scene: {
              camera,
              bgcolor: "#ffffff",
              // margin doesn't reposition a 3D scene; domain insets the cube to
              // give the axis titles room on the left and bottom.
              domain: { x: [0.05, 1], y: [0.06, 1] },
              xaxis: {
                title: { text: "Wavelength (nm)" },
                gridcolor: "#d3d7df",
                color: "#747b91",
                showspikes: false,
              },
              yaxis: {
                title: { text: "Time (μs)" },
                gridcolor: "#d3d7df",
                color: "#747b91",
                showspikes: false,
              },
              zaxis: {
                title: { text: "Time-bin integrated intensity (a.u.·s)" },
                gridcolor: "#d3d7df",
                color: "#747b91",
                showspikes: false,
                tickformat: ".1e",
              },
            },
            font: { color: "#747b91", size: 11 },
            margin: { t: 10, l: 0, r: 0, b: 0 },
            autosize: true,
          }}
          onRelayout={(e: Record<string, unknown>) => {
            if (e["scene.camera"]) setCamera(e["scene.camera"] as typeof DEFAULT_CAMERA);
          }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
          config={{ displayModeBar: true, scrollZoom: true, responsive: true }}
        />
      </div>

      {/* Total integrated spectrum — 1/3 height */}
      <div className="flex-1 min-h-0 border-t border-border">
        <Plot
          data={[
            {
              x: data.wls,
              y: data.total_exposure,
              type: "scatter",
              mode: "lines",
              line: { color: "#00A5CD", width: 1.2 },
              name: "Total Exposure",
            },
          ]}
          layout={{
            paper_bgcolor: "#ffffff",
            plot_bgcolor: "#f8f9fa",
            font: { color: "#333", size: 11 },
            title: { text: "Total Time-Integrated Spectrum (a.u.·s)", font: { size: 12 } },
            xaxis: { title: { text: "Wavelength (nm)" }, gridcolor: "#e0e0e0", zeroline: false },
            yaxis: {
              title: { text: "Time-integrated intensity (a.u.·s)" },
              gridcolor: "#e0e0e0",
              tickformat: ".1e",
              hoverformat: ".3e",
            },
            margin: { t: 36, l: 66, r: 20, b: 64 },
            autosize: true,
          }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
          config={{
            scrollZoom: true,
            toImageButtonOptions: {
              format: "png",
              filename: "libs_total_integrated",
              height: 600,
              width: 1200,
              scale: 2,
            },
          }}
        />
      </div>
    </div>
  );
}
