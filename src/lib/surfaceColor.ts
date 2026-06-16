const GAMMA = 0.38;

function formatFluxTick(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  return value.toExponential(2);
}

export function buildSurfaceColor(matrix: number[][]) {
  let zMax = 0;
  for (const row of matrix) for (const v of row) if (Number.isFinite(v) && v > zMax) zMax = v;

  const tickvals = [0, 0.25, 0.5, 0.75, 1];

  if (zMax <= 0) {
    return { surfaceColor: matrix, tickvals, ticktext: tickvals.map(() => "0") };
  }

  const surfaceColor = matrix.map((row) =>
    row.map((v) => {
      const norm = Number.isFinite(v) ? Math.max(0, v) / zMax : 0;
      return Math.pow(norm, GAMMA);
    }),
  );

  const ticktext = tickvals.map((t) => formatFluxTick(Math.pow(t, 1 / GAMMA) * zMax));

  return { surfaceColor, tickvals, ticktext };
}
