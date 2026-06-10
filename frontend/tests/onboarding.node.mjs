import assert from "node:assert/strict";
import { test } from "node:test";
import {
  coreCompletion,
  coreOnboardingFields,
  defaultOnboardingProfile,
  goalById,
  markFieldComplete,
  onboardingGoalOptions
} from "../src/lib/onboarding.js";

test("tracks core-five onboarding completion", () => {
  let profile = defaultOnboardingProfile();

  assert.equal(coreCompletion(profile).percent, 0);
  for (const field of coreOnboardingFields) {
    profile = markFieldComplete(profile, field.name);
  }

  const completion = coreCompletion(profile);
  assert.equal(completion.completeCount, 5);
  assert.equal(completion.totalCount, 5);
  assert.equal(completion.percent, 100);
  assert.equal(completion.isComplete, true);
});

test("resolves one-tap goal defaults", () => {
  assert.equal(onboardingGoalOptions.length, 5);
  assert.equal(goalById("lose-fat").defaultTab, "diet");
  assert.equal(goalById("track-transition").label, "Track transition");
  assert.equal(goalById("missing"), null);
});
