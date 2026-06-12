import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export const BODYMOD_STORAGE_PREFIX = "bodymod:";

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
    },
    keysSync() {
      const storage = browserLocalStorage();
      if (!storage) {
        return [];
      }

      try {
        return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean);
      } catch (error) {
        return [];
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
    keysSync() {
      return Array.from(entries.keys());
    },
    dump() {
      return Object.fromEntries(entries);
    }
  };
}

export function isNativeCapacitorRuntime(capacitor = Capacitor) {
  try {
    return (
      typeof capacitor?.isNativePlatform === "function" &&
      capacitor.isNativePlatform()
    );
  } catch (error) {
    return false;
  }
}

function scheduledNativeWrite(operation) {
  void operation.catch(() => {
    // Local persistence must not interrupt the measurement flow.
  });
}

export function createCapacitorPreferencesAdapter({
  preferences = Preferences,
  webAdapter = createWebStorageAdapter(),
  storagePrefix = BODYMOD_STORAGE_PREFIX
} = {}) {
  const cache = new Map();
  let hydrated = false;

  async function hydrate({ migrateWebStorage = true } = {}) {
    let migratedCount = 0;

    try {
      const { keys = [] } = await preferences.keys();
      const bodymodPreferenceKeys = keys.filter((key) => key.startsWith(storagePrefix));

      await Promise.all(
        bodymodPreferenceKeys.map(async (key) => {
          const { value } = await preferences.get({ key });
          if (value !== null && value !== undefined) {
            cache.set(key, value);
          }
        })
      );

      if (migrateWebStorage && typeof webAdapter.keysSync === "function") {
        const webKeys = webAdapter.keysSync().filter((key) => key.startsWith(storagePrefix));

        for (const key of webKeys) {
          if (cache.has(key)) {
            continue;
          }

          const value = webAdapter.getItemSync(key);
          if (value === null || value === undefined) {
            continue;
          }

          await preferences.set({ key, value: String(value) });
          cache.set(key, String(value));
          migratedCount += 1;
        }
      }

      hydrated = true;
      return {
        adapterName: "capacitor-preferences",
        hydrated: true,
        migratedCount
      };
    } catch (error) {
      hydrated = false;
      return {
        adapterName: "capacitor-preferences",
        hydrated: false,
        migratedCount
      };
    }
  }

  return {
    name: "capacitor-preferences",
    async hydrate(options) {
      return hydrate(options);
    },
    isHydrated() {
      return hydrated;
    },
    async getItem(key) {
      if (!hydrated) {
        await hydrate();
      }

      if (cache.has(key)) {
        return cache.get(key);
      }

      try {
        const { value } = await preferences.get({ key });
        if (value !== null && value !== undefined) {
          cache.set(key, value);
          return value;
        }
      } catch (error) {
        // Fall through to the webview storage fallback.
      }

      return typeof webAdapter.getItem === "function"
        ? webAdapter.getItem(key)
        : webAdapter.getItemSync?.(key) ?? null;
    },
    async setItem(key, value) {
      const normalizedValue = String(value);
      cache.set(key, normalizedValue);
      await preferences.set({ key, value: normalizedValue });
    },
    async removeItem(key) {
      cache.delete(key);
      await preferences.remove({ key });
    },
    getItemSync(key) {
      if (cache.has(key)) {
        return cache.get(key);
      }

      return typeof webAdapter.getItemSync === "function" ? webAdapter.getItemSync(key) : null;
    },
    setItemSync(key, value) {
      const normalizedValue = String(value);
      cache.set(key, normalizedValue);
      scheduledNativeWrite(preferences.set({ key, value: normalizedValue }));
    },
    removeItemSync(key) {
      cache.delete(key);
      scheduledNativeWrite(preferences.remove({ key }));
    },
    keysSync() {
      const webKeys = typeof webAdapter.keysSync === "function" ? webAdapter.keysSync() : [];
      return Array.from(new Set([...cache.keys(), ...webKeys]));
    }
  };
}

export function createDefaultStorageAdapter() {
  return isNativeCapacitorRuntime()
    ? createCapacitorPreferencesAdapter()
    : createWebStorageAdapter();
}

export const defaultStorageAdapter = createDefaultStorageAdapter();

export async function hydrateDefaultStorageAdapter(options) {
  if (typeof defaultStorageAdapter.hydrate !== "function") {
    return {
      adapterName: defaultStorageAdapter.name,
      hydrated: true,
      migratedCount: 0
    };
  }

  try {
    return await defaultStorageAdapter.hydrate(options);
  } catch (error) {
    return {
      adapterName: defaultStorageAdapter.name,
      hydrated: false,
      migratedCount: 0
    };
  }
}

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
