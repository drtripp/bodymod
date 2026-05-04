import { chromium } from "@playwright/test";

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

const browser = await chromium.launch();

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 1200 }],
  ["mobile", { width: 390, height: 900 }]
]) {
  const page = await browser.newPage({ viewport });
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { status: "ok" } })
  );
  await page.route("**/api/targets", (route) =>
    route.fulfill({
      json: {
        targets: targets.map(({ score, explanation, ...target }) => target)
      }
    })
  );
  await page.route("**/api/match", (route) =>
    route.fulfill({
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
    })
  );

  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("heading", { name: "Top match" }).waitFor();
  await page.locator(".top-match-block").getByText("Astarion").waitFor();
  await page.getByRole("tab", { name: "vs Target" }).click();
  await page.getByRole("button", { name: "Overlap" }).click();
  await page.waitForTimeout(650);
  await page.screenshot({
    path: `../review-screenshots/${name}.png`,
    fullPage: true
  });
  await page.close();
}

await browser.close();
