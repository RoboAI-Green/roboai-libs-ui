import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

interface Props {
  children: ReactNode;
}

/**
 * Centered full-height panel shared by the empty and loading states. Provides
 * the color-scheme switcher; callers supply the content rendered beneath it.
 */
export function StatePanel({ children }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden p-6">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <div className="flex items-center justify-end gap-2">
          <span className="text-data-sm font-medium text-muted-foreground uppercase tracking-wider">
            Color scheme
          </span>
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}
