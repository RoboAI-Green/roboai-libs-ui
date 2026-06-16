import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { DocumentationTitle } from "./metadata";

export const Route = createFileRoute("/documentation")({
  component: DocumentationPage,
});

const TOC = [
  ["what-is-this", "What is this?"],
  ["inputs", "Parameters"],
  ["static-spectrum", "Static Spectrum"],
  ["dynamic-slider", "Dynamic Time Slider"],
  ["3d-surface", "3D Evolution Surface"],
  ["save-reproduce", "Save & Load config"],
  ["reliability", "Reliability"],
  ["references", "References"],
];

const INPUT_GROUPS = [
  {
    title: "Sample",
    guides: [
      {
        title: "Elements",
        means: "The chemical species included in the spectrum calculation.",
        when: "Change whenever you want a different element or mixture.",
        how: "Click Add element, choose from the list, and remove unwanted elements with the × button.",
      },
    ],
  },
  {
    title: "Wavelength sampling",
    guides: [
      {
        title: "Wavelength range",
        means: "Minimum and maximum wavelength (nm) for calculation.",
        when: "Narrow for fast checks. Widen for more spectral coverage.",
        how: "Enter min and max values, then leave the field so validation can run.",
      },
      {
        title: "Resolution",
        means: "Uniform wavelength step size (nm).",
        when: "Smaller values for finer sampling, larger for faster exploratory runs.",
        how: "Set only when no custom Output Wavelength Grid is active.",
      },
      {
        title: "Output Wavelength Grid",
        means: "A custom wavelength axis from a file instead of uniform range.",
        when: "Use when you need the spectrum on an instrument-specific wavelength grid.",
        how: "Upload a .npy, .csv, .txt, .tsv, or .dat file containing wavelength points in nm.",
      },
    ],
  },
  {
    title: "Plasma conditions",
    guides: [
      {
        title: "Electron temperature",
        means: "Te in eV.",
        when: "Change to compare plasma excitation conditions.",
        how: "In Static mode, Te is the single condition. In dynamic modes, it is the reference for the decay curve.",
      },
      {
        title: "Electron density",
        means: "Ne in cm⁻³.",
        when: "Change to test density-sensitive broadening.",
        how: "Select from the dropdown. In dynamic modes, it is the reference density for temporal decay.",
      },
      {
        title: "Plasma Model",
        means: "How temperature and density are distributed along the line of sight.",
        when: "Use Uniform for first runs. Use gradients or Custom for spatial assumption studies.",
        how: "Choose Uniform, Weak Gradient, Strong Gradient, or Custom. Custom exposes layer and decay parameters.",
      },
    ],
  },
  {
    title: "Instrument",
    guides: [
      {
        title: "Instrument FWHM and profile",
        means: "Broadening applied after spectrum is calculated.",
        when: "Use when simulated peaks should resemble instrument-limited measurements.",
        how: "Set FWHM above 0.00, then choose Gaussian or Lorentzian profile.",
      },
    ],
  },
];

const MODES = [
  {
    id: "static-spectrum",
    title: "Static Spectrum",
    whenToUse:
      "Use Static Spectrum to simulate emission at a single electron temperature and electron density. This mode is best for quick line identification, checking wavelength ranges, and comparing how element selection or instrumental broadening changes the spectrum.",
    howToRead:
      "The blue curve shows simulated emission intensity as a function of wavelength. Colored markers above the plot indicate contributing spectral lines and charge states. Use the legend to show or hide the intensity curve and line-marker groups.",
  },
  {
    id: "dynamic-slider",
    title: "Dynamic Time Slider",
    whenToUse: "Want to inspect how the spectrum changes over time.",
    howToRead:
      "Move the time slider, then read the metric row for the selected time, Te, Ne, and plasma length. Compare accumulated spectrum, snapshot, and full exposure line.",
  },
  {
    id: "3d-surface",
    title: "3D Evolution Surface",
    whenToUse: "When the wavelength–time–flux shape matters more than a single curve.",
    howToRead:
      "Use the three axes together. Rotate until important peaks are visible, then check the colorbar. Set camera angle before exporting.",
  },
];

const REFERENCES = [
  {
    label: "NIST Atomic Spectra Database",
    href: "https://www.nist.gov/pml/atomic-spectra-database",
    note: "Source for atomic line and level data used by the simulator.",
  },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-14 scroll-mt-6">
      <h2 className="text-2xl font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Def({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 mt-3">
      <dt className="text-sm font-medium text-muted-foreground pt-px">{label}</dt>
      <dd className="text-sm text-foreground leading-relaxed">{value}</dd>
    </div>
  );
}

