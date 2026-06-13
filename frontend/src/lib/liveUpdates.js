import { readJsonSync, writeJsonSync } from "./storageAdapter.js";

export const APP_VERSION = "0.1.0";
export const LIVE_UPDATE_STATE_KEY = "bodymod:live-update-check:v1";
export const LIVE_UPDATE_STATE_KIND = "bodymod.live-update-check";

function versionParts(value) {
  return String(value || "")
    .split(/[.+-]/)
    .map((part) => {
      const match = String(part).match(/^\d+/);
      return match ? Number(match[0]) : 0;
    });
}

export function compareVersions(left, right) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  const maxLength = Math.max(leftParts.length, rightParts.length, 3);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] || 0;
    const rightPart = rightParts[index] || 0;
    if (leftPart > rightPart) {
      return 1;
    }
    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeLiveUpdateManifest(manifest = {}) {
  const channels = safeArray(manifest.channels)
    .filter((channel) => channel?.id)
    .map((channel) => ({
      id: String(channel.id),
      label: String(channel.label || channel.id),
      latestVersion: String(channel.latestVersion || ""),
      minimumVersion: String(channel.minimumVersion || ""),
      releasedAt: String(channel.releasedAt || ""),
      summary: String(channel.summary || ""),
      provider: String(channel.provider || "provider-pending"),
      providerStatus: String(channel.providerStatus || "provider-review-required"),
      reviewStatus: String(channel.reviewStatus || "needs review"),
      mandatory: Boolean(channel.mandatory),
      rolloutPercent: Number.isFinite(Number(channel.rolloutPercent))
        ? Number(channel.rolloutPercent)
        : 0,
      artifactUrl: String(channel.artifactUrl || ""),
      notes: safeArray(channel.notes).map(String)
    }));

  return {
    version: Number(manifest.version || 1),
    source: String(manifest.source || "No live-update manifest source."),
    currentChannel: String(manifest.currentChannel || channels[0]?.id || "production"),
    notes: safeArray(manifest.notes).map(String),
    providerCandidates: safeArray(manifest.providerCandidates).map((candidate) => ({
      id: String(candidate?.id || ""),
      label: String(candidate?.label || candidate?.id || ""),
      reviewStatus: String(candidate?.reviewStatus || "needs review"),
      notes: safeArray(candidate?.notes).map(String)
    })),
    channels,
    selectedChannel: manifest.selectedChannel?.id
      ? {
          ...manifest.selectedChannel,
          id: String(manifest.selectedChannel.id)
        }
      : null
  };
}

function selectChannel(manifest, requestedChannel = "") {
  const normalized = normalizeLiveUpdateManifest(manifest);
  return (
    normalized.selectedChannel ||
    normalized.channels.find((channel) => channel.id === requestedChannel) ||
    normalized.channels.find((channel) => channel.id === normalized.currentChannel) ||
    normalized.channels[0] ||
    null
  );
}

function statusCopy(status) {
  switch (status) {
    case "update-required":
      return "Update required";
    case "update-available":
      return "Update available";
    case "current":
      return "Current";
    case "unavailable":
      return "Manifest unavailable";
    default:
      return "Not checked";
  }
}

export function defaultLiveUpdateState() {
  return {
    kind: LIVE_UPDATE_STATE_KIND,
    version: 1,
    status: "not-checked",
    statusLabel: "Not checked",
    channel: "production",
    channelLabel: "Production",
    currentVersion: APP_VERSION,
    latestVersion: "",
    minimumVersion: "",
    providerStatus: "provider-review-required",
    reviewStatus: "needs provider review",
    rolloutPercent: 0,
    checkedAt: "",
    summary: "No live-update manifest checked yet.",
    detail: "Check the backend manifest before native release review.",
    privacy: "Stored state contains release metadata only: no account, measurement, note, or device token values."
  };
}

export function buildLiveUpdateStatus({
  manifest,
  requestedChannel = "production",
  currentVersion = APP_VERSION,
  checkedAt = new Date().toISOString()
} = {}) {
  const selected = selectChannel(manifest, requestedChannel);

  if (!selected) {
    return {
      ...defaultLiveUpdateState(),
      status: "unavailable",
      statusLabel: statusCopy("unavailable"),
      checkedAt,
      detail: "Live-update manifest is unavailable. Native shells should fall back to store releases."
    };
  }

  const required = compareVersions(currentVersion, selected.minimumVersion) < 0;
  const available = compareVersions(currentVersion, selected.latestVersion) < 0;
  const status = required
    ? "update-required"
    : available || selected.mandatory
      ? "update-available"
      : "current";

  return {
    ...defaultLiveUpdateState(),
    status,
    statusLabel: statusCopy(status),
    channel: selected.id,
    channelLabel: selected.label,
    currentVersion,
    latestVersion: selected.latestVersion,
    minimumVersion: selected.minimumVersion,
    providerStatus: selected.providerStatus,
    reviewStatus: selected.reviewStatus,
    rolloutPercent: selected.rolloutPercent,
    checkedAt,
    summary: selected.summary,
    detail:
      status === "current"
        ? `${selected.label} channel is current at ${currentVersion}.`
        : `${selected.label} channel latest is ${selected.latestVersion}; running ${currentVersion}.`,
    privacy: defaultLiveUpdateState().privacy
  };
}

export function normalizeLiveUpdateState(state = {}) {
  const fallback = defaultLiveUpdateState();
  return {
    ...fallback,
    kind: LIVE_UPDATE_STATE_KIND,
    version: Number(state.version || 1),
    status: String(state.status || fallback.status),
    statusLabel: String(state.statusLabel || fallback.statusLabel),
    channel: String(state.channel || fallback.channel),
    channelLabel: String(state.channelLabel || fallback.channelLabel),
    currentVersion: String(state.currentVersion || APP_VERSION),
    latestVersion: String(state.latestVersion || ""),
    minimumVersion: String(state.minimumVersion || ""),
    providerStatus: String(state.providerStatus || fallback.providerStatus),
    reviewStatus: String(state.reviewStatus || fallback.reviewStatus),
    rolloutPercent: Number.isFinite(Number(state.rolloutPercent))
      ? Number(state.rolloutPercent)
      : fallback.rolloutPercent,
    checkedAt: String(state.checkedAt || ""),
    summary: String(state.summary || fallback.summary),
    detail: String(state.detail || fallback.detail),
    privacy: fallback.privacy
  };
}

export function loadLiveUpdateCheck(adapter) {
  return normalizeLiveUpdateState(
    readJsonSync(LIVE_UPDATE_STATE_KEY, defaultLiveUpdateState(), adapter)
  );
}

export function persistLiveUpdateCheck(status, adapter) {
  const normalized = normalizeLiveUpdateState(status);
  writeJsonSync(LIVE_UPDATE_STATE_KEY, normalized, adapter);
  return normalized;
}
