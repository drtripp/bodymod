import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { DEFAULT_CLOTHING_SIZE_TABLES } from "../src/lib/clothingSizes.js";

const targetMeasurements = {
  height: 178,
  weight: 71,
  sex: "male",
  headCircumference: 56,
  neckCircumference: 37,
  biacromialWidth: 38,
  bideltoidWidth: 46,
  bideltoidCircumference: 108,
  armpitCircumference: 92,
  nippleCircumference: 90,
  underbustCircumference: 88,
  waistCircumference: 76,
  pantWaistCircumference: 82,
  hipCircumference: 92,
  upperThighCircumference: 52,
  midThighCircumference: 46,
  calfCircumference: 36,
  ankleCircumference: 22,
  bicepCircumference: 31,
  upperForearmCircumference: 27,
  wristCircumference: 16
};

const targets = [
  {
    id: "astarion",
    label: "Astarion",
    source_type: "character",
    notes: "Estimated placeholder profile.",
    score: 0.242,
    similarity: 88.8,
    explanation: ["waist: 4 below target", "shoulder mass: 10 above target"],
    measurements: targetMeasurements
  },
  {
    id: "classic-physique",
    label: "Classic Physique Archetype",
    source_type: "archetype",
    notes: "Broad-shouldered placeholder profile.",
    score: 0.411,
    similarity: 76.8,
    explanation: ["body weight: 6 below target", "deltoid width: 8 below target"],
    measurements: {
      ...targetMeasurements,
      height: 180,
      weight: 88,
      bideltoidCircumference: 128,
      waistCircumference: 78
    }
  }
];

const personaSeeds = [
  {
    id: "recomp-lifter",
    label: "Mason, recomp-focused lifter",
    segment: "Measurement-driven lifter",
    motivation: "Wants shoulder-to-waist changes and a tighter weekly check-in loop.",
    measurements: { height: 181, weight: 86, waistCircumference: 86, bideltoidCircumference: 124 },
    likelyGoals: ["shoulder-waist-ratio"]
  },
  {
    id: "hrt-tracker",
    label: "Riley, HRT body-shape tracker",
    segment: "Gender-transition tracker",
    motivation: "Needs private longitudinal waist, hip, and shoulder trend data.",
    measurements: { height: 173, weight: 68, sex: "female", waistCircumference: 72, hipCircumference: 99 },
    likelyGoals: ["waist-hip-ratio"]
  },
  {
    id: "glow-up-planner",
    label: "Avery, glow-up routine planner",
    segment: "Glow-up and recomp",
    motivation: "Wants body, diet, skin, and progress photos in one private place.",
    measurements: { height: 166, weight: 62, sex: "female", waistCircumference: 68, hipCircumference: 97 },
    likelyGoals: ["skin-appearance"]
  },
  {
    id: "physique-competitor",
    label: "Noah, physique competitor",
    segment: "Physique competitor",
    motivation: "Tracks delts, waist, and legs across prep without spreadsheet drift.",
    measurements: { height: 176, weight: 78, waistCircumference: 75, bideltoidCircumference: 121 },
    likelyGoals: ["shoulder-waist-ratio"]
  },
  {
    id: "postpartum-return",
    label: "Sam, postpartum return-to-training",
    segment: "Life-event tracker",
    motivation: "Needs nonjudgmental measurements with life-event annotations.",
    measurements: { height: 164, weight: 74, sex: "female", waistCircumference: 88, hipCircumference: 108 },
    likelyGoals: ["weekly-check-in"]
  },
  {
    id: "bodymod-artist",
    label: "Jules, tattoo and procedure planner",
    segment: "Body-mod subculture",
    motivation: "Wants procedure notes, healing windows, and before/after body logs.",
    measurements: { height: 170, weight: 70, sex: "female", waistCircumference: 76, hipCircumference: 101 },
    likelyGoals: ["procedure-log"]
  },
  {
    id: "data-exporter",
    label: "Quinn, quantified-self exporter",
    segment: "Quantified self",
    motivation: "Wants local-first logs with exportable JSON.",
    measurements: { height: 188, weight: 92, waistCircumference: 94, bideltoidCircumference: 132 },
    likelyGoals: ["weekly-check-in"]
  },
  {
    id: "weight-loss-starter",
    label: "Jordan, weight-loss starter",
    segment: "Mainstream fitness",
    motivation: "Needs simple waist, weight, diet, and trend feedback.",
    measurements: { height: 172, weight: 96, waistCircumference: 108, hipCircumference: 112 },
    likelyGoals: ["waist-hip-ratio"]
  },
  {
    id: "face-metric-curious",
    label: "Kai, face-metric curious user",
    segment: "Looksmaxxing traffic",
    motivation: "Arrives for face analysis but needs safety rails and local-only framing.",
    measurements: { height: 179, weight: 73, waistCircumference: 79, hipCircumference: 94 },
    likelyGoals: ["face-measurements"]
  },
  {
    id: "coach-client",
    label: "Morgan, coach tracking a client",
    segment: "Coach / multi-profile",
    motivation: "Needs repeatable check-ins and a client-friendly summary.",
    measurements: { height: 168, weight: 64, sex: "female", waistCircumference: 70, hipCircumference: 98 },
    likelyGoals: ["weekly-check-in"]
  }
];

