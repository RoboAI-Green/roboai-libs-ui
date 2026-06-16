export interface SpectralLine {
  wl: number;
  label: string;
  charge: number;
}

/** Plotly marker colour per ionization charge; unknown charges fall back to gray. */
export const CHARGE_COLOR: Record<number, string> = {
  1: "darkviolet",
  2: "darkorange",
  3: "darkgreen",
};

/**
 * Build Plotly scatter traces marking spectral lines, one trace per label.
 * Each marker sits at `yTop` and is coloured by its charge via {@link CHARGE_COLOR}.
 */
export function lineTraces(lines: SpectralLine[], yTop: number) {
  const groups: Record<string, { x: number[]; charge: number }> = {};
  for (const ln of lines) {
    if (!groups[ln.label]) groups[ln.label] = { x: [], charge: ln.charge };
    groups[ln.label].x.push(ln.wl);
  }
  return Object.entries(groups).map(([label, g]) => {
    const color = CHARGE_COLOR[g.charge] ?? "gray";
    return {
      x: g.x,
      y: Array(g.x.length).fill(yTop),
      text: Array(g.x.length).fill(label),
      type: "scatter" as const,
      mode: "text+markers" as const,
      marker: { symbol: "line-ns", size: 8, color, line: { width: 1.5, color } },
      textposition: "top center" as const,
      textfont: { size: 8, color },
      name: label,
      showlegend: true,
    };
  });
}
