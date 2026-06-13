import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultMeasurements } from "../src/lib/measurements.js";
import {
  DEFAULT_SHARE_SNAPSHOT_EXPIRY_HOURS,
  buildShareSnapshotPayload,
  publicShareSnapshotUrl
} from "../src/lib/shareSnapshots.js";

const measurements = {
  ...defaultMeasurements,
  height: 187,
  weight: 84,
  sex: "male",
  waistCircumference: 83,
  hipCircumference: 99,
  bideltoidCircumference: 122,
  accountId: "local-account-1",
  email: "mason@example.com",
  note: "private note"
};

test("builds an expiring share snapshot payload without private local fields", () => {
  const payload = buildShareSnapshotPayload(measurements, {
    title: "Mason measurement snapshot",
    now: new Date("2026-06-13T12:00:00Z")
  });
  const serialized = JSON.stringify(payload);

  assert.equal(payload.expiresInHours, DEFAULT_SHARE_SNAPSHOT_EXPIRY_HOURS);
  assert.equal(payload.snapshot.title, "Mason measurement snapshot");
  assert.equal(payload.snapshot.createdAt, "2026-06-13T12:00:00.000Z");
  assert.equal(payload.snapshot.measurements.height, 187);
  assert.equal(payload.snapshot.measurements.waistCircumference, 83);
  assert.equal(payload.snapshot.measurements.accountId, undefined);
  assert.equal(payload.snapshot.measurements.email, undefined);
  assert.equal(payload.snapshot.measurements.note, undefined);
  assert.equal(serialized.includes("mason@example.com"), false);
  assert.equal(serialized.includes("local-account-1"), false);
  assert.equal(serialized.includes("private note"), false);
});

test("builds public snapshot URLs with opaque query tokens", () => {
  assert.equal(
    publicShareSnapshotUrl("snapshot token", {
      origin: "https://bodymod.example",
      pathname: "/app"
    }),
    "https://bodymod.example/app?snapshot=snapshot%20token"
  );
  assert.equal(publicShareSnapshotUrl(""), "");
});