const planningData = {
  personas: personaSeeds.map((persona) => ({
    ...persona,
    startingMeasurements: {
      ...targetMeasurements,
      ...persona.measurements
    },
    walkthrough: [
      "Create account",
      "Save first body snapshot",
      "Set goal",
      "Learn from strategy corpus"
    ]
  })),
  goalPresets: [
    {
      id: "shoulder-waist-ratio",
      label: "Improve shoulder-to-waist ratio",
      category: "Body proportions",
      summary: "Track waist, deltoid circumference, and shoulder-to-waist ratio across weekly snapshots.",
      targetMetrics: {
        waistCircumference: -4,
        bideltoidCircumference: 4
      },
      suggestedProtocols: ["resistance-training", "calorie-target"],
      requiresHumanReview: false
    },
    {
      id: "waist-hip-ratio",
      label: "Track waist-to-hip change",
      category: "Body proportions",
      summary: "Follow waist, hip, and WHR without treating any single ratio as a prescription.",
      targetMetrics: {
        waistCircumference: -3,
        hipCircumference: 2
      },
      suggestedProtocols: ["weekly-measurement-cadence", "calorie-target"],
      requiresHumanReview: false
    },
    {
      id: "weekly-check-in",
      label: "Weekly measurement check-in",
      category: "Tracking",
      summary: "Save snapshots on a predictable cadence so trend charts become meaningful.",
      targetMetrics: {},
      suggestedProtocols: ["weekly-measurement-cadence"],
      requiresHumanReview: false
    },
    {
      id: "skin-appearance",
      label: "Skin appearance research log",
      category: "Appearance",
      summary: "Store notes and photos later; use strategy cards for informational review only.",
      targetMetrics: {},
      suggestedProtocols: ["topical-retinoid-research"],
      requiresHumanReview: true
    },
    {
      id: "procedure-log",
      label: "Procedure or body-mod log",
      category: "Procedure",
      summary: "Track dates, notes, and affected measurements during healing windows.",
      targetMetrics: {},
      suggestedProtocols: ["procedure-healing-note"],
      requiresHumanReview: true
    },
    {
      id: "face-measurements",
      label: "Local face-measurement backlog",
      category: "Face",
      summary: "Future browser-local face metric logs with local-only safety framing.",
      targetMetrics: {},
      suggestedProtocols: ["face-landmark-research"],
      requiresHumanReview: true
    }
  ],
  protocolTemplates: [
    {
      id: "resistance-training",
      label: "Progressive resistance training",
      category: "Workout",
      summary: "Structured lifting block tracked against circumference and weight changes.",
      cadence: "3-5 sessions/week; review weekly",
      evidence: "moderate",
      riskLevel: "low",
      requiresHumanReview: false
    },
    {
      id: "calorie-target",
      label: "Calorie target with weekly trend review",
      category: "Diet",
      summary: "Use diet logs and weekly snapshots to watch trend movement without daily overreaction.",
      cadence: "daily food log; weekly measurement check-in",
      evidence: "moderate",
      riskLevel: "low",
      requiresHumanReview: false
    },
    {
      id: "weekly-measurement-cadence",
      label: "Weekly tape-measurement cadence",
      category: "Tracking",
      summary: "Repeat the same fields under similar conditions and log confounder notes.",
      cadence: "weekly",
      evidence: "operational",
      riskLevel: "low",
      requiresHumanReview: false
    },
    {
      id: "topical-retinoid-research",
      label: "Topical retinoid research note",
      category: "Skin",
      summary: "Placeholder skin protocol research note requiring source review.",
      cadence: "human-reviewed before use",
      evidence: "needs source review",
      riskLevel: "moderate",
      requiresHumanReview: true
    },
    {
      id: "procedure-healing-note",
      label: "Procedure healing-window note",
      category: "Procedure",
      summary: "Annotate swelling/healing windows so affected measurements are not overinterpreted.",
      cadence: "event-based",
      evidence: "operational",
      riskLevel: "human review",
      requiresHumanReview: true
    },
    {
      id: "face-landmark-research",
      label: "Browser-local face landmark research",
      category: "Face",
      summary: "MediaPipe-style landmark collection for future local face metric logs.",
      cadence: "research spike",
      evidence: "implementation research",
      riskLevel: "privacy-sensitive",
      requiresHumanReview: true
    }
  ]
};

const exerciseLibrary = {
  version: 1,
  reference: "Dummy workout seed data for tests.",
  notes: ["Replace with open-licensed imports before production."],
  exercises: [
    {
      id: "dumbbell-lateral-raise",
      label: "Dumbbell lateral raise",
      category: "Hypertrophy",
      equipment: "Dumbbells",
      primaryMuscles: ["side delts"],
      secondaryMuscles: ["upper traps"],
      measurementTargets: ["bideltoidCircumference", "bideltoidWidth"],
      difficulty: "beginner",
      instructions: ["Raise to shoulder height.", "Lower with control."],
      riskNotes: "Avoid painful shoulder ranges.",
      source: "dummy-validation-seed"
    },
    {
      id: "lat-pulldown",
      label: "Lat pulldown",
      category: "Hypertrophy",
      equipment: "Cable machine",
      primaryMuscles: ["lats"],
      secondaryMuscles: ["biceps"],
      measurementTargets: ["bideltoidCircumference", "armpitCircumference"],
      difficulty: "beginner",
      instructions: ["Pull elbows toward ribs."],
      riskNotes: "Avoid jerking from the shoulders.",
      source: "dummy-validation-seed"
    },
    {
      id: "romanian-deadlift",
      label: "Romanian deadlift",
      category: "Strength",
      equipment: "Barbell or dumbbells",
      primaryMuscles: ["hamstrings", "glutes"],
      secondaryMuscles: ["spinal erectors"],
      measurementTargets: ["hipCircumference", "upperThighCircumference"],
      difficulty: "intermediate",
      instructions: ["Hinge at the hips."],
      riskNotes: "Stop if low-back pain changes form.",
      source: "dummy-validation-seed"
    },
    {
      id: "split-squat",
      label: "Rear-foot elevated split squat",
      category: "Hypertrophy",
      equipment: "Bench and dumbbells",
      primaryMuscles: ["quads", "glutes"],
      secondaryMuscles: ["adductors"],
      measurementTargets: ["upperThighCircumference", "hipCircumference"],
      difficulty: "intermediate",
      instructions: ["Lower under control."],
      riskNotes: "Scale range of motion for knee or hip irritation.",
      source: "dummy-validation-seed"
    },
    {
      id: "incline-press",
      label: "Incline dumbbell press",
      category: "Hypertrophy",
      equipment: "Incline bench and dumbbells",
      primaryMuscles: ["upper chest"],
      secondaryMuscles: ["front delts", "triceps"],
      measurementTargets: ["nippleCircumference", "armpitCircumference"],
      difficulty: "beginner",
      instructions: ["Press over the upper chest."],
      riskNotes: "Use a neutral grip if shoulders feel pinchy.",
      source: "dummy-validation-seed"
    },
    {
      id: "calf-raise",
      label: "Standing calf raise",
      category: "Hypertrophy",
      equipment: "Machine or dumbbells",
      primaryMuscles: ["calves"],
      secondaryMuscles: ["foot intrinsics"],
      measurementTargets: ["calfCircumference"],
      difficulty: "beginner",
      instructions: ["Use a full pain-free range."],
      riskNotes: "Progress slowly if Achilles tendon history exists.",
      source: "dummy-validation-seed"
    }
  ],
  muscleTargets: [
    {
      id: "shoulder-width",
      label: "Shoulder width / delts",
      measurementTargets: ["bideltoidCircumference", "bideltoidWidth"],
      muscleGroups: ["side delts", "lats", "upper back"],
      exerciseIds: ["dumbbell-lateral-raise", "lat-pulldown"],
      rationale: "Deltoid and upper-back work are trainable inputs for visual shoulder width."
    },
    {
      id: "waist-contrast",
      label: "Waist contrast support",
      measurementTargets: ["waistCircumference", "bideltoidCircumference"],
      muscleGroups: ["side delts", "lats"],
      exerciseIds: ["dumbbell-lateral-raise", "lat-pulldown"],
      rationale: "Shoulder and back work can support shoulder-to-waist contrast."
    },
    {
      id: "hip-thigh-shape",
      label: "Hip and thigh shape",
      measurementTargets: ["hipCircumference", "upperThighCircumference"],
      muscleGroups: ["glutes", "hamstrings", "quads"],
      exerciseIds: ["romanian-deadlift", "split-squat"],
      rationale: "Glute and leg training are trainable contributors to these circumference changes."
    }
  ],
  programTemplates: [
    {
      id: "upper-lower-foundation",
      label: "Upper/lower foundation",
      goalIds: ["shoulder-waist-ratio"],
      summary: "Four-day seed template for delts, back, legs, and repeatable progression logs.",
      days: [
        {
          label: "Upper A",
          exercises: [
            { exerciseId: "incline-press", sets: 3, reps: "8-12" },
            { exerciseId: "lat-pulldown", sets: 3, reps: "8-12" },
            { exerciseId: "dumbbell-lateral-raise", sets: 4, reps: "12-20" }
          ]
        }
      ]
    },
    {
      id: "shape-recomp-starter",
      label: "Shape recomp starter",
      goalIds: ["waist-hip-ratio", "weekly-check-in"],
      summary: "Three-session seed template for waist trend tracking and shape work.",
      days: [
        {
          label: "Full body A",
          exercises: [
            { exerciseId: "split-squat", sets: 3, reps: "8-12" },
            { exerciseId: "lat-pulldown", sets: 3, reps: "8-12" }
          ]
        }
      ]
    }
  ]
};

