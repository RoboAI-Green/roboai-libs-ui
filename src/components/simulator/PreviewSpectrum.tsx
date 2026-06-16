import type { ExposureResult } from "@/components/charts/DynamicPanel";
import { SpectrumLabel } from "./SpectrumLabel";

/**
 * The coarse submit-time preview drawn while the full Job streams: the integrated
 * (total-exposure) spectrum, a low-res approximation of the final result so the
 * user sees what to expect — and can cancel early if it's clearly off. Badged as
 * provisional because it is low-resolution.
 */
const VIEW_W = 400;
const VIEW_H = 82;

/** SVG path mapping intensities across the viewBox, peak toward the top. */
function spectrumPath(intensities: number[]): string {
  if (intensities.length < 2) return "";
  const max = Math.max(...intensities, Number.EPSILON);
  const step = VIEW_W / (intensities.length - 1);
  return intensities
    .map((v, i) => {
      const x = (i * step).toFixed(2);
      const y = (VIEW_H - (v / max) * (VIEW_H - 4)).toFixed(2);
      return `${i === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");
}

interface Props {
  preview: ExposureResult;
}

export function PreviewSpectrum({ preview }: Props) {
  const d = spectrumPath(preview.total_exposure ?? []);
  return (
    <div className="flex flex-col gap-1.5" data-testid="preview-spectrum">
      <SpectrumLabel label="Preview" />
      <div className="relative w-full h-[340px]">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <path
            d={d}
            fill="none"
            className="stroke-primary"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}
