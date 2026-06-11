import { readJsonSync, removeStoredItemSync, writeJsonSync } from "./storageAdapter.js";
import {
  clearAnalyticsEvents,
  loadAnalyticsEvents,
  reportProductAnalytics
} from "./productAnalytics.js";

const EVENT_KEY = "bodymod:analytics:v1";
const PRODUCT_EVENT_MAP = {
  app_loaded: { name: "app_opened", surface: "app", context: "none" },
  result_rendered: { name: "app_interaction", surface: "body", context: "result" },
  share_url_loaded: { name: "app_interaction", surface: "sharing", context: "none" },
  share_dashboard_loaded: { name: "app_interaction", surface: "sharing", context: "none" },
  share_link_copied: { name: "app_interaction", surface: "sharing", context: "none" },
  snapshot_saved: { name: "snapshot_saved", surface: "body", context: "none" },
  snapshots_exported: { name: "backup_exported", surface: "backup", context: "signed-out" },
  snapshots_imported: { name: "app_interaction", surface: "backup", context: "signed-out" },
  comparison_target_selected: { name: "app_interaction", surface: "body", context: "target" },
  comparison_target_filter_changed: { name: "app_interaction", surface: "body", context: "target" },
  comparison_mode_changed: { name: "app_interaction", surface: "body", context: "target" },
  silhouette_view_changed: { name: "app_interaction", surface: "body", context: "target" },
  match_priority_changed: { name: "app_interaction", surface: "body", context: "target" },
  snapshot_compare_selected: { name: "app_interaction", surface: "body", context: "target" }
};

function productEventFor(name, properties = {}) {
  const mapped = PRODUCT_EVENT_MAP[name];
  if (!mapped) {
    return null;
  }

  if (name === "snapshot_saved" && properties.source === "onboarding") {
    return { ...mapped, context: "first-run" };
  }

  return mapped;
}

export function trackEvent(name, properties = {}) {
  const event = {
    name,
    properties,
    createdAt: new Date().toISOString()
  };

  try {
    const parsed = readJsonSync(EVENT_KEY, { version: 1, events: [] });
    const events = Array.isArray(parsed.events) ? parsed.events : [];
    writeJsonSync(
      EVENT_KEY,
      {
        version: 1,
        events: [...events.slice(-49), event]
      }
    );
  } catch (error) {
    // Analytics should never interrupt the local-first tool.
  }

  const productEvent = productEventFor(name, properties);
  if (productEvent) {
    reportProductAnalytics(productEvent.name, {
      surface: productEvent.surface,
      context: productEvent.context
    });
  }
}

export function loadEvents() {
  try {
    const parsed = readJsonSync(EVENT_KEY, { version: 1, events: [] });
    const localEvents = Array.isArray(parsed.events) ? parsed.events : [];
    return [...localEvents, ...loadAnalyticsEvents()];
  } catch (error) {
    return [];
  }
}

export function clearEvents() {
  removeStoredItemSync(EVENT_KEY);
  clearAnalyticsEvents();
}