const measurementGuideLibrary = {
  version: 1,
  reference: "Dummy measurement how-to guide copy for user validation.",
  notes: ["Keep tape level and relaxed unless a field says otherwise."],
  guides: [
    {
      field: "waistCircumference",
      label: "Waist",
      cadence: "weekly",
      illustration: "waist-tape",
      summary: "Narrowest relaxed torso circumference.",
      steps: [
        "Find the narrowest relaxed point between ribs and hips.",
        "Keep tape level and do not suck in."
      ],
      commonMistakes: ["measuring pants waistband", "bracing abs"]
    },
    {
      field: "bideltoidCircumference",
      label: "Bideltoid circumference",
      cadence: "weekly",
      illustration: "shoulder-loop",
      summary: "Tape around the shoulders at the widest deltoid line.",
      steps: [
        "Wrap tape around the shoulders and upper chest at the deltoid peak.",
        "Keep arms down and relaxed."
      ],
      commonMistakes: ["measuring chest only", "raising the arms"]
    },
    {
      field: "height",
      label: "Height",
      cadence: "monthly",
      illustration: "standing-wall",
      summary: "Standing height without shoes, measured against a wall.",
      steps: ["Stand barefoot with heels near a flat wall."]
    }
  ]
};

function progressPhotoFile(name, color = "#8da9c4") {
  return {
    name,
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect width="120" height="160" fill="#101923"/><circle cx="60" cy="42" r="20" fill="${color}"/><rect x="34" y="70" width="52" height="70" rx="18" fill="${color}"/></svg>`
    )
  };
}

async function mockApi(page) {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({ json: { status: "ok" } });
  });

  await page.route("**/api/planning", async (route) => {
    await route.fulfill({ json: planningData });
  });

  await page.route("**/api/clothing-sizes", async (route) => {
    await route.fulfill({ json: DEFAULT_CLOTHING_SIZE_TABLES });
  });

  await page.route("**/api/exercise-library", async (route) => {
    await route.fulfill({ json: exerciseLibrary });
  });

  await page.route("**/api/measurement-guides", async (route) => {
    await route.fulfill({ json: measurementGuideLibrary });
  });

  await page.route("**/api/targets", async (route) => {
    await route.fulfill({
      json: {
        targets: targets.map(({ score, similarity, explanation, ...target }) => target)
      }
    });
  });

  await page.route("**/api/match", async (route) => {
    await route.fulfill({
      json: {
        top_match: targets[0],
        matches: targets,
        percentiles: {
          height: 44,
          waistCircumference: 26,
          bideltoidCircumference: 43,
          reference: "Approximate adult reference model, not NHANES-calibrated"
        }
      }
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
});

test("loads the core measurement and comparison workflow", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "bodymod" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Measurements", exact: true })).toBeVisible();
  await expect(page.locator('input[name="ankleCircumference"]')).toBeVisible();
  const guidePanel = page.getByLabel("Measurement guides");
  await expect(guidePanel).toBeVisible();
  await expect(guidePanel).toContainText("Narrowest relaxed torso circumference");
  await expect(page.getByLabel("Selected measurement guide")).toContainText("weekly");
  await page.getByLabel("Measurement guide field").selectOption("bideltoidCircumference");
  await expect(guidePanel).toContainText("widest deltoid line");
  await expect(page.getByLabel("Selected measurement guide")).toContainText("raising the arms");
  await expect(page.getByRole("img", { name: "Current profile silhouette" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Waist: 80 cm" }).first()).toBeVisible();
  await expect(page.locator(".top-match-block").getByText("Astarion")).toBeVisible();
  await expect(page.locator(".runner-up-block").getByText("Classic Physique Archetype")).toBeVisible();
  await expect(page.locator(".top-match-block > span")).toHaveText("Similarity score: 89%");
  await expect(page.locator(".runner-up-block small")).toHaveText("Similarity score: 77%");
  await expect(page.locator(".top-match-block")).not.toContainText("TBD");
  await expect(page.getByLabel("Result metric blocks")).toBeVisible();
  const metricBlocks = page.getByLabel("Result metric blocks");
  await expect(metricBlocks.getByText("Est BF%")).toBeVisible();
  await expect(metricBlocks.getByText("FFMI")).toBeVisible();
  await expect(metricBlocks.getByText("Frame", { exact: true })).toBeVisible();
  await expect(metricBlocks.getByText("SHR")).toBeVisible();
  await expect(metricBlocks.getByText("WHR")).toBeVisible();
  await expect(metricBlocks.getByText("SWR")).toBeVisible();
  await expect(metricBlocks.getByText("WHTR")).toBeVisible();
  await expect(page.getByLabel("Body composition estimates")).toContainText("Navy");
  await expect(page.getByLabel("Body composition estimates")).toContainText("RFM");
  await expect(page.getByLabel("Body composition estimates")).toContainText("Frame potential");
  await expect(page.getByLabel("Body composition estimates")).toContainText("Potential FFMI");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download result card" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("bodymod-result-card.svg");
  const downloadedSvg = await readFile(await download.path(), "utf8");
  expect(downloadedSvg).toContain("bodymod");
  expect(downloadedSvg).toContain("Astarion");
  expect(downloadedSvg).toContain("SWR");
  await expect(page.getByLabel("Clothing size estimates")).toContainText("Fit estimates");
  await expect(page.getByLabel("Clothing size estimates")).toContainText("Shirt");
  await expect(page.getByLabel("Clothing size estimates")).toContainText("US M / EU 48 / UK 38");
  await expect(page.getByLabel("Clothing size estimates")).toContainText("Pants");
  await expect(page.getByLabel("Clothing size estimates")).toContainText("US W34 / EU 50 / UK W34");
  await expect(page.getByLabel("Clothing size estimates")).toContainText("Hat");
  await expect(page.getByLabel("Clothing size estimates")).toContainText("Weak wrist proxy");
  await expect(page.getByText("Sexed measurements")).not.toBeVisible();
  await page.getByRole("tab", { name: "vs Target" }).click();
  await expect(page.getByRole("heading", { name: "vs Target" })).toHaveCount(0);
  await expect(page.locator(".comparison-toolbar select")).toHaveValue("astarion");
  await expect(page.getByLabel("Selected target metadata")).toContainText("Astarion");
  await expect(page.getByLabel("Selected target metadata")).toContainText("character");
  await expect(page.getByLabel("Selected target metadata")).toContainText("Estimated placeholder profile.");
  await expect(page.getByLabel("Target match explanation")).toContainText("waist: 4 below target");
  await expect(page.getByLabel("Target measurement difference")).toBeVisible();
  await expect(page.getByLabel("Target measurement difference").getByText("Weight")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "You" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Target" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Diff" })).toBeVisible();
  await expect(page.getByLabel("Target measurement difference").getByText("82.0 kg")).toBeVisible();
  await expect(page.getByLabel("Target measurement difference").getByText("71.0 kg")).toBeVisible();
  await expect(page.getByLabel("Target measurement difference").getByText("+11.0 kg")).toBeVisible();

  await page.getByRole("button", { name: "Overlap" }).click();
  await expect(page.getByLabel("Overlap comparison")).toBeVisible();
  await expect(page.getByLabel("Overlap difference regions")).toHaveCount(0);
  await expect(page.getByLabel("Target measurement difference")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current vs target" })).toHaveCount(0);
  await expect
    .poll(async () =>
      page.locator(".comparison-stage-layer").evaluateAll((layers) => {
        const [user, target] = layers.map((layer) => layer.getBoundingClientRect());
        return Math.abs(user.left - target.left);
      })
    )
    .toBeLessThan(2);

  await page.locator(".comparison-toolbar select").selectOption("classic-physique");
  await expect(page.getByRole("img", { name: "Classic Physique Archetype silhouette" })).toBeVisible();
  await expect(page.getByLabel("Selected target metadata")).toContainText("Broad-shouldered placeholder profile.");

  await expect(page.getByRole("heading", { name: "Matches" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Gender" }).click();
  await expect(page.getByRole("heading", { name: "Gender" })).toHaveCount(0);
  await expect(page.getByLabel("Gender score distribution")).toBeVisible();
  await expect(page.getByLabel("Gender score readout")).toBeVisible();
  await expect(page.getByLabel("Gender score methodology")).toContainText("not identity inference");
  await expect(page.getByLabel("Gender measurement scores").getByText("Shoulder mass")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "FFMI" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Frame index" })).toBeVisible();
  await page.getByRole("button", { name: "Scatter" }).click();
  await expect(page.getByLabel("US population scatter plot")).toBeVisible();
  await expect(page.getByLabel("Population chart legend")).toBeVisible();
  await page.getByRole("button", { name: "Distributions" }).click();
  await expect(page.getByLabel("US population distribution plot")).toBeVisible();
});

test("validates measurements and supports unit display changes", async ({ page }) => {
  const height = page.locator('input[name="height"]');
  await height.fill("");
  await height.blur();
  await expect(page.locator("label").filter({ hasText: "Height" }).getByText("Required")).toBeVisible();

  await height.fill("20");
  await height.blur();

  await expect(page.getByText(/Expected/).first()).toBeVisible();

  await height.fill("180");
  await height.blur();
  await page.locator("label").filter({ hasText: "Height" }).locator(".field-info").hover();
  await expect(page.getByRole("tooltip").getByText("Standing height without shoes.")).toBeVisible();
  await page.getByRole("button", { name: "Imperial" }).first().click();
  await expect(height).toHaveValue(/70\.9|71/);
});

test("supports population chart axis and distribution controls", async ({ page }) => {
  await page.getByRole("tab", { name: "Gender" }).click();
  await expect(page.locator(".visual-column").getByRole("img", { name: /silhouette/i })).toHaveCount(0);
  await expect(page.getByLabel("Gender score distribution")).toBeVisible();
  await expect(page.getByLabel("Gender measurement scores")).toContainText("Derived waist-to-hip ratio");
  await expect(page.getByLabel("Gender measurement scores")).toContainText("11 of 11 metrics");

  await page.getByRole("button", { name: "Scatter" }).click();
  const chart = page.locator(".population-chart");
  await expect(page.getByLabel("US population scatter plot")).toBeVisible();
  await expect(chart.getByText("Height (cm)")).toBeVisible();
  await expect(chart.getByText("Weight (kg)")).toBeVisible();

  await page.getByLabel("X axis").selectOption("hipCircumference");
  await page.getByLabel("Y axis").selectOption("bideltoidCircumference");
  await expect(chart.getByText("Hip (cm)")).toBeVisible();
  await expect(chart.getByText("Shoulder mass (cm)")).toBeVisible();

  await page.getByRole("button", { name: "Distributions" }).click();
  await expect(page.getByLabel("US population distribution plot")).toBeVisible();
  await page.locator(".population-controls select").selectOption("bideltoidCircumference");
  await expect(chart.getByText("Shoulder mass (cm)")).toBeVisible();
  await expect(chart.getByText("You: 118 cm")).toBeVisible();
});

test("handles decimal and pasted measurement values", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:5173"
  });

  const height = page.locator('input[name="height"]');
  const waist = page.locator('input[name="waistCircumference"]');

  await height.fill("180.5");
  await height.blur();
  await expect(
    page.locator("label").filter({ hasText: "Height" }).getByText(/Required|Expected|Enter a number/)
  ).not.toBeVisible();

  await waist.focus();
  await waist.selectText();
  await page.evaluate(() => navigator.clipboard.writeText("79.5"));
  await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
  await waist.blur();

  await expect(waist).toHaveValue("79.5");
  await expect(
    page.locator("label").filter({ hasText: "Waist" }).getByText(/Required|Expected|Enter a number/)
  ).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Waist: 79.5 cm" }).first()).toBeVisible();
});

test("renders silhouettes for extreme but valid measurement profiles", async ({ page }) => {
  const profiles = [
    {
      height: 120,
      weight: 35,
      headCircumference: 45,
      neckCircumference: 25,
      biacromialWidth: 28,
      bideltoidWidth: 34,
      bideltoidCircumference: 70,
      armpitCircumference: 50,
      nippleCircumference: 50,
      underbustCircumference: 50,
      waistCircumference: 45,
      pantWaistCircumference: 45,
      hipCircumference: 60,
      upperThighCircumference: 30,
      midThighCircumference: 25,
      calfCircumference: 20,
      ankleCircumference: 14,
      bicepCircumference: 18,
      upperForearmCircumference: 15,
      wristCircumference: 11
    },
    {
      height: 240,
      weight: 250,
      headCircumference: 70,
      neckCircumference: 65,
      biacromialWidth: 65,
      bideltoidWidth: 85,
      bideltoidCircumference: 180,
      armpitCircumference: 190,
      nippleCircumference: 190,
      underbustCircumference: 180,
      waistCircumference: 180,
      pantWaistCircumference: 190,
      hipCircumference: 200,
      upperThighCircumference: 110,
      midThighCircumference: 95,
      calfCircumference: 70,
      ankleCircumference: 40,
      bicepCircumference: 75,
      upperForearmCircumference: 55,
      wristCircumference: 30
    }
  ];

  for (const profile of profiles) {
    for (const [field, value] of Object.entries(profile)) {
      await page.locator(`input[name="${field}"]`).fill(String(value));
    }
    await page.locator('input[name="ankleCircumference"]').blur();

    await expect(page.locator(".field-error")).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Current profile silhouette" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Waist: ${profile.waistCircumference} cm` }).first()
    ).toBeVisible();
  }
});

