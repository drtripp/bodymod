import { readJsonSync, removeStoredItemSync, writeJsonSync } from "./storageAdapter.js";

const EVENT_KEY = "bodymod:analytics:v1";

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
}

export function loadEvents() {
  try {
    const parsed = readJsonSync(EVENT_KEY, { version: 1, events: [] });
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch (error) {
    return [];
  }
}

export function clearEvents() {
  removeStoredItemSync(EVENT_KEY);
}
