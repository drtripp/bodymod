import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DEFAULT_CLOTHING_SIZE_TABLES } from "../src/lib/clothingSizes.js";
import { fallbackPopulationReference } from "../src/lib/populationCharts.js";

const APP_URL = "http://127.0.0.1:5173";

async function isServerReady() {
  try {
    const response = await fetch(APP_URL);
    return response.ok;
  } catch {
    return false;
  }
}

async function startViteServer() {
  if (await isServerReady()) {
    return null;
  }

  const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
  const server = spawn(process.execPath, [viteBin, "--host", "127.0.0.1"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  let output = "";

  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Vite exited before screenshots could run.\n${output}`);
    }

    if (await isServerReady()) {
      return server;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  server.kill();
  throw new Error(`Vite did not become ready before timeout.\n${output}`);
}

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
  reference: "Dummy measurement how-to guide copy for screenshots.",
  guides: [
    {
      field: "waistCircumference",
      label: "Waist",
      cadence: "weekly",
      illustration: "waist-tape",
      summary: "Narrowest relaxed torso circumference.",
      steps: ["Find the narrowest relaxed point between ribs and hips."]
    },
    {
      field: "bideltoidCircumference",
      label: "Bideltoid circumference",
      cadence: "weekly",
      illustration: "shoulder-loop",
      summary: "Tape around shoulders at the widest deltoid line.",
      steps: ["Keep arms down and relaxed."]
    }
  ]
};

const entitlementConfig = {
  version: 1,
  currentTier: "free",
  source: "Screenshot entitlement config.",
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

let server = null;
let browser = null;
try {
  server = await startViteServer();
  browser = await chromium.launch();

  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1200 }],
    ["mobile", { width: 390, height: 900 }]
  ]) {
    const page = await browser.newPage({ viewport });
    await page.route("**/api/health", (route) =>
      route.fulfill({ json: { status: "ok" } })
    );
    await page.route("**/api/clothing-sizes", (route) =>
      route.fulfill({ json: DEFAULT_CLOTHING_SIZE_TABLES })
    );
    await page.route("**/api/measurement-guides", (route) =>
      route.fulfill({ json: measurementGuideLibrary })
    );
    await page.route("**/api/reference-data", (route) =>
      route.fulfill({ json: fallbackPopulationReference })
    );
    await page.route("**/api/entitlements", (route) =>
      route.fulfill({ json: entitlementConfig })
    );
    await page.route("**/api/targets", (route) =>
      route.fulfill({
        json: {
          targets: targets.map(({ score, similarity, explanation, ...target }) => target)
        }
      })
    );
    await page.route("**/api/match-priorities", (route) =>
      route.fulfill({
        json: {
          priorities: [
            {
              id: "balanced",
              label: "Balanced",
              summary: "Equal all-around body-shape matching."
            },
            {
              id: "shoulders",
              label: "Prioritize shoulders",
              summary: "Weights frame width, deltoid width, and shoulder-to-waist ratio more heavily."
            },
            {
              id: "waist-hip",
              label: "Prioritize waist/hip",
              summary: "Weights waist, hip, pant-waist, and waist-to-hip ratio more heavily."
            }
          ]
        }
      })
    );
    await page.route(/\/api\/match(?:\?|$)/, (route) =>
      route.fulfill({
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
      })
    );

    await page.goto(APP_URL);
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
} finally {
  if (browser) {
    await browser.close();
  }

  if (server) {
    server.kill();
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 2000))
    ]);
  }
}
