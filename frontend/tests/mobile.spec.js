import { expect, test } from "@playwright/test";
import { fallbackPopulationReference } from "../src/lib/populationCharts.js";
import { strategyOutcomes } from "../src/lib/strategyCorpus.js";

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

const measurementGuideLibrary = {
  version: 1,
  reference: "Dummy measurement how-to guide copy for mobile tests.",
  guides: [
    {
      field: "waistCircumference",
      label: "Waist",
      cadence: "weekly",
      illustration: "waist-tape",
      summary: "Narrowest relaxed torso circumference.",
      steps: ["Find the narrowest relaxed point between ribs and hips."]
    }
  ]
};

const entitlementConfig = {
  version: 1,
  currentTier: "free",
  source: "Mock entitlement config.",
  tiers: [
    { id: "free", label: "Free", summary: "All current tracking remains free." },
    { id: "pro", label: "Pro", summary: "Future paid tier." }
  ],
  features: [
    {
      id: "measurement-tracking",
      label: "Measurement tracking",
      tier: "free",
      status: "available",
      category: "Tracking",
      summary: "Manual measurements and snapshots."
    },
    {
      id: "ai-data-explainer",
      label: "AI explain my data",
      tier: "pro",
      status: "preview",
      category: "Compute",
      summary: "Future bounded assistant."
    }
  ],
  nonPaywalledFeatureIds: ["measurement-tracking"],
  waitlist: { enabled: true, storage: "local-only", message: "Join the local Pro waitlist." }
};

async function mockApi(page) {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({ json: { status: "ok" } });
  });

  await page.route("**/api/targets", async (route) => {
    await route.fulfill({
      json: {
        targets: targets.map(({ score, similarity, explanation, ...target }) => target)
      }
    });
  });

  await page.route("**/api/measurement-guides", async (route) => {
    await route.fulfill({ json: measurementGuideLibrary });
  });

  await page.route("**/api/reference-data", async (route) => {
    await route.fulfill({ json: fallbackPopulationReference });
  });

  await page.route("**/api/entitlements", async (route) => {
    await route.fulfill({ json: entitlementConfig });
  });

  await page.route("**/api/strategy-corpus", async (route) => {
    await route.fulfill({
      json: {
        version: 1,
        source: "Mock backend strategy corpus seed.",
        notes: ["Mocked mobile strategy corpus source."],
        outcomes: strategyOutcomes
      }
    });
  });

  await page.route("**/api/corpus-moderation-policy", async (route) => {
    await route.fulfill({
      json: {
        version: 1,
        source: "Mock mobile corpus moderation policy.",
        notes: ["Metadata only."],
        publicationModes: [
          {
            id: "private-review-only",
            label: "Private review-only queue",
            reviewStatus: "current prototype default; needs review before public launch",
            availability: "prototype-default",
            notes: ["Queue only."]
          }
        ],
        rules: [
          {
            id: "case-log-publication",
            label: "Case-log publication review",
            category: "moderation",
            appliesTo: ["submitted-case-log"],
            reviewStatus: "needs moderation policy review",
            blocking: true,
            decisionsRequired: ["Reviewer roles"],
            exclusionTriggers: ["Private data"],
            allowedCurrentScaffold: ["Queue only"],
            verification: ["npm run test:corpus-moderation"],
            docs: ["manual-work-queue.md#6-launch-privacy-and-moderation-approvals"]
          }
        ]
      }
    });
  });

  await page.route("**/api/native-release-readiness", async (route) => {
    await route.fulfill({
      json: {
        version: 1,
        source: "Mock mobile native release readiness.",
        notes: ["Metadata only."],
        items: [
          {
            id: "generated-native-projects",
            label: "Generated iOS/Android project folders",
            category: "project-bootstrap",
            status: "native-project-required",
            blocking: true,
            owner: "Dawson",
            platforms: ["ios", "android"],
            launchGateIds: ["native-release-readiness"],
            releaseRequirement: "Generate native project folders.",
            decisionsRequired: ["Bundle IDs"],
            currentScaffold: ["capacitor.config.json"],
            validationSteps: ["Run native project generation."],
            verification: ["npm run test:native-release"],
            docs: ["manual-work-queue.md#6-launch-privacy-and-moderation-approvals"],
            metadataOnly: true
          }
        ]
      }
    });
  });

  await page.route("**/api/match-priorities", async (route) => {
    await route.fulfill({
      json: {
        priorities: [
          {
            id: "balanced",
            label: "Balanced",
            summary: "Equal all-around body-shape matching."
          },
          {
            id: "waist-hip",
            label: "Prioritize waist/hip",
            summary: "Weights waist, hip, pant-waist, and waist-to-hip ratio more heavily."
          }
        ]
      }
    });
  });

  await page.route(/\/api\/match(?:\?|$)/, async (route) => {
    await route.fulfill({
      json: {
        top_match: targets[0],
        matches: targets,
        priority: "balanced",
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
  await page.setViewportSize({ width: 390, height: 900 });
  await mockApi(page);
  await page.goto("/");
});

test("keeps the dense workflow usable on a phone viewport", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "bodymod" })).toBeVisible();
  await expect(page.getByLabel("Theme")).toBeVisible();
  await expect(page.getByLabel("Language")).toBeVisible();
  await expect(page.getByRole("button", { name: "Share current measurements" })).toHaveText(/\u2197/);
  await expect(page.getByRole("heading", { name: "Measurements", exact: true })).toBeVisible();
  await expect(page.locator(".workspace")).toHaveCSS("grid-template-columns", /390px|366px|358px|1fr/);

  const height = page.locator('input[name="height"]');
  await height.fill("181");
  await height.blur();
  await page.getByRole("button", { name: "Imperial" }).first().click();
  await expect(height).toHaveValue(/71\.3|71/);

  await expect(page.getByRole("heading", { name: "Snapshots" })).toHaveCount(0);
  await expect(page.getByLabel("Snapshot label")).toHaveCount(0);

  await page.getByRole("tab", { name: "vs Target" }).click();
  await page.getByRole("button", { name: "Overlap" }).click();
  await expect(page.getByLabel("Overlap comparison")).toBeVisible();

  await page.getByRole("tab", { name: "Gender" }).click();
  await expect(page.getByLabel("Gender score distribution")).toBeVisible();
  await expect(page.getByLabel("Gender measurement scores")).toBeVisible();

  await page.getByRole("button", { name: "Build Plan" }).click();
  await expect(page.getByRole("heading", { name: "Strategy explorer" })).toBeVisible();
  await expect(page.getByLabel("Strategy corpus age gate")).toContainText("18+ content gate");
  await page.getByRole("button", { name: "I am 18 or older" }).click();
  await page.getByRole("button", { name: "Alter Perceived Structure" }).click();
  await expect(page.getByText("Orthognathic surgery")).toBeVisible();

  const bodyBox = await page.locator("body").boundingBox();
  const viewport = page.viewportSize();
  expect(bodyBox.width).toBeLessThanOrEqual(viewport.width + 1);
});
