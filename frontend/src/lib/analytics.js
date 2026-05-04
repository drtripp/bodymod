const EVENT_KEY = "bodymod:analytics:v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function trackEvent(name, properties = {}) {
  if (!canUseStorage()) {
    return;
  }

  const event = {
    name,
    properties,
    createdAt: new Date().toISOString()
  };

  try {
    const rawValue = window.localStorage.getItem(EVENT_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : { version: 1, events: [] };
    const events = Array.isArray(parsed.events) ? parsed.events : [];
    window.localStorage.setItem(
      EVENT_KEY,
      JSON.stringify({
        version: 1,
        events: [...events.slice(-49), event]
      })
    );
  } catch (error) {
    // Analytics should never interrupt the local-first tool.
  }
}

export function loadEvents() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(EVENT_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : { version: 1, events: [] };
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch (error) {
    return [];
  }
}

export function clearEvents() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(EVENT_KEY);
}
