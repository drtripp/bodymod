import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildWeeklyDigest
} from "../src/lib/checkInLoop.js";
import {
  findToneIssues,
  hasPreferredToneSignal
} from "../src/lib/toneGuard.js";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const scanRoots = [
  "frontend/src",
  "frontend/public",
  "backend/app/data"
];

const skippedPathParts = new Set([
  "mediapipe",
  "wasm",
  "landing-assets",
  "app-icons"
]);

const scannedExtensions = new Set([
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".py"
]);

function extension(path) {
  const dotIndex = path.lastIndexOf(".");
  return dotIndex >= 0 ? path.slice(dotIndex).toLowerCase() : "";
}

function shouldScan(path) {
  const normalized = path.replaceAll("\\", "/");
  return (
    scannedExtensions.has(extension(normalized)) &&
    !normalized.endsWith("/toneGuard.js") &&
    !normalized.includes("/tests/") &&
    ![...skippedPathParts].some((part) => normalized.includes(`/${part}/`))
  );
}

function walkFiles(root) {
  const entries = readdirSync(root);
  return entries.flatMap((entry) => {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      return walkFiles(path);
    }

    return shouldScan(path) ? [path] : [];
  });
}

test("user-facing copy avoids moralized food and body-judgment phrases", () => {
  const violations = [];
  for (const root of scanRoots) {
    for (const filePath of walkFiles(join(repoRoot, root))) {
      const text = readFileSync(filePath, "utf8");
      for (const issue of findToneIssues(text)) {
        violations.push({
          file: relative(repoRoot, filePath),
          ...issue
        });
      }
    }
  }

  assert.deepEqual(violations, []);
});

test("weekly digest keeps tea voice without moralized language", () => {
  const digest = buildWeeklyDigest({
    checkIns: [
      {
        id: "weekly",
        type: "weekly-measurements",
        createdAt: "2026-06-10T12:00:00.000Z",
        measurements: {
          waistCircumference: 84,
          hipCircumference: 96
        }
      }
    ],
    trendWeight: {
      value: 82.4,
      delta: -0.2
    },
    weeklyStreak: {
      status: "current",
      current: 3
    },
    protocols: [
      {
        id: "protocol",
        status: "active"
      }
    ],
    milestones: [
      {
        id: "first-check-in",
        label: "First check-in",
        achieved: true
      }
    ]
  });
  const digestText = digest.join(" ");

  assert.equal(digest[0].startsWith("Tea:"), true);
  assert.equal(hasPreferredToneSignal(digestText), true);
  assert.deepEqual(findToneIssues(digestText), []);
});
