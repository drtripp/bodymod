import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMacroTargets,
  calculateFluidTarget,
  cloneDietEntries,
  createFluidEntry,
  createMealLogEntries,
  foodMatchesQuery,
  fluidProgress,
  latestLoggedDayEntries,
  macroTargetRows,
  mealSummary,
  mergeFoodLists,
  normalizeMealTemplate,
  normalizeFoodProduct,
  normalizeCustomFood,
  removeMeal,
  removeFood,
  scaleFood,
  sumNutrition,
  upsertFood,
  upsertMeal
} from "../src/lib/diet.js";

const openFoodFactsProduct = {
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

test("normalizes Open Food Facts products into app nutrition rows", () => {
  const food = normalizeFoodProduct(openFoodFactsProduct);

  assert.equal(food.id, "off-1234567890123");
  assert.equal(food.name, "Mock Skyr");
  assert.equal(food.macros.calories, 140);
  assert.equal(food.macros.protein, 20);
  assert.equal(food.micros.sodium, 60);
  assert.equal(food.micros.calcium, 180);
});

test("scales macros and micros by serving count", () => {
  const scaled = scaleFood(normalizeFoodProduct(openFoodFactsProduct), 2);

  assert.equal(scaled.servings, 2);
  assert.equal(scaled.macros.calories, 280);
  assert.equal(scaled.macros.protein, 40);
  assert.equal(scaled.micros.sugar, 14);
});

test("sums diet log nutrition totals", () => {
  const food = normalizeFoodProduct(openFoodFactsProduct);
  const totals = sumNutrition([scaleFood(food, 1), scaleFood(food, 0.5)]);

  assert.equal(totals.macros.calories, 210);
  assert.equal(totals.macros.protein, 30);
  assert.equal(totals.micros.calcium, 270);
});

test("calculates formula-based macro targets from measurements and goal rate", () => {
  const targets = calculateMacroTargets(
    { height: 180, weight: 82, sex: "male" },
    "standard-loss",
    "moderate"
  );

  assert.equal(targets.bmr, 1800);
  assert.equal(targets.tdee, 2790);
  assert.equal(targets.calories, 2290);
  assert.equal(targets.protein, 164);
  assert.equal(targets.fat, 66);
  assert.equal(targets.carbs, 260);
  assert.equal(targets.goal.rateLabel, "about -0.45 kg/week");
});

test("builds macro target progress rows for logged totals", () => {
  const targets = calculateMacroTargets(
    { height: 180, weight: 82, sex: "male" },
    "maintenance",
    "moderate"
  );
  const rows = macroTargetRows({ calories: 280, protein: 40, carbs: 20, fat: 2 }, targets);
  const byId = Object.fromEntries(rows.map((row) => [row.id, row]));

  assert.equal(byId.calories.target, 2790);
  assert.equal(byId.calories.percent, 10);
  assert.equal(byId.protein.target, 131);
  assert.equal(byId.protein.percent, 31);
});

test("normalizes custom foods into local nutrition rows", () => {
  const food = normalizeCustomFood(
    {
      name: "Tofu bowl",
      brand: "Home recipe",
      serving: "1 bowl",
      calories: "520",
      protein: "34",
      carbs: "54",
      fat: "18"
    },
    "custom-test"
  );

  assert.equal(food.id, "custom-test");
  assert.equal(food.name, "Tofu bowl");
  assert.equal(food.brand, "Home recipe");
  assert.equal(food.source, "Custom");
  assert.equal(food.macros.calories, 520);
  assert.equal(food.macros.protein, 34);
});

test("dedupes, recents, favorites, and local food search helpers", () => {
  const tofu = normalizeCustomFood({ name: "Tofu bowl", brand: "Home" }, "custom-tofu");
  const oats = sampleFood("Oats", "sample-oats");

  assert.deepEqual(mergeFoodLists([tofu], [tofu, oats]).map((food) => food.id), [
    "custom-tofu",
    "sample-oats"
  ]);
  assert.deepEqual(upsertFood([oats], tofu, 2).map((food) => food.id), [
    "custom-tofu",
    "sample-oats"
  ]);
  assert.deepEqual(removeFood([tofu, oats], "custom-tofu").map((food) => food.id), [
    "sample-oats"
  ]);
  assert.equal(foodMatchesQuery(tofu, "tofu"), true);
  assert.equal(foodMatchesQuery(tofu, "skyr"), false);
});

test("saves meal templates and creates one-tap meal log entries", () => {
  const tofu = scaleFood(normalizeCustomFood({ name: "Tofu bowl", calories: 520, protein: 34 }, "custom-tofu"), 1);
  const skyr = scaleFood(normalizeFoodProduct(openFoodFactsProduct), 2);
  const meal = normalizeMealTemplate(
    {
      name: "Training breakfast",
      foods: [
        { id: "entry-tofu", loggedAt: "2026-06-01T12:00:00.000Z", ...tofu },
        { id: "entry-skyr", loggedAt: "2026-06-01T12:00:00.000Z", ...skyr }
      ]
    },
    "meal-training"
  );
  const summary = mealSummary(meal);
  const mealEntries = createMealLogEntries(meal, "2026-06-02T12:00:00.000Z");

  assert.equal(meal.id, "meal-training");
  assert.equal(summary.itemCount, 2);
  assert.equal(summary.macros.calories, 800);
  assert.equal(summary.macros.protein, 74);
  assert.equal(mealEntries.length, 2);
  assert.equal(mealEntries[0].sourceMealName, "Training breakfast");
  assert.equal(mealEntries[0].loggedAt, "2026-06-02T12:00:00.000Z");
  assert.deepEqual(upsertMeal([], meal).map((item) => item.id), ["meal-training"]);
  assert.deepEqual(removeMeal([meal], "meal-training"), []);
});

test("copies the latest logged day as new entries", () => {
  const entries = [
    {
      id: "older",
      loggedAt: "2026-06-01T12:00:00.000Z",
      name: "Older",
      macros: { calories: 100 },
      micros: {}
    },
    {
      id: "latest-a",
      loggedAt: "2026-06-02T08:00:00.000Z",
      name: "Latest A",
      macros: { calories: 200 },
      micros: {}
    },
    {
      id: "latest-b",
      loggedAt: "2026-06-02T18:00:00.000Z",
      name: "Latest B",
      macros: { calories: 300 },
      micros: {}
    }
  ];
  const latest = latestLoggedDayEntries(entries);
  const copied = cloneDietEntries(latest, "2026-06-03T09:00:00.000Z");

  assert.deepEqual(latest.map((entry) => entry.id), ["latest-a", "latest-b"]);
  assert.equal(copied.length, 2);
  assert.equal(copied[0].copiedFromEntryId, "latest-a");
  assert.equal(copied[0].loggedAt, "2026-06-03T09:00:00.000Z");
  assert.notEqual(copied[0].id, latest[0].id);
});

test("calculates fluid target and fluid progress from local logs", () => {
  const target = calculateFluidTarget({ weight: 82 });
  const entries = [
    createFluidEntry(500, "Water", "2026-06-01T10:00:00.000Z"),
    createFluidEntry("750", "Electrolytes", "2026-06-01T14:00:00.000Z")
  ];
  const progress = fluidProgress(entries, target);

  assert.equal(target, 2850);
  assert.equal(entries[1].amountMl, 750);
  assert.equal(progress.totalMl, 1250);
  assert.equal(progress.targetMl, 2850);
  assert.equal(progress.percent, 44);
});

function sampleFood(name, id) {
  return {
    id,
    name,
    brand: "Sample",
    serving: "1 serving",
    macros: { calories: 1, protein: 1, carbs: 1, fat: 1 },
    micros: {}
  };
}
