export function computeCumulative(matrix: number[][], frameIdx: number): number[] {
  const safeIdx = Math.min(Math.max(frameIdx, 0), matrix.length - 1);
  const n = matrix[0].length;
  const sum = new Array<number>(n).fill(0);
  for (let i = 0; i <= safeIdx; i++) for (let j = 0; j < n; j++) sum[j] += matrix[i][j];
  return sum;
}

export function formatNs(seconds: number): string {
  return (seconds * 1e9).toFixed(1);
}

export function formatSci(value: number): string {
  return value.toExponential(2);
}
