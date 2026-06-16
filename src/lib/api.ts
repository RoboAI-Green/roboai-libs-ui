const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const TOKEN = import.meta.env.VITE_API_TOKEN ?? "";

const authHeaders = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

function parseError(err: unknown, fallback: string): string {
  const detail = (err as { detail?: string | Array<{ msg: string }> }).detail;
  if (Array.isArray(detail)) return [...new Set(detail.map((e) => e.msg))].join("; ");
  return detail ?? fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders, ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(parseError(err, res.statusText));
  }
  return res.json() as Promise<T>;
}

const postInit = (payload: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(payload),
});

export interface AsdProvenance {
  release?: string;
  snapshot_date?: string;
  doi?: string;
  doi_url?: string;
  version_history_url?: string;
  source?: string;
  source_url?: string;
}

export interface CoreInfo {
  version?: string;
  asd?: AsdProvenance;
  torch_version?: string;
  cuda_version?: string | null;
  gpu_available?: boolean;
}

/** Engine + dataset SBOM, stable for the session. Used for the provenance strip. */
export function fetchInfo() {
  return request<CoreInfo>("/v1/spectra/info");
}

export function fetchElements() {
  // with_lines=true drops elements that have no ASD lines (they would yield an
  // empty spectrum), so the picker greys / hides them. See API #88.
  return request<{ elements: string[] }>("/v1/spectra/elements?with_lines=true");
}

export function computeStatic(payload: unknown) {
  return request("/v1/spectra/static", postInit(payload));
}

export function computeExposure(payload: unknown) {
  return request("/v1/spectra/exposure", postInit(payload));
}

// --- Async exposure Jobs (ADR-0015/0016) ---

export interface JobSubmitResponse {
  job_id: string;
  status: string;
  preview?: unknown;
}

export interface JobStatusResponse {
  job_id: string;
  status: string;
  result?: unknown;
  error?: string | null;
  slices_total?: number | null;
  slices_done?: number | null;
  cancel_reason?: string | null;
}

export function submitExposureJob(payload: unknown, cancelOnDisconnect = true) {
  const query = cancelOnDisconnect ? "" : "?cancel_on_disconnect=false";
  return request<JobSubmitResponse>(`/v1/spectra/exposure/jobs${query}`, postInit(payload));
}

export function pollJob(jobId: string, signal?: AbortSignal) {
  return request<JobStatusResponse>(`/v1/jobs/${jobId}`, { signal });
}

// Job queue counts (#96 / #97). Note: *stats* (aggregate counts), distinct from
// *status* (one Job's state) above.
export interface JobStatsResponse {
  /** The caller's own counts against their caps. */
  you: { queued: number; running: number; max_running: number; max_active: number };
  /** Cluster-wide backlog, aggregate-only. Not a queue position. */
  system: { queued: number; running: number };
}

export function fetchJobStats() {
  return request<JobStatsResponse>("/v1/jobs/stats");
}

export async function cancelJob(jobId: string): Promise<void> {
  // DELETE returns 204 (no body), so don't parse JSON.
  const res = await fetch(`${BASE}/v1/jobs/${jobId}`, { method: "DELETE", headers: authHeaders });
  if (!res.ok && res.status !== 409) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(parseError(err, res.statusText));
  }
}

/** Open the Arrow IPC stream as a raw Response (decoded by the caller). */
export function openExposureStream(jobId: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${BASE}/v1/jobs/${jobId}/stream`, { headers: authHeaders, signal });
}

/** Download a completed Job's result as an HDF5 file (server-built, #46). */
export async function downloadJobResultHdf5(jobId: string): Promise<void> {
  const res = await fetch(`${BASE}/v1/jobs/${jobId}/result`, { headers: authHeaders });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(parseError(err, res.statusText));
  }
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `exposure_${jobId}.h5`,
  });
  a.click();
  URL.revokeObjectURL(url);
}
