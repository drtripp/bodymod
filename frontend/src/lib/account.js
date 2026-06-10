const ACCOUNTS_KEY = "bodymod:accounts:v1";
const SESSION_KEY = "bodymod:session:v1";
const GOALS_KEY = "bodymod:goals:v1";
const PROTOCOLS_KEY = "bodymod:protocols:v1";
const CHECKINS_KEY = "bodymod:checkins:v1";
const WORKOUTS_KEY = "bodymod:workouts:v1";
const PHOTOS_KEY = "bodymod:photos:v1";
const STORAGE_VERSION = 1;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorage(key, fallback) {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function loadAccounts() {
  const parsed = readStorage(ACCOUNTS_KEY, { accounts: [] });
  return Array.isArray(parsed.accounts) ? parsed.accounts : [];
}

export function persistAccounts(accounts) {
  writeStorage(ACCOUNTS_KEY, {
    version: STORAGE_VERSION,
    accounts
  });
}

export function createLocalAccount({ displayName, email, personaId = "" }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const accounts = loadAccounts();
  const existingAccount = accounts.find((account) => account.email === normalizedEmail);
  if (existingAccount) {
    persistSession(existingAccount.id);
    return existingAccount;
  }

  const account = {
    id: crypto.randomUUID(),
    displayName: String(displayName || normalizedEmail.split("@")[0]).trim(),
    email: normalizedEmail,
    personaId,
    createdAt: new Date().toISOString()
  };

  persistAccounts([account, ...accounts]);
  persistSession(account.id);
  return account;
}

export function loginLocalAccount(email) {
  const normalizedEmail = normalizeEmail(email);
  const account = loadAccounts().find((item) => item.email === normalizedEmail);

  if (!account) {
    throw new Error("No local account found for that email.");
  }

  persistSession(account.id);
  return account;
}

export function persistSession(accountId) {
  writeStorage(SESSION_KEY, {
    version: STORAGE_VERSION,
    accountId
  });
}

export function clearSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}

export function loadSessionAccount() {
  const session = readStorage(SESSION_KEY, null);
  if (!session?.accountId) {
    return null;
  }

  return loadAccounts().find((account) => account.id === session.accountId) || null;
}

export function loadUserGoals(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(GOALS_KEY, { goals: [] });
  const goals = Array.isArray(parsed.goals) ? parsed.goals : [];
  return goals.filter((goal) => goal.accountId === accountId);
}

export function loadUserProtocols(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(PROTOCOLS_KEY, { protocols: [] });
  const protocols = Array.isArray(parsed.protocols) ? parsed.protocols : [];
  return protocols.filter((protocol) => protocol.accountId === accountId);
}

export function loadUserCheckIns(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(CHECKINS_KEY, { checkIns: [] });
  const checkIns = Array.isArray(parsed.checkIns) ? parsed.checkIns : [];
  return checkIns.filter((checkIn) => checkIn.accountId === accountId);
}

export function loadUserWorkoutSessions(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(WORKOUTS_KEY, { workouts: [] });
  const workouts = Array.isArray(parsed.workouts) ? parsed.workouts : [];
  return workouts.filter((workout) => workout.accountId === accountId);
}

export function loadUserPhotos(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(PHOTOS_KEY, { photos: [] });
  const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
  return photos.filter((photo) => photo.accountId === accountId);
}

export function calculateTrendWeight(checkIns, alpha = 0.25) {
  const dailyWeights = checkIns
    .filter((checkIn) => checkIn.type === "daily-weight" && Number.isFinite(Number(checkIn.weight)))
    .slice()
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));

  if (!dailyWeights.length) {
    return null;
  }

  let trend = Number(dailyWeights[0].weight);
  let previousTrend = trend;

  for (const entry of dailyWeights.slice(1)) {
    previousTrend = trend;
    trend = alpha * Number(entry.weight) + (1 - alpha) * trend;
  }

  return {
    value: Number(trend.toFixed(1)),
    delta: dailyWeights.length > 1 ? Number((trend - previousTrend).toFixed(1)) : 0,
    count: dailyWeights.length
  };
}

export function persistUserGoal(accountId, goal) {
  const parsed = readStorage(GOALS_KEY, { goals: [] });
  const goals = Array.isArray(parsed.goals) ? parsed.goals : [];
  const nextGoal = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    checkIns: [],
    ...goal
  };

  writeStorage(GOALS_KEY, {
    version: STORAGE_VERSION,
    goals: [nextGoal, ...goals]
  });

  return nextGoal;
}

