/**
 * Trigger a client-side CSV download from in-memory rows.
 * Rows are joined with commas and newlines, wrapped in a `text/csv` Blob, and
 * downloaded via a transient anchor element.
 */
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}
