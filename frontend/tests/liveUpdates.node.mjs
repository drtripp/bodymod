import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_VERSION,
  buildLiveUpdateStatus,
  compareVersions,
  loadLiveUpdateCheck,
  persistLiveUpdateCheck
} from "../src/lib/liveUpdates.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";

const manifest = {
  version: 1,
  source: "Dummy live-update manifest seed.",
  currentChannel: "production",
  providerCandidates: [
    {
      id: "capgo",
      label: "Capgo",
      reviewStatus: "needs provider review",
      notes: ["Candidate only."]
    }
  ],
  channels: [
    {
      id: "production",
      label: "Production",
      latestVersion: "0.1.1",
      minimumVersion: "0.1.0",
      releasedAt: "2026-06-13T00:00:00.000Z",
      summary: "Production release metadata.",
      provider: "provider-pending",
      providerStatus: "provider-review-required",
      reviewStatus: "needs native provider review",
      mandatory: false,
      rolloutPercent: 100,
      artifactUrl: "",
      notes: []
    }
  ]
};

test("compares semver-like live update versions", () => {
  assert.equal(compareVersions("0.1.1", "0.1.0"), 1);
  assert.equal(compareVersions("0.1.0", "0.1.0"), 0);
  assert.equal(compareVersions("0.1.0", "0.2.0-beta.1"), -1);
});

test("builds live-update status from a backend manifest", () => {
  const available = buildLiveUpdateStatus({
    manifest,
    currentVersion: APP_VERSION,
    checkedAt: "2026-06-13T12:00:00.000Z"
  });
  const current = buildLiveUpdateStatus({
    manifest,
    currentVersion: "0.1.1",
    checkedAt: "2026-06-13T12:00:00.000Z"
  });
  const required = buildLiveUpdateStatus({
    manifest: {
      ...manifest,
      selectedChannel: {
        ...manifest.channels[0],
        latestVersion: "0.2.0",
        minimumVersion: "0.1.1",
        mandatory: true
      }
    },
    currentVersion: "0.1.0",
    checkedAt: "2026-06-13T12:00:00.000Z"
  });

  assert.equal(available.status, "update-available");
  assert.equal(available.latestVersion, "0.1.1");
  assert.equal(available.providerStatus, "provider-review-required");
  assert.equal(current.status, "current");
  assert.equal(required.status, "update-required");
});

test("persists only live-update metadata", () => {
  const adapter = createMemoryStorageAdapter();
  const status = buildLiveUpdateStatus({
    manifest,
    currentVersion: APP_VERSION,
    checkedAt: "2026-06-13T12:00:00.000Z"
  });

  persistLiveUpdateCheck(
    {
      ...status,
      accountId: "acct-private",
      measurements: { waistCircumference: 84 },
      note: "private note"
    },
    adapter
  );
  const stored = loadLiveUpdateCheck(adapter);
  const serialized = JSON.stringify(stored);

  assert.equal(stored.kind, "bodymod.live-update-check");
  assert.equal(stored.status, "update-available");
  assert.doesNotMatch(serialized, /acct-private|waistCircumference|private note/i);
});
