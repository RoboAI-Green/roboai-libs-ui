/** The pill label for a loading-state spectrum card (Preview / Initializing).
 * Shared by the preview and the placeholder so the two read as sibling cards.
 * The dot is static — activity is signalled by a single pulse elsewhere (the init
 * line dot, and the slice-counter dot once numbers arrive). */
interface Props {
  label: string;
}

export function SpectrumLabel({ label }: Props) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-data-sm font-medium text-muted-foreground">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
      {label}
    </span>
  );
}