test("keeps snapshots off the main Body view", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Snapshots" })).toHaveCount(0);
  await expect(page.getByLabel("Snapshot label")).toHaveCount(0);
  await expect(page.getByLabel("Import snapshots")).toHaveCount(0);
});

test("supports first-run onboarding and snapshot kickoff", async ({ page }) => {
  await expect(page.getByLabel("First run onboarding")).toBeVisible();
  await page.getByRole("button", { name: "Lose fat" }).click();
  await expect(page.getByLabel("Selected onboarding intent")).toContainText("Trend weight");

  const storedGoal = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("bodymod:onboarding-profile:v1"))
  );
  expect(storedGoal.goalId).toBe("lose-fat");
  expect(storedGoal.defaultTab).toBe("diet");

  await page.getByLabel("Onboarding Sex").selectOption("female");
  await page.getByRole("button", { name: "Confirm field" }).click();
  await page.getByLabel("Onboarding Height").fill("166");
  await page.getByRole("button", { name: "Confirm field" }).click();
  await page.getByLabel("Onboarding Weight").fill("62");
  await page.getByRole("button", { name: "Confirm field" }).click();
  await page.getByLabel("Onboarding Waist").fill("68");
  await page.getByRole("button", { name: "Confirm field" }).click();
  await page.getByLabel("Onboarding Bideltoid Circ").fill("96");
  await page.getByRole("button", { name: "Confirm field" }).click();

  await expect(page.getByLabel("Completion meter")).toContainText("5 of 5 core fields confirmed");
  await expect(page.getByLabel("Optional field unlocks")).toContainText("Hip");
  await expect(page.getByLabel("Instant payoff")).toContainText("Astarion");
  await expect(page.getByLabel("Instant payoff")).toContainText("Height 44th pct");
  await page.getByRole("button", { name: "Save Snapshot #1" }).click();
  await expect(page.getByRole("button", { name: /Snapshot #1 saved/ })).toBeVisible();
});

test("loads the demo profile from the first-run screen", async ({ page }) => {
  await page.getByRole("button", { name: "Explore with a sample profile" }).click();
  await expect(page.locator('input[name="height"]')).toHaveValue("173");
  await expect(page.locator('input[name="waistCircumference"]')).toHaveValue("72");
  await expect(page.getByLabel("Completion meter")).toContainText("5 of 5 core fields confirmed");

  const storedProfile = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("bodymod:onboarding-profile:v1"))
  );
  expect(storedProfile.demoMode).toBe(true);
  expect(storedProfile.goalId).toBe("just-curious");
});

