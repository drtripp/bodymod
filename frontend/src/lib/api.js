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

export function fetchMatches(payload) {
  return request("/api/match", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