export function persistUserCheckIn(accountId, checkIn) {
  const parsed = readStorage(CHECKINS_KEY, { checkIns: [] });
  const checkIns = Array.isArray(parsed.checkIns) ? parsed.checkIns : [];
  const nextCheckIn = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...checkIn
  };

  writeStorage(CHECKINS_KEY, {
    version: STORAGE_VERSION,
    checkIns: [nextCheckIn, ...checkIns]
  });

  return nextCheckIn;
}

export function persistUserWorkoutSession(accountId, workout) {
  const parsed = readStorage(WORKOUTS_KEY, { workouts: [] });
  const workouts = Array.isArray(parsed.workouts) ? parsed.workouts : [];
  const nextWorkout = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...workout
  };

  writeStorage(WORKOUTS_KEY, {
    version: STORAGE_VERSION,
    workouts: [nextWorkout, ...workouts]
  });

  return nextWorkout;
}

export function persistUserPhoto(accountId, photo) {
  const parsed = readStorage(PHOTOS_KEY, { photos: [] });
  const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
  const nextPhoto = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...photo
  };

  writeStorage(PHOTOS_KEY, {
    version: STORAGE_VERSION,
    photos: [nextPhoto, ...photos]
  });

  return nextPhoto;
}

export function deleteUserPhoto(accountId, photoId) {
  const parsed = readStorage(PHOTOS_KEY, { photos: [] });
  const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
  const nextPhotos = photos.filter(
    (photo) => photo.accountId !== accountId || photo.id !== photoId
  );

  writeStorage(PHOTOS_KEY, {
    version: STORAGE_VERSION,
    photos: nextPhotos
  });

  return nextPhotos.filter((photo) => photo.accountId === accountId);
}

export function appendGoalCheckIn(accountId, goalId, checkIn) {
  const parsed = readStorage(GOALS_KEY, { goals: [] });
  const goals = Array.isArray(parsed.goals) ? parsed.goals : [];
  const updatedGoals = goals.map((goal) => {
    if (goal.accountId !== accountId || goal.id !== goalId) {
      return goal;
    }

    return {
      ...goal,
      checkIns: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...checkIn
        },
        ...(Array.isArray(goal.checkIns) ? goal.checkIns : [])
      ]
    };
  });

  writeStorage(GOALS_KEY, {
    version: STORAGE_VERSION,
    goals: updatedGoals
  });

  return updatedGoals.filter((goal) => goal.accountId === accountId);
}

export function persistUserProtocol(accountId, protocol) {
  const parsed = readStorage(PROTOCOLS_KEY, { protocols: [] });
  const protocols = Array.isArray(parsed.protocols) ? parsed.protocols : [];
  const nextProtocol = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    status: "active",
    checkIns: [],
    ...protocol
  };

  writeStorage(PROTOCOLS_KEY, {
    version: STORAGE_VERSION,
    protocols: [nextProtocol, ...protocols]
  });

  return nextProtocol;
}

export function appendProtocolCheckIn(accountId, protocolId, checkIn) {
  const parsed = readStorage(PROTOCOLS_KEY, { protocols: [] });
  const protocols = Array.isArray(parsed.protocols) ? parsed.protocols : [];
  const updatedProtocols = protocols.map((protocol) => {
    if (protocol.accountId !== accountId || protocol.id !== protocolId) {
      return protocol;
    }

    return {
      ...protocol,
      checkIns: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...checkIn
        },
        ...(Array.isArray(protocol.checkIns) ? protocol.checkIns : [])
      ]
    };
  });

  writeStorage(PROTOCOLS_KEY, {
    version: STORAGE_VERSION,
    protocols: updatedProtocols
  });

  return updatedProtocols.filter((protocol) => protocol.accountId === accountId);
}

export function archiveUserProtocol(accountId, protocolId) {
  const parsed = readStorage(PROTOCOLS_KEY, { protocols: [] });
  const protocols = Array.isArray(parsed.protocols) ? parsed.protocols : [];
  const updatedProtocols = protocols.map((protocol) => {
    if (protocol.accountId !== accountId || protocol.id !== protocolId) {
      return protocol;
    }

    return {
      ...protocol,
      status: "archived",
      archivedAt: new Date().toISOString()
    };
  });

  writeStorage(PROTOCOLS_KEY, {
    version: STORAGE_VERSION,
    protocols: updatedProtocols
  });

  return updatedProtocols.filter((protocol) => protocol.accountId === accountId);
}
