import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CSSProperties } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Style object that colours a range slider's filled side up to `value`.
 * Drives the `--range-fill` custom property consumed in index.css.
 */
export function rangeFillStyle(value: number, min: number, max: number) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return { "--range-fill": `${Math.min(100, Math.max(0, pct))}%` } as CSSProperties;
}
