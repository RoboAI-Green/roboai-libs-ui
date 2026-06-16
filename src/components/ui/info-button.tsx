import { useId } from "react";
import { Info } from "lucide-react";

interface Props {
  /** Help text shown for this control. */
  info?: string;
  /** Accessible label for the button (defaults to "More information"). */
  label?: string;
  className?: string;
}

/**
 * Small info icon rendered as a button. Hovering or focusing the icon shows
 * the parameter help text used throughout the simulator sidebar.
 */
export function InfoButton({ info, label = "More information", className }: Props) {
  const tooltipId = useId();

  if (!info) return null;

  return (
    <span
      className={["group relative inline-flex shrink-0 items-center", className]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        className="cursor-help text-muted-foreground/50 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none transition-colors"
      >
        <Info className="size-3.5" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-popover px-3 py-2 text-left text-data-xs normal-case leading-snug tracking-normal text-popover-foreground opacity-0 shadow-lg transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {info}
      </span>
    </span>
  );
}
