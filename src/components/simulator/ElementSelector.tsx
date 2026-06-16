import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { ElementCombobox } from "./ElementCombobox";
import { PeriodicTablePicker } from "./PeriodicTablePicker";
import { SectionLabel } from "./SectionLabel";
import { HELP_TEXT } from "@/lib/helpText";
import { compositionSum, isCompositionValid } from "@/lib/simulatorParams";
import { NumberField } from "@/components/ui/number-field";

interface Props {
  elements: string[];
  proportions: Record<string, number>;
  elementOptions: string[];
  onAdd: (el: string) => void;
  onRemove: (el: string) => void;
  onProportionChange: (el: string, value: number) => void;
}

export function ElementSelector({
  elements,
  proportions,
  elementOptions,
  onAdd,
  onRemove,
  onProportionChange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // In-progress field values, keyed by element, so the Σ total updates live
  // while a proportion is being typed — before it commits on blur.
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const handleToggle = (el: string) => {
    if (elements.includes(el)) onRemove(el);
    else onAdd(el);
  };

  const clearDraft = (el: string) => setDrafts(({ [el]: _omit, ...rest }) => rest);

  // Committed proportions overlaid with the field currently being edited.
  const effectiveProportions = { ...proportions, ...drafts };
  const sum = compositionSum(elements, effectiveProportions);
  const normalized = isCompositionValid(elements, effectiveProportions);

  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel info={HELP_TEXT.sampleComposition}>Sample composition</SectionLabel>

      <div className="flex flex-col gap-1.5">
        {elements.map((el) => (
          <div
            key={el}
            className="flex items-center h-8 rounded border border-border overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-ring"
          >
            <span className="h-full w-10 shrink-0 bg-muted border-r border-border text-data-sm font-medium text-foreground flex items-center justify-center">
              {el}
            </span>
            <NumberField
              min={0}
              max={1}
              step={0.01}
              value={proportions?.[el] ?? 0}
              format={(v) => v.toFixed(2)}
              aria-label={`${el} proportion`}
              onDraftChange={(v) => setDrafts((d) => ({ ...d, [el]: v }))}
              onCommit={(v) => onProportionChange(el, v)}
              onBlur={() => clearDraft(el)}
              className="flex-1 w-0 h-full px-2 text-data-sm font-mono text-right bg-transparent focus:outline-none [&::-webkit-inner-spin-button]:ml-2"
            />
            <button
              onClick={() => onRemove(el)}
              aria-label={`Remove ${el}`}
              className="w-8 h-full bg-muted border-l border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center shrink-0 transition-colors"
            >
              ×
            </button>
          </div>
        ))}

        {elements.length > 0 && (
          <div
            className={`flex items-center h-8 rounded border ${normalized ? "border-border" : "border-destructive/40 bg-destructive/10"}`}
          >
            <span
              className={`w-10 shrink-0 text-center text-data-sm font-semibold ${normalized ? "text-foreground" : "text-destructive"}`}
            >
              Σ
            </span>
            <span
              role="img"
              aria-label={`Proportion sum ${sum.toFixed(2)}`}
              className={`flex-1 w-0 pr-8 text-right text-data-sm font-medium font-mono tabular-strict ${normalized ? "text-foreground" : "text-destructive"}`}
            >
              {sum.toFixed(2)}
            </span>
            <span
              title={normalized ? "Composition is valid" : "Composition must sum to 1"}
              className={`w-8 h-full shrink-0 flex items-center justify-center ${normalized ? "text-foreground/45" : "text-destructive/75"}`}
            >
              {normalized ? (
                <Check size={14} aria-label="Composition is valid" />
              ) : (
                <AlertCircle size={14} aria-label="Composition must sum to 1" />
              )}
            </span>
          </div>
        )}
      </div>

      <ElementCombobox
        selected={elements}
        available={elementOptions}
        onAdd={onAdd}
        onOpenPicker={() => setPickerOpen(true)}
      />

      <PeriodicTablePicker
        open={pickerOpen}
        selected={elements}
        available={elementOptions}
        onToggle={handleToggle}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