test("shares measurements from the header icon and restores them from the URL", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:5173" });
  await expect(page.getByLabel("Share URL")).toHaveCount(0);

  await page.getByRole("button", { name: "Share current measurements" }).click();
  await expect(page.getByText(/Share link copied|Copy failed/)).toBeVisible();

  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareUrl).toContain("m=");
  await page.goto(shareUrl);
  await expect(page.locator('input[name="height"]')).toHaveValue("180");
  await expect(page).toHaveURL(/m=/);
});

test("creates a local account, logs a snapshot, sets a goal, and logs back in", async ({ page }) => {
  await page.getByRole("button", { name: "User profile" }).click();
  const accountDialog = page.getByRole("dialog", { name: "Account, logs, and goals" });
  await expect(accountDialog).toBeVisible();
  await expect(accountDialog).toContainText("Loaded 10 personas, 6 goals, and 6 protocols.");

  await page.getByLabel("Display name").fill("Mason");
  await page.getByLabel("Account email").fill("mason@example.com");
  await page.getByLabel("Persona sample").selectOption("recomp-lifter");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(accountDialog).toContainText("Persona measurements loaded.");
  await expect(accountDialog).toContainText("Mason");
  await expect(accountDialog).toContainText("Snapshots");
  await expect(page.getByLabel("Account email")).not.toBeVisible();

  await page.getByLabel("Daily weight").fill("86.4");
  await page.getByLabel("Daily calories").fill("2400");
  await page.getByLabel("Check-in note").fill("Low sodium day.");
  await page.getByRole("button", { name: "Log daily check-in" }).click();
  await expect(page.getByLabel("Check-in summary")).toContainText("Trend weight: 86.4 kg");
  await expect(page.getByLabel("Check-in history")).toContainText("Daily weight: 86.4 kg / 2400 kcal");
  await page.getByLabel("Daily weight").fill("85.9");
  await page.getByRole("button", { name: "Log daily check-in" }).click();
  await expect(page.getByLabel("Check-in summary")).toContainText("Trend weight: 86.3 kg");
  await expect(page.getByLabel("Trend weight line vs raw daily weight dots")).toBeVisible();
  await expect(page.getByLabel("Insight drops")).toContainText("Trend weight is down");
  await page.getByRole("button", { name: "Save weekly check-in" }).click();
  await expect(page.getByLabel("Check-in history")).toContainText("Weekly measurements: waist 86.0 cm");
  await expect(page.getByLabel("Insight drops")).toContainText("Latest weekly check-in saved waist 86.0 cm");

  await page.getByLabel("Snapshot label").fill("Baseline");
  await page.getByLabel("Snapshot note").fill("First persona walkthrough log.");
  await page.getByRole("button", { name: "Save current snapshot" }).click();
  await expect(accountDialog.getByText("Baseline")).toBeVisible();
  await expect(accountDialog.getByText("181 cm / 86 kg / male / waist 86")).toBeVisible();

  await page.getByLabel("Goal preset").selectOption("shoulder-waist-ratio");
  await page.getByLabel("Goal note").fill("Prioritize waist trend and deltoid circumference.");
  await expect(page.getByLabel("Suggested protocols")).toContainText("Progressive resistance training");
  await expect(page.getByLabel("Suggested protocols")).toContainText("Calorie target with weekly trend review");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByLabel("Saved goals")).toContainText("Improve shoulder-to-waist ratio");
  await expect(page.getByLabel("Saved goals")).toContainText("Progress: 0%");
  await expect(page.getByLabel("Improve shoulder-to-waist ratio progress")).toContainText("Waist: 86.0 / target 82.0 cm");
  await expect(page.getByLabel("Saved goals")).toContainText("0 check-in(s)");
  await expect(page.getByLabel("Insight drops")).toContainText("1 saved goal(s)");
  await page.getByRole("button", { name: "On track" }).click();
  await expect(page.getByLabel("Saved goals")).toContainText("1 check-in(s)");

  await page.getByLabel("Protocol template").selectOption("resistance-training");
  await page.getByLabel("Protocol dose").fill("4-day upper/lower split");
  await page.getByLabel("Protocol frequency").fill("4 sessions/week");
  await page.getByLabel("Protocol confounders").fill("Travel week noted.");
  await page.getByRole("button", { name: "Start protocol" }).click();
  await expect(page.getByLabel("Active protocols")).toContainText("Progressive resistance training");
  await expect(page.getByLabel("Insight drops")).toContainText("1 active protocol(s)");
  await expect(page.getByLabel("Active protocols")).toContainText("0 adherence check-in(s)");
  await expect(page.getByLabel("Active protocols")).toContainText("Dose: 4-day upper/lower split; frequency: 4 sessions/week");
  await page.getByRole("button", { name: "Protocol on track" }).click();
  await expect(page.getByLabel("Active protocols")).toContainText("1 adherence check-in(s)");
  await page.getByRole("button", { name: "Archive protocol" }).click();
  await expect(page.getByLabel("Active protocols")).toContainText("archived");

  await expect(page.getByLabel("Workout library")).toContainText("Loaded 6 exercise seeds and 2 programs.");
  await expect(page.getByLabel("Aesthetic movement mapping")).toContainText("Shoulder width / delts");
  await expect(page.getByLabel("Program templates")).toContainText("Upper/lower foundation");
  await page.getByLabel("Exercise").selectOption("dumbbell-lateral-raise");
  await page.getByLabel("Workout sets").fill("3");
  await page.getByLabel("Workout reps").fill("12");
  await page.getByLabel("Workout load").fill("8");
  await page.getByLabel("Workout RPE").fill("8");
  await page.getByLabel("Workout note").fill("Strict reps.");
  await page.getByRole("button", { name: "Log workout" }).click();
  await expect(page.getByLabel("Recent workout sessions")).toContainText("Dumbbell lateral raise: 3 x 12 x 8 kg");
  await expect(page.getByLabel("Lift PRs")).toContainText("8 kg best");
  await expect(page.getByLabel("Lift history charts")).toContainText("Volume PR 288 kg");
  await expect(page.getByRole("img", { name: "Dumbbell lateral raise load and volume progression" })).toBeVisible();
  await page.getByRole("button", { name: "Repeat latest workout" }).click();
  await expect(page.getByLabel("Lift PRs")).toContainText("2 session(s)");
  await expect(page.getByLabel("Lift history charts")).toContainText("2 session(s)");

  await page.getByLabel("Photo category").selectOption("body");
  await page.getByLabel("Photo note").fill("Baseline front pose.");
  await page.getByLabel("Import progress photo").setInputFiles(
    progressPhotoFile("baseline-body.svg", "#8da9c4")
  );
  await expect(accountDialog).toContainText("Saved body photo locally.");
  await expect(page.getByLabel("Progress photo gallery")).toContainText("Baseline front pose.");
  await expect(page.getByLabel("Pose ghost overlay")).toBeVisible();
  await page.getByLabel("Photo note").fill("Week 1 front pose.");
  await page.getByLabel("Import progress photo").setInputFiles(
    progressPhotoFile("week-1-body.svg", "#f2f0e8")
  );
  await expect(page.getByLabel("Photo comparison slider")).toBeVisible();
  await page.getByLabel("Photo comparison position").fill("65");
  await expect(page.getByLabel("Photo stream counts")).toContainText("Body 2");
  await expect(page.getByLabel("Photo beside silhouette")).toContainText("body");

  await expect(page.getByLabel("Progress report")).toContainText("1 snapshot(s)");
  const reportDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download progress report" }).click();
  const reportDownload = await reportDownloadPromise;
  expect(reportDownload.suggestedFilename()).toBe("bodymod-progress-report.html");
  const reportHtml = await readFile(await reportDownload.path(), "utf8");
  expect(reportHtml).toContain("bodymod progress report");
  expect(reportHtml).toContain("Mason");
  expect(reportHtml).toContain("Progressive resistance training");
  expect(reportHtml).toContain("Dumbbell lateral raise");
  expect(reportHtml).toContain("Photo manifest");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(accountDialog).toContainText("Logged out of this browser profile.");
  await page.getByLabel("Login email").fill("mason@example.com");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(accountDialog).toContainText("Signed in as Mason.");
  await expect(page.getByLabel("Saved goals")).toContainText("Improve shoulder-to-waist ratio");
  await expect(page.getByLabel("Active protocols")).toContainText("Progressive resistance training");
  await expect(page.getByLabel("Active protocols")).toContainText("1 adherence check-in(s)");
  await expect(page.getByLabel("Recent workout sessions")).toContainText("Dumbbell lateral raise");
  await expect(page.getByLabel("Progress photo gallery")).toContainText("Week 1 front pose.");
  await expect(page.getByLabel("Photo comparison slider")).toBeVisible();
  await expect(page.getByLabel("Check-in history")).toContainText("Weekly measurements: waist 86.0 cm");
  await expect(page.getByLabel("Check-in summary")).toContainText("2 log(s)");

  await page.getByRole("button", { name: "Close account panel" }).click();
  await expect(page.locator('input[name="height"]')).toHaveValue("181");
});

