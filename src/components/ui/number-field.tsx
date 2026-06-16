import { useState, type ComponentPropsWithoutRef } from "react";

type Props = Omit<ComponentPropsWithoutRef<"input">, "value" | "onChange" | "type"> & {
  value: number;
  /** Called once with the parsed value when editing finishes (blur or Enter). */
  onCommit: (value: number) => void;
  /**
   * Called per keystroke with the parsed draft value while the field is being
   * edited (never commits). Lets a parent reflect the in-progress value — e.g. a
   * live sum — without the committed-state clamping that `onCommit` triggers.
   */
  onDraftChange?: (value: number) => void;
  /** Display formatting applied to `value` while not being edited (e.g. fixed decimals). */
  format?: (value: number) => string;
};

/**
 * A numeric input that holds a local draft while focused and only commits the
 * parsed value on blur / Enter — never per keystroke. This stops committed-state
 * clamping (e.g. setRange) from rewriting the field mid-typing, which otherwise
 * makes multi-digit edits jump to the clamp bounds. Selects on focus so typing
 * replaces rather than concatenates.
 */
export function NumberField({
  value,
  onCommit,
  onDraftChange,
  format,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = parseFloat(draft);
    if (!Number.isNaN(parsed) && draft !== String(value)) onCommit(parsed);
    setDraft(null);
  };

  return (
    <input
      {...rest}
      type="number"
      value={draft ?? (format ? format(value) : value)}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parseFloat(e.target.value);
        if (!Number.isNaN(parsed)) onDraftChange?.(parsed);
      }}
      onFocus={(e) => {
        setDraft(String(value));
        e.target.select();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        commit();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        onKeyDown?.(e);
      }}
    />
  );
}
