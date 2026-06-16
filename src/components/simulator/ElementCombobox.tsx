import { useRef, useState } from "react";
import { Grid3x3 } from "lucide-react";
import { searchElements } from "@/lib/elementSearch";

interface Props {
  selected: string[];
  available: string[];
  onAdd: (symbol: string) => void;
  onOpenPicker: () => void;
}

const LISTBOX_ID = "element-combobox-listbox";
const optionId = (symbol: string) => `element-option-${symbol}`;

/**
 * Type-to-add element picker. The user filters elements by symbol or name and
 * commits a choice with click or Enter; the input then clears and stays focused
 * for rapid multi-element entry. Elements the API does not offer are shown
 * greyed and are non-selectable (skipped by keyboard navigation). A table icon
 * opens the full periodic-table picker as the browse-by-table path.
 */
export function ElementCombobox({ selected, available, onAdd, onOpenPicker }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = searchElements(query, { available, selected });
  const showList = open && results.length > 0;

  // Only available options are reachable; resolve the active index to one of them.
  const navigable = results.reduce<number[]>((acc, r, i) => (r.available ? [...acc, i] : acc), []);
  const activeResolved = results[activeIndex]?.available ? activeIndex : (navigable[0] ?? -1);

  const move = (dir: 1 | -1) => {
    if (navigable.length === 0) return;
    const pos = navigable.indexOf(activeResolved);
    if (pos === -1) return setActiveIndex(navigable[0]);
    setActiveIndex(navigable[Math.max(0, Math.min(navigable.length - 1, pos + dir))]);
  };

  const add = (symbol: string) => {
    onAdd(symbol);
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const choice = results[activeResolved];
      if (open && choice?.available) add(choice.symbol);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const activeSymbol = showList ? results[activeResolved]?.symbol : undefined;

  return (
    <div className="relative flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={LISTBOX_ID}
        aria-autocomplete="list"
        aria-activedescendant={activeSymbol ? optionId(activeSymbol) : undefined}
        value={query}
        placeholder="+ Add element"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className="flex-1 h-8 min-w-0 rounded border border-dashed border-border bg-background px-2.5 text-data-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:border-solid focus:ring-1 focus:ring-ring"
      />
      <button
        type="button"
        onClick={onOpenPicker}
        aria-label="Open periodic table"
        title="Browse the periodic table"
        className="h-8 w-8 shrink-0 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Grid3x3 size={15} />
      </button>

      {showList && (
        <ul
          id={LISTBOX_ID}
          role="listbox"
          className="absolute left-0 right-10 top-9 z-20 max-h-64 overflow-auto rounded-md border border-border bg-background py-1 shadow-lg"
        >
          {results.map((el, i) => (
            <li
              key={el.symbol}
              id={optionId(el.symbol)}
              role="option"
              aria-selected={i === activeResolved}
              aria-disabled={!el.available}
              onMouseDown={(e) => e.preventDefault()} // keep input focused through the click
              onMouseEnter={() => el.available && setActiveIndex(i)}
              onClick={() => el.available && add(el.symbol)}
              className={`flex items-baseline gap-1.5 px-2.5 py-1.5 text-data-base ${
                el.available
                  ? `cursor-pointer ${i === activeResolved ? "bg-primary/10 text-primary" : "text-foreground"}`
                  : "cursor-default text-muted-foreground/40"
              }`}
            >
              <span className="font-mono font-medium">{el.symbol}</span>
              <span className={el.available ? "text-muted-foreground" : ""}>- {el.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