test("roleplays all persona samples through account logging, goals, and learning", async ({ page }) => {
  await page.getByRole("button", { name: "User profile" }).click();
  const accountDialog = page.getByRole("dialog", { name: "Account, logs, and goals" });
  await expect(accountDialog).toContainText("Loaded 10 personas, 6 goals, and 6 protocols.");

  for (const persona of planningData.personas) {
    const displayName = persona.label.split(",")[0];
    const email = `${persona.id}@example.com`;
    const goal =
      planningData.goalPresets.find((preset) => persona.likelyGoals.includes(preset.id)) ||
      planningData.goalPresets[0];

    await page.getByLabel("Display name").fill(displayName);
    await page.getByLabel("Account email").fill(email);
    await page.getByLabel("Persona sample").selectOption(persona.id);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(accountDialog).toContainText("Persona measurements loaded.");
    await expect(page.locator('input[name="height"]')).toHaveValue(String(persona.startingMeasurements.height));
    await expect(page.locator('input[name="waistCircumference"]')).toHaveValue(
      String(persona.startingMeasurements.waistCircumference)
    );

    await page.getByLabel("Daily weight").fill(String(persona.startingMeasurements.weight));
    await page.getByLabel("Daily calories").fill("2300");
    await page.getByLabel("Check-in note").fill(`${persona.segment} check-in.`);
    await page.getByRole("button", { name: "Log daily check-in" }).click();
    await expect(page.getByLabel("Check-in history")).toContainText("Daily weight");
    await expect(page.getByLabel("Insight drops")).toContainText("Trend weight");
    await page.getByRole("button", { name: "Save weekly check-in" }).click();
    await expect(page.getByLabel("Check-in history")).toContainText("Weekly measurements");

    await page.getByLabel("Snapshot label").fill(`${persona.id} baseline`);
    await page.getByLabel("Snapshot note").fill(`${persona.segment} persona walkthrough.`);
    await page.getByRole("button", { name: "Save current snapshot" }).click();
    await expect(accountDialog.getByText(`${persona.id} baseline`)).toBeVisible();

    await page.getByLabel("Goal preset").selectOption(goal.id);
    await page.getByLabel("Goal note").fill(`Roleplaying ${persona.segment}.`);
    await expect(page.getByLabel("Suggested protocols")).toBeVisible();
    await page.getByRole("button", { name: "Save goal" }).click();
    await expect(page.getByLabel("Saved goals")).toContainText(goal.label);
    if (Object.keys(goal.targetMetrics || {}).length) {
      await expect(page.getByLabel("Saved goals")).toContainText("Progress:");
    }
    await expect(page.getByLabel("Saved goals")).toContainText("0 check-in(s)");

    await page.getByRole("button", { name: "Needs adjustment" }).click();
    await expect(page.getByLabel("Saved goals")).toContainText("1 check-in(s)");

    const protocolId = goal.suggestedProtocols[0];
    if (protocolId) {
      await page.getByLabel("Protocol template").selectOption(protocolId);
      await page.getByLabel("Protocol dose").fill(`${persona.segment} starter plan`);
      await page.getByLabel("Protocol frequency").fill("weekly review");
      await page.getByLabel("Protocol confounders").fill(`${persona.id} confounder note.`);
      await page.getByRole("button", { name: "Start protocol" }).click();
      await expect(page.getByLabel("Active protocols")).toContainText("0 adherence check-in(s)");
      await page.getByRole("button", { name: "Protocol missed" }).click();
      await expect(page.getByLabel("Active protocols")).toContainText("1 adherence check-in(s)");
    }

    await expect(page.getByLabel("Workout library")).toBeVisible();
    await page.getByLabel("Exercise").selectOption("dumbbell-lateral-raise");
    await page.getByLabel("Workout sets").fill("2");
    await page.getByLabel("Workout reps").fill("10");
    await page.getByLabel("Workout load").fill("6");
    await page.getByRole("button", { name: "Log workout" }).click();
    await expect(page.getByLabel("Recent workout sessions")).toContainText("Dumbbell lateral raise");
    await expect(page.getByLabel("Lift PRs")).toContainText("6 kg best");
    await expect(page.getByLabel("Lift history charts")).toContainText("Volume PR 120 kg");

    const photoCategory =
      persona.id === "face-metric-curious"
        ? "face"
        : persona.id === "glow-up-planner"
          ? "hair"
          : "body";
    await page.getByLabel("Photo category").selectOption(photoCategory);
    await page.getByLabel("Photo note").fill(`${persona.segment} day-0 photo.`);
    await page.getByLabel("Import progress photo").setInputFiles(
      progressPhotoFile(`${persona.id}-${photoCategory}.svg`)
    );
    await expect(page.getByLabel("Progress photo gallery")).toContainText(`${persona.segment} day-0 photo.`);

    await page.getByLabel("Signed-in persona sample").selectOption(persona.id);
    await page.getByRole("button", { name: "Load persona measurements" }).click();
    await expect(accountDialog).toContainText(`${persona.label} measurements loaded into the form.`);

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(accountDialog).toContainText("Logged out of this browser profile.");
  }

  await page.getByLabel("Login email").fill("coach-client@example.com");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(accountDialog).toContainText("Signed in as Morgan.");
  await expect(page.getByLabel("Saved goals")).toContainText("Weekly measurement check-in");
  await expect(page.getByLabel("Active protocols")).toContainText("Weekly tape-measurement cadence");

  await page.getByRole("button", { name: "Learn from strategy corpus" }).click();
  await expect(page.getByRole("heading", { name: "Strategy explorer" })).toBeVisible();
  await expect(page.getByText("This is not advice")).toBeVisible();
});

