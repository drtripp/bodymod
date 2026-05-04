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
  await mockApi(page);
  await page.goto("/");
});

test("loads the core measurement and comparison workflow", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "bodymod" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Measurements", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Current profile silhouette" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Waist: 80 cm" }).first()).toBeVisible();
  await expect(page.locator(".top-match-block").getByText("Astarion")).toBeVisible();
  await expect(page.locator(".runner-up-block").getByText("Classic Physique Archetype")).toBeVisible();
  await expect(page.locator(".top-match-block > span").getByText("Similarity score:")).toBeVisible();
  await expect(page.getByLabel("Result metric blocks")).toBeVisible();
  await expect(page.getByText("Est BF%")).toBeVisible();
  await expect(page.getByText("SHR")).toBeVisible();
  await expect(page.getByText("WHR")).toBeVisible();
  await expect(page.getByText("SWR")).toBeVisible();
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
  await expect(page.getByLabel("Target measurement difference").getByText("+11.0 kg")).toBeVisible();

  await page.getByRole("button", { name: "Overlap" }).click();
  await expect(page.getByLabel("Overlap comparison")).toBeVisible();
  await expect(page.getByLabel("Overlap difference regions")).toBeVisible();
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

  await page.getByRole("tab", { name: "vs US Population" }).click();
  await expect(page.getByRole("heading", { name: "vs US Population" })).toHaveCount(0);
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
  await page.getByRole("button", { name: "Imperial" }).first().click();
  await expect(height).toHaveValue(/70\.9|71/);
});

test("supports population chart axis and distribution controls", async ({ page }) => {
  await page.getByRole("tab", { name: "vs US Population" }).click();
  await expect(page.getByRole("img", { name: /silhouette/i })).toHaveCount(0);

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
      bicepCircumference: 75,
      upperForearmCircumference: 55,
      wristCircumference: 30
    }
  ];

  for (const profile of profiles) {
    for (const [field, value] of Object.entries(profile)) {
      await page.locator(`input[name="${field}"]`).fill(String(value));
    }
    await page.locator('input[name="wristCircumference"]').blur();

    await expect(page.locator(".field-error")).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Current profile silhouette" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Waist: ${profile.waistCircumference} cm` }).first()
    ).toBeVisible();
  }
});

test("saves snapshots and compares the current profile against one", async ({ page }) => {
  await page.getByLabel("Snapshot label").fill("Baseline");
  await page.getByLabel("Snapshot note").fill("Starting measurement note");
  await page.getByRole("button", { name: "Save current snapshot" }).click();

  await expect(page.getByText("Baseline", { exact: true })).toBeVisible();
  await expect(page.getByText("Starting measurement note")).toBeVisible();
  await expect(page.getByLabel("Snapshot note")).toHaveValue("");

  await page.locator('input[name="waistCircumference"]').fill("92");
  await page.locator('input[name="waistCircumference"]').blur();
  await page.getByLabel("Snapshot label").fill("Later");
  await page.getByRole("button", { name: "Save current snapshot" }).click();

  await expect(page.getByLabel("Snapshot trend summary")).toBeVisible();
  await expect(page.getByLabel("Snapshot trend chart", { exact: true })).toBeVisible();
  await expect(page.getByText("Weight: 82.0 kg")).toBeVisible();
  await expect(page.getByText("Trend since Baseline")).toBeVisible();
  await expect(page.getByLabel("Snapshot trend summary").getByText("+12.0 cm")).toBeVisible();

  await page.locator(".snapshot-row").filter({ hasText: "Baseline" }).getByRole("button", { name: "Compare" }).click();

  await page.getByRole("tab", { name: "vs Target" }).click();
  await expect(page.getByLabel("Current vs selected snapshot silhouettes")).toBeVisible();
  await expect(page.getByRole("img", { name: "Current snapshot comparison silhouette" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Baseline silhouette" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current vs selected snapshot" })).toBeVisible();
  await expect(page.locator(".snapshot-diff").getByText("Waist", { exact: true })).toBeVisible();

  await page.locator(".snapshot-row").filter({ hasText: "Baseline" }).getByRole("button", { name: "Load" }).click();
  await expect(page.locator('input[name="waistCircumference"]')).toHaveValue("80");
});

test("exports and imports local snapshots", async ({ page }) => {
  await page.getByLabel("Snapshot label").fill("Export me");
  await page.getByRole("button", { name: "Save current snapshot" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("bodymod-snapshots.json");

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No saved snapshots yet.")).toBeVisible();

  const imported = {
    version: 1,
    snapshots: [
      {
        id: "imported-baseline",
        createdAt: "2026-05-03T12:00:00.000Z",
        label: "Imported baseline",
        note: "Imported snapshot note",
        measurements: targetMeasurements
      }
    ]
  };

  await page.getByLabel("Import snapshots").setInputFiles({
    name: "bodymod-snapshots.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported))
  });

  await expect(page.getByText("Imported 1 snapshot(s).")).toBeVisible();
  await expect(page.getByText("Imported baseline")).toBeVisible();
  await expect(page.getByText("Imported snapshot note")).toBeVisible();

  await page.getByLabel("Import snapshots").setInputFiles({
    name: "bodymod-snapshots.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported))
  });

  await expect(
    page.getByText("Imported 0 snapshot(s). Skipped 1 duplicate snapshot(s).")
  ).toBeVisible();
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

test("exposes method, privacy, and strategy corpus content", async ({ page }) => {
  await page.getByRole("button", { name: "Method / privacy" }).hover();
  await expect(page.getByRole("heading", { name: "Method" })).toBeVisible();
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
  await expect(page.getByText("Standing height without shoes.")).toBeVisible();

  await page.getByLabel("Snapshot label").fill("Offline baseline");
  await page.getByRole("button", { name: "Save current snapshot" }).click();
  await expect(page.getByText("Offline baseline")).toBeVisible();
});
