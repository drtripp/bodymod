import { API_BASE_URL } from "../config";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

export function fetchHealth() {
  return request("/api/health");
}

export function fetchTargets() {
  return request("/api/targets");
}

export function fetchMatches(payload, priority = "balanced") {
  const query = new URLSearchParams({ priority }).toString();

  return request(`/api/match?${query}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchMatchPriorities() {
  return request("/api/match-priorities");
}

export function fetchPlanningData() {
  return request("/api/planning");
}

export function fetchLiveUpdateManifest({
  channel = "production",
  currentVersion = "",
  platform = "web"
} = {}) {
  const query = new URLSearchParams({
    channel,
    currentVersion,
    platform
  }).toString();

  return request(`/api/live-updates/manifest?${query}`);
}

export function fetchLaunchReadiness() {
  return request("/api/launch-readiness");
}

export function fetchClothingSizeTables() {
  return request("/api/clothing-sizes");
}

export function fetchExerciseLibrary() {
  return request("/api/exercise-library");
}

export function fetchProcedureLibrary() {
  return request("/api/procedure-library");
}

export function fetchBloodworkLibrary() {
  return request("/api/bloodwork-library");
}

export function fetchStrategyCorpus() {
  return request("/api/strategy-corpus");
}

export function submitCaseLogSubmission(submission) {
  return request("/api/case-log-submissions", {
    method: "POST",
    body: JSON.stringify(submission)
  });
}

export function fetchAttractivenessEvidence() {
  return request("/api/attractiveness-evidence");
}

export function fetchMeasurementGuides() {
  return request("/api/measurement-guides");
}

export function fetchReferenceData() {
  return request("/api/reference-data");
}

export function fetchEntitlements() {
  return request("/api/entitlements");
}

export function createShareDashboard(dashboard) {
  return request("/api/share-dashboards", {
    method: "POST",
    body: JSON.stringify({ dashboard })
  });
}

export function fetchShareDashboard(publicToken) {
  return request(`/api/share-dashboards/${encodeURIComponent(publicToken)}`);
}

export function createShareSnapshot(snapshot) {
  return request("/api/share-snapshots", {
    method: "POST",
    body: JSON.stringify(snapshot)
  });
}

export function fetchShareSnapshot(publicToken) {
  return request(`/api/share-snapshots/${encodeURIComponent(publicToken)}`);
}

export function updateShareDashboard(publicToken, revokeToken, dashboard) {
  return request(`/api/share-dashboards/${encodeURIComponent(publicToken)}`, {
    method: "PUT",
    body: JSON.stringify({
      revokeToken,
      dashboard
    })
  });
}

export function revokeShareDashboard(publicToken, revokeToken) {
  return request(`/api/share-dashboards/${encodeURIComponent(publicToken)}/revoke`, {
    method: "POST",
    body: JSON.stringify({ revokeToken })
  });
}