test("searches food data, looks up barcodes, and logs diet totals", async ({ page }) => {
  await page.route("https://world.openfoodfacts.org/**", async (route) => {
    const url = route.request().url();
    const product = {
      code: "1234567890123",
      product_name: "Mock Skyr",
      brands: "Test Dairy",
      serving_size: "150 g",
      nutriments: {
        "energy-kcal_serving": 140,
        proteins_serving: 20,
        carbohydrates_serving: 10,
        fat_serving: 1,
        fiber_serving: 0,
        sugars_serving: 7,
        sodium_serving: 0.06,
        calcium_serving: 0.18,
        iron_serving: 0.0002
      }
    };

    if (url.includes("/api/v2/product/")) {
      await route.fulfill({ json: { code: "1234567890123", product } });
      return;
    }

    await route.fulfill({ json: { products: [product] } });
  });

  await page.getByRole("tab", { name: "Diet" }).click();
  await expect(page.getByRole("heading", { name: "Diet" })).toBeVisible();
  await expect(page.getByLabel("Diet macro targets")).toContainText("2790");
  await expect(page.getByLabel("Diet macro targets")).toContainText("0 kg/week");
  await expect(page.getByLabel("Diet macro totals")).toBeVisible();

  await page.getByRole("textbox", { name: "Food search" }).fill("skyr");
  await page.getByRole("button", { name: "Search foods" }).click();
  await expect(page.getByText("Found 1 food(s).")).toBeVisible();
  await expect(page.getByLabel("Food search results").getByText("Mock Skyr")).toBeVisible();

  await page.getByLabel("Servings").fill("2");
  await page.getByRole("button", { name: "Add selected" }).click();
  await expect(page.getByLabel("Diet log entries").getByText("Mock Skyr")).toBeVisible();
  await expect(page.getByLabel("Diet macro totals").getByText("280")).toBeVisible();
  await expect(page.getByLabel("Diet macro totals").getByText("40")).toBeVisible();
  await expect(page.getByLabel("Diet macro totals")).toContainText("Target 2790 kcal / 10%");
  await page.getByLabel("Diet goal").selectOption("standard-loss");
  await expect(page.getByLabel("Diet macro targets")).toContainText("2290");
  await expect(page.getByLabel("Diet macro targets")).toContainText("about -0.45 kg/week");
  await expect(page.getByLabel("Diet macro totals")).toContainText("Target 2290 kcal / 12%");
  await expect(page.getByLabel("Diet micronutrient totals").getByText("Calcium")).toBeVisible();

  await page.getByLabel("Custom food name").fill("Tofu bowl");
  await page.getByLabel("Custom food brand").fill("Home recipe");
  await page.getByLabel("Custom food serving").fill("1 bowl");
  await page.getByLabel("Custom food calories").fill("520");
  await page.getByLabel("Custom food protein").fill("34");
  await page.getByLabel("Custom food carbs").fill("54");
  await page.getByLabel("Custom food fat").fill("18");
  await page.getByRole("button", { name: "Save custom food" }).click();
  await expect(page.getByText("Saved custom food Tofu bowl.")).toBeVisible();
  const tofuRow = page.getByLabel("Food search results").locator("li").filter({ hasText: "Tofu bowl" });
  await expect(tofuRow).toContainText("520 kcal / P 34g / C 54g / F 18g");
  await tofuRow.getByRole("button", { name: "Favorite" }).click();
  await expect(page.getByLabel("Quick diet foods")).toContainText("Tofu bowl");
  await page
    .getByLabel("Quick diet foods")
    .locator("li")
    .filter({ hasText: "Tofu bowl" })
    .first()
    .getByRole("button", { name: "Add" })
    .click();
  await expect(page.getByLabel("Diet log entries").getByText("Tofu bowl")).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Diet" }).click();
  await expect(page.getByLabel("Quick diet foods")).toContainText("Tofu bowl");
  await expect(page.getByLabel("Food search results")).toContainText("Tofu bowl");
  await page.getByLabel("Meal name").fill("Training breakfast");
  await page.getByRole("button", { name: "Save current log as meal" }).click();
  await expect(page.getByLabel("Saved meals")).toContainText("Training breakfast");
  await expect(page.getByLabel("Saved meals")).toContainText("2 item(s)");
  await page.getByLabel("Saved meals").getByRole("button", { name: "Add meal" }).click();
  await expect(page.getByText("Logged meal Training breakfast (2 item(s)).")).toBeVisible();
  await page.getByRole("button", { name: "Copy latest day" }).click();
  await expect(page.getByText(/Copied latest logged day/)).toBeVisible();
  await expect(page.getByLabel("Fluid log")).toContainText("Target 2850 ml / 0%");
  await page.getByLabel("Fluid amount").fill("600");
  await page.getByLabel("Fluid label").fill("Electrolytes");
  await page.getByRole("button", { name: "Log fluid" }).click();
  await expect(page.getByLabel("Fluid log")).toContainText("Electrolytes: 600 ml");
  await page.getByLabel("Fluid presets").getByRole("button", { name: "500 ml" }).click();
  await expect(page.getByLabel("Fluid log")).toContainText("Target 2850 ml / 39%");
  await expect(page.getByLabel("Fluid log")).toContainText("Water: 500 ml");
  await page.reload();
  await page.getByRole("tab", { name: "Diet" }).click();
  await expect(page.getByLabel("Saved meals")).toContainText("Training breakfast");
  await expect(page.getByLabel("Fluid log")).toContainText("Electrolytes: 600 ml");
  await expect(page.getByLabel("Fluid log")).toContainText("Target 2850 ml / 39%");

  await page.getByRole("textbox", { name: "Barcode" }).fill("1234567890123");
  await page.getByRole("button", { name: "Lookup barcode" }).click();
  await expect(page.getByText("Barcode matched Mock Skyr.")).toBeVisible();

  await page.evaluate(() => {
    navigator.mediaDevices = {
      getUserMedia: async () => ({
        getTracks: () => [{ stop: () => {} }]
      })
    };
    HTMLMediaElement.prototype.play = async () => {};
  });
  await page.getByRole("button", { name: "Scan" }).click();
  await expect(
    page.getByText(/Camera access granted|Point the camera at a barcode|Camera barcode scan failed/)
  ).toBeVisible();
});

