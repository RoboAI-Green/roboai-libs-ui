import type { ReactNode } from "react";
import type { CoreInfo } from "@/lib/api";

interface Props {
  /** Engine + dataset SBOM from /v1/spectra/info (shared session query). */
  info: CoreInfo | undefined;
  /** Instrument settings for the committed run. */
  fwhmNm?: number | string;
  instrumentProfile?: string;
}

/**
 * The ASD dataset value: the NIST release links to its citation (DOI). The
 * snapshot date is omitted — it's available behind the link. Returns undefined
 * unless the structured provenance (release + DOI) is present.
 */
function asdValue(info: CoreInfo): ReactNode {
  const { asd } = info;
  if (!asd?.release || !asd.doi_url) return undefined;
  return (
    <a
      href={asd.doi_url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      NIST ASD {asd.release}
    </a>
  );
}

/**
 * Compact provenance / citation strip shown under every computed result: the
 * engine + dataset SBOM (the citable header, from the shared info query) and the
 * instrument settings that produced the spectrum (from the committed params).
 */
export function ProvenancePanel({ info, fwhmNm, instrumentProfile }: Props) {
  const core = info ?? {};
  const fields = (
    [
      ["engine", core.version],
      ["ASD data", asdValue(core)],
      ["torch", core.torch_version],
      ["GPU", core.gpu_available === undefined ? undefined : core.gpu_available ? "yes" : "no"],
      ["FWHM (nm)", fwhmNm === undefined ? undefined : String(fwhmNm)],
      ["profile", instrumentProfile],
    ] as Array<[string, ReactNode]>
  ).filter(([, value]) => value !== undefined && value !== "" && value !== null);

  if (fields.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 border-t border-border bg-muted/20 text-data-xs text-muted-foreground shrink-0">
      <span className="font-medium uppercase tracking-wider">Provenance</span>
      {fields.map(([label, value]) => (
        <span key={label} className="font-mono tabular-nums">
          <span className="text-muted-foreground/70">{label}:</span> {value}
        </span>
      ))}
    </div>
  );
}
