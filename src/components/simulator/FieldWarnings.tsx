import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  warnings: string[];
  /** Optional, non-blocking hint shown below the warning box (e.g. an API
   * escape-hatch link). Styled as a muted tip — not part of the error. */
  hint?: ReactNode;
}

/** Give the numbers (limit / actual) a touch more weight so they stand out. */
function withEmphasisedNumbers(text: string) {
  return text.split(/(\d[\d,]*)/g).map((part, i) =>
    /^\d[\d,]*$/.test(part) ? (
      <strong key={i} className="font-medium">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/** Destructive-styled validation note under a sidebar field. The icon floats to
 * the top-right so the message text wraps the full width below it — fewer lines
 * than an icon-left column that indents every line. */
export function FieldWarnings({ warnings, hint }: Props) {
  if (warnings.length === 0) return null;
  return (
    <div className="mt-1 rounded border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-data-xs text-destructive">
      <AlertCircle className="float-right ml-2 mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      {warnings.map((warning) => (
        <p key={warning}>{withEmphasisedNumbers(warning)}</p>
      ))}
      {hint ? (
        <p className="mt-1.5 border-t border-destructive/20 pt-1.5 text-foreground/80">{hint}</p>
      ) : null}
    </div>
  );
}