test("exposes method, privacy, and strategy corpus content", async ({ page }) => {
  await page.getByRole("button", { name: "Method / privacy" }).hover();
  await expect(page.getByRole("heading", { name: "Method" })).toBeVisible();
  await expect(page.getByText("100 * exp(-(distance ^ 1.5))")).toBeVisible();
  await expect(page.getByText("Share links encode measurement values")).toBeVisible();
  await expect(page.getByText(/Local usage events stored: \d+/)).toBeVisible();
  await page.getByRole("button", { name: "Clear local events" }).click();
  await expect(page.getByText("Local usage events stored: 0")).toBeVisible();
  await expect(page.getByText("Local usage events cleared from this browser.")).toBeVisible();

  await page.getByRole("button", { name: "Build Plan" }).click();
  await expect(page.getByRole("heading", { name: "Strategy explorer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "I want to..." })).toBeVisible();
  await expect(page.getByLabel("Gain Weight efficacy and risk plot")).toBeVisible();
  await expect(page.getByText("This is not advice")).toBeVisible();
  await expect(page.getByLabel("Filter selected outcome confidence")).toBeVisible();
  await expect(page.getByText("Loaded 8 outcome(s) with 0 reviewed")).toBeVisible();

  const corpusDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export corpus JSON" }).click();
  const corpusDownload = await corpusDownloadPromise;
  expect(corpusDownload.suggestedFilename()).toBe("bodymod-strategy-corpus.json");

  await page.getByRole("button", { name: "Alter Perceived Structure" }).click();
  await expect(page.getByText("Orthognathic surgery")).toBeVisible();
  await page.getByRole("button", { name: /Orthognathic surgery: efficacy/ }).click();
  const strategyDialog = page.getByRole("dialog", { name: "Strategy synopsis" });
  await expect(strategyDialog).toBeVisible();
  await expect(strategyDialog.getByText("higher confidence")).toBeVisible();
  await page.getByRole("button", { name: "Open strategy page" }).click();
  await expect(page.getByRole("heading", { name: "Orthognathic surgery" })).toBeVisible();
  await expect(page.getByText("Claimed mechanism:")).toBeVisible();
  await page.getByRole("button", { name: "Back to outcome map" }).click();

  await page.getByLabel("Search selected outcome strategies").fill("retinoid");
  await expect(page.getByText("No strategies match this outcome filter.")).toBeVisible();

  await page.getByRole("button", { name: "Alter Skin Appearance" }).click();
  await expect(page.getByText("Topical retinoid skin protocol")).toBeVisible();

  const reviewedCorpus = {
    version: 1,
    outcomes: [
      {
        id: "reviewed-test-outcome",
        label: "Reviewed Test Outcome",
        description: "Imported source-reviewed test outcome.",
        strategies: [
          {
            name: "Reviewed source entry",
            outcome: "test outcome",
            interventionType: "manual research",
            efficacy: 51,
            risk: 22,
            evidence: "moderate",
            reviewStatus: "needs source review",
            sourceLinks: [
              {
                title: "Example source",
                url: "https://example.com/source",
                sourceType: "review article",
                reviewedAt: "2026-05-03"
              }
            ],
            sensitivity: "low",
            reversibility: "medium",
            timeHorizon: "months",
            cost: "low",
            claimedMechanism: "Imported entries preserve claimed mechanism text.",
            expectedMagnitude: "Imported entries preserve expected magnitude text.",
            contraindicationFlags: ["manual review flag"],
            legalNotes: "Imported legal note.",
            uncertaintyNotes: "Imported entries preserve uncertainty notes.",
            notes: "Imported entries can replace the seed corpus."
          }
        ]
      }
    ]
  };

  await page.getByLabel("Import strategy corpus").setInputFiles({
    name: "bodymod-strategy-corpus.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(reviewedCorpus))
  });

  await expect(page.getByText("Imported 1 outcome(s).")).toBeVisible();
  await expect(page.getByText("Reviewed source entry")).toBeVisible();
  await expect(page.getByText("Loaded 1 outcome(s) with 1 reviewed")).toBeVisible();
  await page.getByRole("button", { name: /Reviewed source entry: efficacy/ }).click();
  await page.getByRole("button", { name: "Open strategy page" }).click();
  await expect(page.getByText("Flags: manual review flag")).toBeVisible();
  await expect(page.getByText("Legal/regulatory: Imported legal note.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Example source" })).toHaveAttribute(
    "href",
    "https://example.com/source"
  );
  await expect(page.getByText("review article / reviewed 2026-05-03")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Build Plan" }).click();
  await expect(page.getByText("Reviewed source entry")).toBeVisible();

  await page.getByRole("button", { name: "Reset seed corpus" }).click();
  await expect(page.getByText("Seed corpus restored for this browser.")).toBeVisible();
  await expect(page.getByText("Reviewed source entry")).not.toBeVisible();
  await expect(page.getByText("Calorie surplus with resistance training")).toBeVisible();
});

test("keeps local form usable when backend is unavailable", async ({ page }) => {
  await page.route("**/api/**", (route) => route.abort());
  await page.goto("/");

  await expect(page.getByText("Backend unavailable. Results are limited.")).toBeVisible();
  await expect(
    page.getByText("Target comparison is available once target profiles are loaded.")
  ).not.toBeVisible();
  await page.getByRole("tab", { name: "vs Target" }).click();
  await expect(
    page.getByText("Target comparison is available once target profiles are loaded.")
  ).toBeVisible();
  await page.locator("label").filter({ hasText: "Height" }).locator(".field-info").hover();
  await expect(page.getByRole("tooltip").getByText("Standing height without shoes.")).toBeVisible();
  await expect(page.getByLabel("Snapshot label")).toHaveCount(0);
});