function DocumentationPage() {
  return (
    <>
      <DocumentationTitle />
      <meta
        name="description"
        content="Complete guide to the RoboAI LIBS Spectrum Simulator: element selection, plasma modeling, and spectral analysis."
      />
      <div className="min-h-screen bg-background text-foreground overflow-auto font-sans">
        {/* Header */}
        <header className="border-b border-border px-8">
          <div className="max-w-5xl mx-auto flex items-start justify-between gap-6 py-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Application Guide
              </p>
              <h1 className="text-3xl font-semibold text-foreground">RoboAI LIBS Simulator</h1>
              <p className="mt-3 text-base text-muted-foreground max-w-2xl leading-relaxed">
                Pick elements, dial in plasma settings, hit Run, and inspect the spectrum. This
                guide walks you through the workflow, controls, and how to read every result.
              </p>
            </div>
            <Link
              to="/"
              className="shrink-0 text-sm font-medium px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              ← Back to simulator
            </Link>
          </div>
        </header>

        {/* Layout: TOC + content */}
        <main className="max-w-5xl mx-auto grid grid-cols-[200px_1fr] gap-10 py-10">
          {/* Sticky TOC */}
          <nav className="sticky top-6 self-start flex flex-col gap-0.5 p-4 border border-border rounded-lg bg-muted/20">
            {TOC.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-sm text-muted-foreground hover:text-foreground font-medium px-2 py-1.5 rounded hover:bg-muted transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          <article>
            <Section id="what-is-this" title="What is this?">
              <p className="text-base text-foreground leading-relaxed">
                RoboAI LIBS Simulator helps you generate and inspect simulated laser-induced
                breakdown spectroscopy emission spectra. Choose elements, wavelength sampling,
                plasma conditions, and instrument broadening, then run a simulation to view spectra,
                explore time-resolved behavior, and export results for further analysis.
              </p>
            </Section>

            <Section id="inputs" title="Parameter Guide">
              {INPUT_GROUPS.map((group) => (
                <div key={group.title} className="mb-8">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                    {group.title}
                  </h3>
                  <div className="divide-y divide-border border-t border-border">
                    {group.guides.map((guide) => (
                      <div key={guide.title} className="py-5">
                        <div>
                          <h4 className="text-sm font-semibold mb-2">{guide.title}</h4>
                          <dl>
                            <Def label="What it means" value={guide.means} />
                            <Def label="When to change" value={guide.when} />
                            <Def label="How to use" value={guide.how} />
                          </dl>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Section>

            {MODES.map((mode) => (
              <Section key={mode.id} id={mode.id} title={mode.title}>
                <dl className="mb-4">
                  <Def label="When to use" value={mode.whenToUse} />
                  <Def label="How to read" value={mode.howToRead} />
                </dl>
              </Section>
            ))}

            <div className="mb-14 border border-border rounded-lg p-4 bg-muted/20">
              <p className="text-sm font-semibold mb-1">Plotly toolbar & fullscreen</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The toolbar above each plot has zoom, pan, reset, and hover tools. Use fullscreen
                when a dense spectrum needs more room.
              </p>
            </div>

            <Section id="save-reproduce" title="Save & Load config">
              <p className="text-base text-foreground leading-relaxed mb-4">
                The URL is the config. Every parameter you set is reflected in the browser URL —
                bookmark it, copy-paste it, or send it to a colleague to reproduce the exact same
                setup.
              </p>
            </Section>

            <Section id="reliability" title="Reliability">
              <div className="border-l-2 border-destructive/60 bg-destructive/5 px-4 py-3 rounded-r-lg mb-5 text-sm text-foreground leading-relaxed">
                Spectral line and level data are derived from the NIST Atomic Spectra Database.
                Simulation results should be treated as model-based spectra, not as a replacement
                for calibration against measurements from a specific instrument and experiment.
              </div>
              <h3 className="text-sm font-semibold mb-3">Model assumptions</h3>
              <ul className="list-disc pl-5 flex flex-col gap-2 text-sm text-foreground leading-relaxed marker:text-muted-foreground">
                <li>The current spectrum workflow uses LTE assumptions.</li>
                <li>Dynamic mode uses parameterized Te, Ne, and expansion curves.</li>
                <li>
                  Layered plasma models approximate line-of-sight gradients — treat as simplified
                  model choices.
                </li>
                <li>
                  Default values are starting points. Match them to your experimental setup before
                  using results for reporting.
                </li>
              </ul>
            </Section>

            <Section id="references" title="References">
              <ul className="divide-y divide-border border-t border-border">
                {REFERENCES.map((ref) => (
                  <li key={ref.href} className="py-3">
                    <a
                      href={ref.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline"
                    >
                      {ref.label}
                      <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                    </a>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                      {ref.note}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          </article>
        </main>
      </div>
    </>
  );
}
