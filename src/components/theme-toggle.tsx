import { Monitor, Moon, Sun } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTheme, type Theme } from "@/components/theme-provider";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <ToggleGroup
      value={[theme]}
      onValueChange={(groupValue) => {
        const next = groupValue[0] as Theme | undefined;
        // Single-select: re-clicking the active item empties the group —
        // ignore that so a theme is always selected.
        if (next) setTheme(next);
      }}
      aria-label="Color scheme"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroupItem key={value} value={value} aria-label={label} title={label}>
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
