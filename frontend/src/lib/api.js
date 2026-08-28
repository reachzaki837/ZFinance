/**
 * ZFinance API Client
 * ====================
 * Single source of truth for all backend calls.
 * Matches the live backend at /api/rag/* built in Steps 1-3.
 */

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Hardcoded for now — matches the test data ingested via test.py.
// Once Settings.tsx is wired (later step), this becomes dynamic.
export const BUSINESS_ID = "test_biz_001";
export const CURRENT_WEEK = "2026-W11";

async function apiFetch(path, options = {}) {
  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.detail || `Request failed: ${response.status} ${response.statusText}`
    );
  }
  return response.json();
}

// ── RAG engine endpoints ─────────────────────────────────────────────────────

export async function getNarrative(businessId = BUSINESS_ID, week = CURRENT_WEEK) {
  const data = await apiFetch("/api/rag/narrative", {
    method: "POST",
    body: JSON.stringify({ business_id: businessId, week }),
  });
  return data.narrative;
}

export async function getHealthScore(businessId = BUSINESS_ID, week = CURRENT_WEEK) {
  return apiFetch("/api/rag/health-score", {
    method: "POST",
    body: JSON.stringify({ business_id: businessId, week }),
  });
}

export async function askQuestion(question, businessId = BUSINESS_ID, week = CURRENT_WEEK) {
  const data = await apiFetch("/api/rag/ask", {
    method: "POST",
    body: JSON.stringify({ business_id: businessId, question, week }),
  });
  return data.answer;
}

export async function getAnomalies(businessId = BUSINESS_ID, week = CURRENT_WEEK) {
  return apiFetch(`/api/rag/anomalies/${businessId}/${week}`);
}

export async function getWeeks(businessId = BUSINESS_ID) {
  const data = await apiFetch(`/api/rag/weeks/${businessId}`);
  return data.weeks;
}

export async function getTrend(businessId = BUSINESS_ID) {
  const data = await apiFetch(`/api/rag/trend/${businessId}`);
  return data.data; // [{ week, revenue, expenses }]
}

export async function deleteWeek(week, businessId = BUSINESS_ID) {
  return apiFetch(`/api/rag/weeks/${businessId}/${week}`, { method: "DELETE" });
}

export async function ingestCSV(file, week, businessId = BUSINESS_ID) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/api/rag/ingest?business_id=${businessId}&week=${week}`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || "Upload failed");
  }
  return response.json();
}

export async function getTransactions(businessId = BUSINESS_ID, week = null) {
  const qs = week ? `?week=${week}` : "";
  const data = await apiFetch(`/api/rag/transactions/${businessId}${qs}`);
  return data.transactions;
}