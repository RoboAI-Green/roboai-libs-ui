import { API_CLIENT_URL } from "@/lib/runGuards";

/** The "Python client" escape-hatch link, shared by the field hints that point
 * users past an interactive limit (wavelength, time, uploaded grid). Authored
 * once so the three call sites can't drift in label or styling. */
export function PythonClientLink() {
  return (
    <a
      href={API_CLIENT_URL}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary hover:underline"
    >
      Python client
    </a>
  );
}
