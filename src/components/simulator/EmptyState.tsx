import { Link } from "@tanstack/react-router";
import {
  LineChart,
  Layers,
  Clock,
  Box,
  BookOpen,
  Play,
  FlaskConical,
  ExternalLink,
} from "lucide-react";
import { StatePanel } from "./StatePanel";
import type { SimulatorParams } from "@/lib/simulatorParams";
import { EMPTY_STATE_PRESETS } from "@/lib/emptyStatePresets";

interface Props {
  /** Applies a preset's full parameter set (via the URL search-param path) and focuses Run. */
  onApplyPreset: (params: SimulatorParams) => void;
}

const QUICK_START = [
  { title: "Add elements", body: "Build a sample from the periodic table in the sidebar." },
  { title: "Configure parameters", body: "Set wavelength range, plasma model and broadening." },
  { title: "Press Run", body: "Compute the spectrum and explore the result here." },
] as const;

const CAPABILITIES = [
  {
    icon: LineChart,
    title: "Emission spectrum",
    body: "Static line emission for a sample composition.",
  },
  {
    icon: Layers,
    title: "Plasma models",
    body: "Uniform or layered electron temperature & density.",
  },
  {
    icon: Clock,
    title: "Time evolution",
    body: "Exposure-integrated dynamics over the plasma decay.",
  },
  { icon: Box, title: "3D surface", body: "Intensity across wavelength and time as a surface." },
] as const;

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-data-sm font-medium text-muted-foreground uppercase tracking-wider">
    {children}
  </p>
);

export function EmptyState({ onApplyPreset }: Props) {
  return (
    <StatePanel>
      <div className="flex flex-col gap-1">
        <h2 className="text-data-lg font-semibold text-foreground">
          Simulate a LIBS emission spectrum
        </h2>
        <p className="text-data-base text-muted-foreground">
          Configure a sample in the sidebar and run a calculation, or start from an example below.
        </p>
      </div>

      {/* Quick start */}
      <div className="flex flex-col gap-2.5">
        <SectionLabel>Quick start</SectionLabel>
        <ol className="grid grid-cols-3 gap-2.5">
          {QUICK_START.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-data-xs font-semibold">
                  {i + 1}
                </span>
                <span className="text-data-base font-medium text-foreground">{step.title}</span>
              </div>
              <span className="text-data-sm text-muted-foreground">{step.body}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Capabilities */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <SectionLabel>What you can do</SectionLabel>
          <Link
            to="/documentation"
            className="inline-flex items-center gap-1.5 text-data-sm font-medium text-primary hover:underline"
          >
            <BookOpen className="size-3.5" /> Full docs
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-data-base font-medium text-foreground">{title}</span>
                <span className="text-data-sm text-muted-foreground">{body}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example presets */}
      <div className="flex flex-col gap-2.5">
        <SectionLabel>Example presets</SectionLabel>
        <div className="grid grid-cols-3 gap-2.5">
          {EMPTY_STATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset.apply())}
              className="group flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="flex items-center justify-between gap-2 text-data-base font-medium text-foreground">
                {preset.label}
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Play className="size-3" />
                </span>
              </span>
              <span className="text-data-sm text-muted-foreground">{preset.body}</span>
            </button>
          ))}
        </div>
      </div>

      {/* For researchers — point power users at the Python client */}
      <div className="flex flex-col gap-2.5">
        <SectionLabel>For researchers</SectionLabel>
        <a
          href="https://pypi.org/project/roboai-libs-client/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-2.5 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary hover:bg-primary/5"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
            <FlaskConical className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="flex items-center gap-1.5 text-data-base font-medium text-foreground">
              Running large simulations? Script them with the Python client
              <ExternalLink className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
            </span>
            <span className="text-data-sm text-muted-foreground">
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-data-xs text-foreground">
                pip install roboai-libs-client
              </code>{" "}
              runs this same engine from your own code — fire long-running exposures and forget
              them, download HDF5 results when they're ready, and pin a version for reproducible
              runs.
            </span>
          </div>
        </a>
      </div>
    </StatePanel>
  );
}
