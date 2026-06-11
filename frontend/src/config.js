export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000";

export const ERROR_MONITORING_ENDPOINT =
  import.meta.env?.VITE_ERROR_MONITORING_ENDPOINT ||
  `${API_BASE_URL}/api/client-errors`;

export const ERROR_MONITORING_UPLOAD_ENABLED =
  import.meta.env?.VITE_ERROR_MONITORING_UPLOAD_ENABLED === "true";

export const PRODUCT_ANALYTICS_ENDPOINT =
  import.meta.env?.VITE_PRODUCT_ANALYTICS_ENDPOINT ||
  `${API_BASE_URL}/api/product-analytics`;

export const PRODUCT_ANALYTICS_UPLOAD_ENABLED =
  import.meta.env?.VITE_PRODUCT_ANALYTICS_UPLOAD_ENABLED === "true";

export const WEB_PUSH_CONFIG_ENDPOINT =
  import.meta.env?.VITE_WEB_PUSH_CONFIG_ENDPOINT ||
  `${API_BASE_URL}/api/web-push/config`;

export const WEB_PUSH_SUBSCRIPTIONS_ENDPOINT =
  import.meta.env?.VITE_WEB_PUSH_SUBSCRIPTIONS_ENDPOINT ||
  `${API_BASE_URL}/api/web-push/subscriptions`;
