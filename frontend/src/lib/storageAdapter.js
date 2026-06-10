function browserLocalStorage() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

export function createWebStorageAdapter() {
  return {
    name: "web-localStorage",
    async getItem(key) {
      return this.getItemSync(key);
    },
    async setItem(key, value) {
      this.setItemSync(key, value);
    },
    async removeItem(key) {
      this.removeItemSync(key);
    },
    getItemSync(key) {
      const storage = browserLocalStorage();
      if (!storage) {
        return null;
      }

      try {
        return storage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    setItemSync(key, value) {
      const storage = browserLocalStorage();
      if (!storage) {
        return;
      }

      try {
        storage.setItem(key, value);
      } catch (error) {
        // Local persistence must not interrupt the measurement flow.
      }
    },
    removeItemSync(key) {
      const storage = browserLocalStorage();
      if (!storage) {
        return;
      }

      try {
        storage.removeItem(key);
      } catch (error) {
        // Local persistence must not interrupt the measurement flow.
      }
    }
  };
}

export function createMemoryStorageAdapter(initialEntries = {}) {
  const entries = new Map(Object.entries(initialEntries));

  return {
    name: "memory",
    async getItem(key) {
      return this.getItemSync(key);
    },
    async setItem(key, value) {
      this.setItemSync(key, value);
    },
    async removeItem(key) {
      this.removeItemSync(key);
    },
    getItemSync(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    setItemSync(key, value) {
      entries.set(key, String(value));
    },
    removeItemSync(key) {
      entries.delete(key);
    },
    dump() {
      return Object.fromEntries(entries);
    }
  };
}

export const defaultStorageAdapter = createWebStorageAdapter();

export async function readJson(key, fallback, adapter = defaultStorageAdapter) {
  try {
    const rawValue = await adapter.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    return fallback;
  }
}

export function readJsonSync(key, fallback, adapter = defaultStorageAdapter) {
  if (typeof adapter.getItemSync !== "function") {
    return fallback;
  }

  try {
    const rawValue = adapter.getItemSync(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    return fallback;
  }
}

export async function writeJson(key, value, adapter = defaultStorageAdapter) {
  try {
    await adapter.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Local persistence must not interrupt the measurement flow.
  }
}

export function writeJsonSync(key, value, adapter = defaultStorageAdapter) {
  if (typeof adapter.setItemSync !== "function") {
    return;
  }

  try {
    adapter.setItemSync(key, JSON.stringify(value));
  } catch (error) {
    // Local persistence must not interrupt the measurement flow.
  }
}

export async function removeStoredItem(key, adapter = defaultStorageAdapter) {
  try {
    await adapter.removeItem(key);
  } catch (error) {
    // Local persistence must not interrupt the measurement flow.
  }
}

export function removeStoredItemSync(key, adapter = defaultStorageAdapter) {
  if (typeof adapter.removeItemSync !== "function") {
    return;
  }

  try {
    adapter.removeItemSync(key);
  } catch (error) {
    // Local persistence must not interrupt the measurement flow.
  }
}
