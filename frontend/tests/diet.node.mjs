import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFoodProduct, scaleFood, sumNutrition } from "../src/lib/diet.js";

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
