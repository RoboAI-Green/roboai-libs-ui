import { RotateCcw } from "lucide-react";
import type { Ref } from "react";

interface Props {
  onRun: () => void;
  onReset: () => void;
  isPending: boolean;
  disabled: boolean;
  runRef?: Ref<HTMLButtonElement>;
}

export function RunButton({ onRun, onReset, isPending, disabled, runRef }: Props) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onReset}
        title="Reset to defaults"
        className="shrink-0 p-2 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <RotateCcw className="size-4" />
      </button>
      <button
        ref={runRef}
        onClick={onRun}
        disabled={disabled || isPending}
        className="flex-1 py-2 rounded font-medium text-data-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        {isPending ? "Calculating…" : "▶ Run"}
      </button>
    </div>
  );
}
