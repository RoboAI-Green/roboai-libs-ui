import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";

import { cn } from "@/lib/utils";

function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      // Base UI defaults to role="group", but it also emits aria-orientation,
      // which is invalid on that role. "toolbar" is the correct ARIA pattern
      // for a set of toggle buttons and does support aria-orientation.
      role="toolbar"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5",
        className,
      )}
      {...props}
    />
  );
}

function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors select-none",
        "hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
        "data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
