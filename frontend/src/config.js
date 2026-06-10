export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000";

export const ERROR_MONITORING_ENDPOINT =
  import.meta.env?.VITE_ERROR_MONITORING_ENDPOINT ||
  `${API_BASE_URL}/api/client-errors`;

export const ERROR_MONITORING_UPLOAD_ENABLED =
  import.meta.env?.VITE_ERROR_MONITORING_UPLOAD_ENABLED === "true";
