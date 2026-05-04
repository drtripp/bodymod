import { expect, test } from "@playwright/test";

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
    explanation: ["waist: 4 below target", "shoulder mass: 10 above target"],
    measurements: targetMeasurements
  },
  {
    id: "classic-physique",
    label: "Classic Physique Archetype",
    source_type: "archetype",
    notes: "Broad-shouldered placeholder profile.",
    score: 0.411,
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

async function mockApi(page) {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({ json: { status: "ok" } });
  });

  await page.route("**/api/targets", async (route) => {
    await route.fulfill({
      json: {
        targets: targets.map(({ score, explanation, ...target }) => target)
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
  await page.setViewportSize({ width: 390, height: 900 });
  await mockApi(page);
  await page.goto("/");
});

test("keeps the dense workflow usable on a phone viewport", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "bodymod" })).toBeVisible();
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
  await page.getByRole("button", { name: "Alter Perceived Structure" }).click();
  await expect(page.getByText("Orthognathic surgery")).toBeVisible();

  const bodyBox = await page.locator("body").boundingBox();
  const viewport = page.viewportSize();
  expect(bodyBox.width).toBeLessThanOrEqual(viewport.width + 1);
});
