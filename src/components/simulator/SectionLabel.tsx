import type { ReactNode } from "react";
import { InfoButton } from "@/components/ui/info-button";

interface Props {
  children: ReactNode;
  className?: string;
  /** Help text for the info button. */
  info?: string;
  /** Accessible label for the info button (defaults to "More information"). */
  infoLabel?: string;
}

export function SectionLabel({ children, className, info, infoLabel }: Props) {
  return (
    <div
      className={["flex items-center justify-between gap-2", className].filter(Boolean).join(" ")}
    >
      <p className="text-data-sm font-medium text-muted-foreground uppercase tracking-wider">
        {children}
      </p>
      <InfoButton info={info} label={infoLabel} />
    </div>
  );
}
