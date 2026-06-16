import { useEffect, useState, type ReactNode } from "react";
import { StatePanel } from "./StatePanel";
import { SpectrumLabel } from "./SpectrumLabel";

interface Props {
  /** Heading shown above the animated spectrum. */
  title?: string;
  /** Supporting line under the title. */
  subtitle?: string;
  /** Right-aligned estimate hint (e.g. "est. 12s" or a live slice counter). */
  estimate?: ReactNode;
  /** Rotating status lines shown bottom-left. */
  steps?: ReadonlyArray<string>;
  /** How often the status line advances, in milliseconds. */
  stepIntervalMs?: number;
  /** When provided, renders a Cancel button beneath the status line. */
  onCancel?: () => void;
  /** Real spectrum for the top slot (the preview). When given, the decorative
   * placeholder trace moves to the bottom; when absent, it stays in the top slot. */
  spectrum?: ReactNode;
  /** Quiet footer line below the Cancel action (e.g. the exposure server-load
   * line). Static loading passes nothing. */
  footer?: ReactNode;
}

const DEFAULT_STEPS = [
  "Initializing plasma model…",
  "Solving Saha-Boltzmann equations…",
  "Bribing electrons to cooperate…",
  "Computing electron density…",
  "Calculating line broadening…",
  "Asking photons nicely to line up…",
  "Convolving instrument response…",
  "Reticulating spectral splines…",
  "Generating synthetic spectrum…",
  "Counting photons, one at a time…",
  "Negotiating with excited ions…",
  "Warming up the plasma plume…",
  "Untangling overlapping transitions…",
  "Herding electrons back to ground state…",
  "Aligning the spectrometer (mentally)…",
  "Waiting for the plasma to cool down…",
  "Double-checking Boltzmann factors…",
  "Tuning the Stark broadening…",
  "Polishing the emission lines…",
  "Sampling the time-resolved snapshots…",
  "Finalizing output…",
] as const;

/** Emission peaks of the decorative spectrum: position, height, width (px). */
const PEAKS = [
  { x: 40, h: 50, w: 5 },
  { x: 90, h: 22, w: 4 },
  { x: 140, h: 62, w: 6 },
  { x: 200, h: 32, w: 5 },
  { x: 255, h: 55, w: 6 },
  { x: 320, h: 26, w: 4 },
  { x: 370, h: 42, w: 5 },
] as const;

const VIEW_WIDTH = 400;
const BASELINE = 78;

/** Builds the SVG path for a sum-of-Gaussians spectrum across the viewBox width. */
function buildSpectrumPath(): string {
  let d = `M 0,${BASELINE}`;
  for (let x = 1; x <= VIEW_WIDTH; x++) {
    let y = BASELINE;
    for (const p of PEAKS) {
      y -= p.h * Math.exp(-Math.pow((x - p.x) / p.w, 2));
    }
    d += ` L ${x},${y.toFixed(2)}`;
  }
  return d;
}

/** The placeholder shown only when the preview isn't ready: a faint skeleton
 * spectrum with a single dot pulsing at the start of the curve. Deliberately
 * understated — the real preview usually lands within a moment. */
function InitializationState() {
  const [pathD] = useState(buildSpectrumPath);

  return (
    <div className="flex flex-col gap-1.5">
      <SpectrumLabel label="Initializing" />
      <div className="relative w-full h-[340px]">
        {/* Skeleton spectrum — viewBox height == BASELINE so the baseline sits at
            the very bottom of the box (matching the preview). */}
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${BASELINE}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full overflow-visible"
        >
          <path
            d={pathD}
            fill="none"
            className="stroke-muted"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* The single activity pulse: a dot at the start of the curve, centred on
            the baseline (translate-y-1/2 drops its centre onto the line). */}
        <span className="absolute bottom-0 left-0.5 flex h-2.5 w-2.5 translate-y-1/2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
      </div>
    </div>
  );
}

export function LoadingState({
  title = "Simulating LIBS emission spectrum",
  subtitle = "This may take a moment. The spectrum will appear here when ready.",
  estimate,
  steps = DEFAULT_STEPS,
  stepIntervalMs = 3200,
  onCancel,
  spectrum,
  footer,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);

  // Rotate the status line.
  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length);
    }, stepIntervalMs);
    return () => clearInterval(id);
  }, [steps.length, stepIntervalMs]);

  return (
    <StatePanel>
      <div className="flex flex-col gap-1">
        <h2 className="text-data-lg font-semibold text-foreground">{title}</h2>
        <p className="text-data-base text-muted-foreground mb-8">{subtitle}</p>

        {/* Top slot: the real preview when available, else the placeholder. */}
        {spectrum ?? <InitializationState />}

        <div className="flex justify-between text-data-sm text-muted-foreground font-mono mt-1">
          <span>{steps[stepIndex]}</span>
          {/* Right slot is the live slice counter (exposure only); static has no
              meaningful estimate — it's near-instant — so it's simply omitted. */}
          {estimate && <span className="tabular-nums">{estimate}</span>}
        </div>

        {onCancel && (
          <div className="mt-8 flex items-center gap-2">
            <span className="text-data-sm font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-data-sm text-foreground border border-border rounded-md bg-background px-3 py-1.5 hover:bg-muted transition-colors"
            >
              Cancel the simulation
            </button>
          </div>
        )}

        {footer}
      </div>
    </StatePanel>
  );
}
