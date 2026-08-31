import type { AppState, Scenario } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Request failed with ${response.status}`);
  return body as T;
}

export const api = {
  state: (scenario: Scenario) => request<AppState>(`/api/state?scenario=${scenario}`),
  assumption: (key: string, value: number, effectiveDate?: string | null, notes?: string) =>
    request<{ ok: true }>(`/api/assumptions/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify({ value, effectiveDate, notes }),
    }),
  classification: (fingerprint: string, category: string, note = "") =>
    request<{ ok: true }>(`/api/transactions/${encodeURIComponent(fingerprint)}/classification`, {
      method: "PATCH",
      body: JSON.stringify({ category, note }),
    }),
  recalculate: (scenario: Scenario) => request<AppState>("/api/forecast/recalculate", { method: "POST", body: JSON.stringify({ scenario }) }),
  importPreview: (sourceType: "bank" | "venmo", fileName: string, csvText: string) =>
    request<Record<string, unknown>>("/api/import/preview", { method: "POST", body: JSON.stringify({ sourceType, fileName, csvText }) }),
  importCommit: (sourceType: "bank" | "venmo", fileName: string, csvText: string) =>
    request<Record<string, unknown>>("/api/import/commit", { method: "POST", body: JSON.stringify({ sourceType, fileName, csvText }) }),
};
