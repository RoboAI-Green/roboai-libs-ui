import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ELEMENTS } from "@/lib/periodicTable";

interface Props {
  open: boolean;
  selected: string[];
  available: string[];
  onToggle: (symbol: string) => void;
  onClose: () => void;
}

function Cell({
  symbol,
  name,
  period,
  group,
  isSelected,
  isAvailable,
  autoFocus,
  onToggle,
}: {
  symbol: string;
  name: string;
  period: number;
  group: number;
  isSelected: boolean;
  isAvailable: boolean;
  autoFocus: boolean;
  onToggle: () => void;
}) {
  const isPlaceholder = symbol === "*" || symbol === "**";
  // f-block rows get pushed down one row to leave a visual gap
  const gridRow = period <= 7 ? period : period + 1;

  if (isPlaceholder) {
    return (
      <div
        style={{ gridColumn: group, gridRow }}
        title={name}
        aria-hidden="true"
        className="aspect-square flex items-end justify-center pb-0.5 text-[6px] font-mono text-muted-foreground/60 border border-dashed border-border/30 rounded-sm"
      >
        {symbol === "*" ? "La" : "Ac"}
      </div>
    );
  }

  return (
    <button
      type="button"
      style={{ gridColumn: group, gridRow }}
      title={`${symbol} - ${name}`}
      onClick={onToggle}
      disabled={!isAvailable}
      autoFocus={autoFocus}
      aria-pressed={isSelected}
      aria-label={`${symbol} - ${name}`}
      className={[
        "aspect-square flex items-center justify-center rounded-sm text-xs font-semibold font-mono select-none transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        isAvailable ? "cursor-pointer" : "cursor-default",
        isSelected
          ? "bg-primary text-primary-foreground shadow-sm"
          : isAvailable
            ? "bg-background border border-border text-foreground hover:bg-primary/8 hover:border-primary hover:text-primary"
            : "bg-muted border-0 text-muted-foreground/40",
      ].join(" ")}
    >
      {symbol}
    </button>
  );
}

export function PeriodicTablePicker({ open, selected, available, onToggle, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Drive the native modal from the `open` prop. Keeping the <dialog> always
  // mounted (rather than conditionally rendering it) makes this idempotent, so
  // React StrictMode's double-invoked effects can't self-close it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // The first available element is the initial focus target on open.
  const firstAvailable = ELEMENTS.find((el) => available.includes(el.symbol))?.symbol;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        // A modal click outside the content box lands on the dialog itself.
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="periodic-table-title"
      className="m-auto bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl p-0 backdrop:bg-black/40"
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 id="periodic-table-title" className="text-base font-semibold">
              Periodic Table
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click to add or remove. Dimmed elements are not available from the API.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close periodic table"
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <X size={15} />
          </button>
        </div>

        {/* Table */}
        <div className="p-4">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(18, 1fr)",
              gap: "3px",
            }}
          >
            {ELEMENTS.map((el) => (
              <Cell
                key={el.symbol}
                {...el}
                isSelected={selected.includes(el.symbol)}
                isAvailable={available.includes(el.symbol)}
                autoFocus={el.symbol === firstAvailable}
                onToggle={() => onToggle(el.symbol)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between shrink-0">
          <div className="flex gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
              Selected ({selected.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-background border border-border inline-block" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-muted/30 border border-border/20 inline-block" />
              Not available
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium px-4 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
