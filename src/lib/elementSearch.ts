import { ELEMENTS } from "@/lib/periodicTable";

export interface ElementMatch {
  symbol: string;
  name: string;
  /** Whether the API offers this element (present in `available`). */
  available: boolean;
}

const PLACEHOLDERS = new Set(["*", "**"]); // lanthanide/actinide row markers, not real elements

/**
 * Rank elements for a type-to-add query, excluding those already selected.
 * Matching is case-insensitive: an exact symbol match ranks first, then
 * symbol-prefix matches, then name-substring matches; within each tier results
 * are sorted alphabetically by symbol regardless of availability. An empty
 * query returns all non-selected elements sorted alphabetically. Each match
 * carries an `available` flag (false for elements the API does not offer) so
 * callers can render unsupported elements as greyed and non-selectable.
 */
export function searchElements(
  query: string,
  { available, selected }: { available: string[]; selected: string[] },
): ElementMatch[] {
  const q = query.trim().toLowerCase();
  const availableSet = new Set(available);
  const candidates = ELEMENTS.filter(
    (el) => !PLACEHOLDERS.has(el.symbol) && !selected.includes(el.symbol),
  );

  const toMatch = (symbol: string, name: string): ElementMatch => ({
    symbol,
    name,
    available: availableSet.has(symbol),
  });
  const bySymbol = (a: ElementMatch, b: ElementMatch) => a.symbol.localeCompare(b.symbol);

  if (!q) return candidates.map((el) => toMatch(el.symbol, el.name)).sort(bySymbol);

  const tiers: ElementMatch[][] = [[], [], []];
  for (const el of candidates) {
    const symbol = el.symbol.toLowerCase();
    const name = el.name.toLowerCase();
    if (symbol === q) tiers[0].push(toMatch(el.symbol, el.name));
    else if (symbol.startsWith(q)) tiers[1].push(toMatch(el.symbol, el.name));
    else if (name.includes(q)) tiers[2].push(toMatch(el.symbol, el.name));
  }
  return tiers.flatMap((tier) => tier.sort(bySymbol));
}
