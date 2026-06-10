const FOOD_FIELDS = [
  "code",
  "product_name",
  "brands",
  "serving_size",
  "nutriments",
  "image_front_small_url"
].join(",");

export const sampleFoods = [
  {
    id: "sample-greek-yogurt",
    name: "Greek yogurt, plain",
    brand: "Sample food",
    serving: "170 g",
    macros: { calories: 100, protein: 17, carbs: 6, fat: 0 },
    micros: { fiber: 0, sugar: 6, sodium: 65, calcium: 180, iron: 0 }
  },
  {
    id: "sample-chicken-rice",
    name: "Chicken breast with rice",
    brand: "Sample meal",
    serving: "350 g",
    macros: { calories: 520, protein: 43, carbs: 58, fat: 11 },
    micros: { fiber: 3, sugar: 2, sodium: 620, calcium: 42, iron: 2.1 }
  },
  {
    id: "sample-oats",
    name: "Oats",
    brand: "Sample food",
    serving: "40 g",
    macros: { calories: 150, protein: 5, carbs: 27, fat: 3 },
    micros: { fiber: 4, sugar: 1, sodium: 2, calcium: 20, iron: 1.7 }
  }
];

export const dietGoalOptions = [
  {
    id: "maintenance",
    label: "Maintain / recomp",
    calorieDelta: 0,
    rateLabel: "0 kg/week",
    proteinPerKg: 1.6
  },
  {
    id: "slow-loss",
    label: "Lose slowly",
    calorieDelta: -300,
    rateLabel: "about -0.25 kg/week",
    proteinPerKg: 1.8
  },
  {
    id: "standard-loss",
    label: "Lose standard",
    calorieDelta: -500,
    rateLabel: "about -0.45 kg/week",
    proteinPerKg: 2
  },
  {
    id: "lean-gain",
    label: "Lean gain",
    calorieDelta: 250,
    rateLabel: "about +0.2 kg/week",
    proteinPerKg: 1.8
  }
];

export const activityLevelOptions = [
  { id: "sedentary", label: "Sedentary", multiplier: 1.2 },
  { id: "light", label: "Light", multiplier: 1.375 },
  { id: "moderate", label: "Moderate", multiplier: 1.55 },
  { id: "high", label: "High", multiplier: 1.725 }
];

export const fluidPresetOptions = [
  { id: "small-glass", label: "250 ml", amountMl: 250 },
  { id: "bottle", label: "500 ml", amountMl: 500 },
  { id: "large-bottle", label: "750 ml", amountMl: 750 }
];

function numberField(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function stableFoodId(prefix = "food") {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cleanText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

export function mergeFoodLists(...foodLists) {
  const foods = [];
  const seen = new Set();

  for (const foodList of foodLists) {
    for (const food of foodList || []) {
      if (!food?.id || seen.has(food.id)) {
        continue;
      }

      seen.add(food.id);
      foods.push(food);
    }
  }

  return foods;
}

export function upsertFood(foodList, food, limit = 8) {
  if (!food?.id) {
    return foodList || [];
  }

  return [
    food,
    ...(foodList || []).filter((item) => item.id !== food.id)
  ].slice(0, limit);
}

export function removeFood(foodList, foodId) {
  return (foodList || []).filter((food) => food.id !== foodId);
}

export function upsertMeal(mealList, meal, limit = 12) {
  if (!meal?.id) {
    return mealList || [];
  }

  return [
    meal,
    ...(mealList || []).filter((item) => item.id !== meal.id)
  ].slice(0, limit);
}

export function removeMeal(mealList, mealId) {
  return (mealList || []).filter((meal) => meal.id !== mealId);
}

export function foodMatchesQuery(food, query) {
  const term = cleanText(query).toLowerCase();
  if (!term) {
    return true;
  }

  return [food?.name, food?.brand, food?.serving, food?.source]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
}

export function normalizeCustomFood(input = {}, id = stableFoodId("custom")) {
  return {
    id,
    name: cleanText(input.name, "Custom food"),
    brand: cleanText(input.brand, "Custom"),
    serving: cleanText(input.serving, "1 serving"),
    source: "Custom",
    macros: {
      calories: numberField(input.calories ?? input.macros?.calories),
      protein: numberField(input.protein ?? input.macros?.protein),
      carbs: numberField(input.carbs ?? input.macros?.carbs),
      fat: numberField(input.fat ?? input.macros?.fat)
    },
    micros: {
      fiber: numberField(input.fiber ?? input.micros?.fiber),
      sugar: numberField(input.sugar ?? input.micros?.sugar),
      sodium: numberField(input.sodium ?? input.micros?.sodium),
      calcium: numberField(input.calcium ?? input.micros?.calcium),
      iron: numberField(input.iron ?? input.micros?.iron)
    }
  };
}

export function calculateFluidTarget(measurements = {}) {
  const weight = numberField(measurements.weight);
  const baseline = weight > 0 ? weight * 35 : 2500;
  const rounded = Math.round(baseline / 50) * 50;

  return Math.max(1500, Math.min(5000, rounded));
}

export function createFluidEntry(amountMl, label = "Water", loggedAt = new Date().toISOString()) {
  const amount = numberField(amountMl);

  return {
    id: crypto.randomUUID(),
    loggedAt,
    label: cleanText(label, "Water"),
    amountMl: Math.max(0, Math.round(amount))
  };
}

export function sumFluid(entries = []) {
  return entries.reduce((total, entry) => total + numberField(entry.amountMl), 0);
}

export function fluidProgress(entries = [], targetMl = 2500) {
  const totalMl = sumFluid(entries);
  const target = Math.max(0, numberField(targetMl));
  const percent = target > 0 ? Math.round(Math.min(999, (totalMl / target) * 100)) : 0;

  return {
    totalMl,
    targetMl: target,
    percent
  };
}

export function normalizeMealTemplate(input = {}, id = stableFoodId("meal")) {
  const foods = Array.isArray(input.foods)
    ? input.foods.filter((food) => food?.id && food?.macros)
    : [];

  return {
    id,
    name: cleanText(input.name, "Saved meal"),
    createdAt: input.createdAt || new Date().toISOString(),
    foods
  };
}

export function mealSummary(meal) {
  const totals = sumNutrition(meal?.foods || []);

  return {
    itemCount: meal?.foods?.length || 0,
    macros: totals.macros,
    micros: totals.micros
  };
}

export function createMealLogEntries(meal, loggedAt = new Date().toISOString()) {
  return (meal?.foods || []).map((food) => ({
    ...food,
    id: crypto.randomUUID(),
    loggedAt,
    sourceMealId: meal.id,
    sourceMealName: meal.name
  }));
}

function localDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function latestLoggedDayEntries(entries = []) {
  const validEntries = entries.filter((entry) => localDateKey(entry.loggedAt));
  if (!validEntries.length) {
    return [];
  }

  const latestKey = validEntries
    .map((entry) => localDateKey(entry.loggedAt))
    .sort()
    .at(-1);

  return validEntries.filter((entry) => localDateKey(entry.loggedAt) === latestKey);
}

export function cloneDietEntries(entries = [], loggedAt = new Date().toISOString()) {
  return entries.map((entry) => ({
    ...entry,
    id: crypto.randomUUID(),
    loggedAt,
    copiedFromEntryId: entry.id
  }));
}

function optionById(options, id) {
  return options.find((option) => option.id === id) || options[0];
}

export function calculateMacroTargets(
  measurements = {},
  goalId = "maintenance",
  activityId = "moderate"
) {
  const goal = optionById(dietGoalOptions, goalId);
  const activity = optionById(activityLevelOptions, activityId);
  const height = numberField(measurements.height);
  const weight = numberField(measurements.weight);
  const sex = measurements.sex === "female" ? "female" : "male";
  const ageAssumption = 30;
  const sexOffset = sex === "female" ? -161 : 5;
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * ageAssumption + sexOffset);
  const tdee = Math.round(Math.max(0, bmr * activity.multiplier));
  const calories = Math.round(Math.max(0, tdee + goal.calorieDelta));
  const protein = Math.round(weight * goal.proteinPerKg);
  const fat = Math.round(weight * 0.8);
  const carbCalories = calories - protein * 4 - fat * 9;
  const carbs = Math.round(Math.max(0, carbCalories / 4));

  return {
    calories,
    protein,
    carbs,
    fat,
    bmr,
    tdee,
    goal,
    activity,
    ageAssumption,
    formula: "Mifflin-St Jeor with age 30 placeholder"
  };
}

export function macroTargetRows(actualMacros = {}, targets = {}) {
  return [
    { id: "calories", label: "Calories", unit: "kcal" },
    { id: "protein", label: "Protein", unit: "g" },
    { id: "carbs", label: "Carbs", unit: "g" },
    { id: "fat", label: "Fat", unit: "g" }
  ].map((row) => {
    const actual = numberField(actualMacros[row.id]);
    const target = numberField(targets[row.id]);
    const percent = target > 0 ? Math.round(Math.min(999, (actual / target) * 100)) : 0;

    return {
      ...row,
      actual,
      target,
      percent
    };
  });
}

function nutriment(nutriments, keys) {
  for (const key of keys) {
    if (nutriments?.[key] !== undefined) {
      return numberField(nutriments[key]);
    }
  }

  return 0;
}

export function normalizeFoodProduct(product) {
  const nutriments = product?.nutriments || {};

  return {
    id: product?.code ? `off-${product.code}` : crypto.randomUUID(),
    barcode: product?.code || "",
    name: product?.product_name || "Unnamed food",
    brand: product?.brands || "Open Food Facts",
    serving: product?.serving_size || "100 g",
    imageUrl: product?.image_front_small_url || "",
    source: "Open Food Facts",
    macros: {
      calories: nutriment(nutriments, ["energy-kcal_serving", "energy-kcal_100g"]),
      protein: nutriment(nutriments, ["proteins_serving", "proteins_100g"]),
      carbs: nutriment(nutriments, ["carbohydrates_serving", "carbohydrates_100g"]),
      fat: nutriment(nutriments, ["fat_serving", "fat_100g"])
    },
    micros: {
      fiber: nutriment(nutriments, ["fiber_serving", "fiber_100g"]),
      sugar: nutriment(nutriments, ["sugars_serving", "sugars_100g"]),
      sodium: nutriment(nutriments, ["sodium_serving", "sodium_100g"]) * 1000,
      calcium: nutriment(nutriments, ["calcium_serving", "calcium_100g"]) * 1000,
      iron: nutriment(nutriments, ["iron_serving", "iron_100g"]) * 1000
    }
  };
}

export async function searchFoods(query) {
  const term = query.trim();
  if (!term) {
    return sampleFoods;
  }

  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", term);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "12");
  url.searchParams.set("fields", FOOD_FIELDS);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Food search failed.");
  }

  const payload = await response.json();
  return (payload.products || []).map(normalizeFoodProduct);
}

export async function lookupBarcode(barcode) {
  const cleanBarcode = barcode.replace(/\D/g, "");
  if (!cleanBarcode) {
    throw new Error("Enter a barcode number.");
  }

  const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`);
  url.searchParams.set("fields", FOOD_FIELDS);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Barcode lookup failed.");
  }

  const payload = await response.json();
  if (!payload.product) {
    throw new Error("No food found for that barcode.");
  }

  return normalizeFoodProduct({ ...payload.product, code: payload.code || cleanBarcode });
}

export function scaleFood(food, servings = 1) {
  const multiplier = Number.isFinite(Number(servings)) ? Math.max(0, Number(servings)) : 1;
  const scaleGroup = (group) =>
    Object.fromEntries(
      Object.entries(group || {}).map(([key, value]) => [key, numberField(value) * multiplier])
    );

  return {
    ...food,
    servings: multiplier,
    macros: scaleGroup(food.macros),
    micros: scaleGroup(food.micros)
  };
}

export function sumNutrition(entries) {
  return entries.reduce(
    (totals, entry) => {
      for (const [key, value] of Object.entries(entry.macros || {})) {
        totals.macros[key] = numberField(totals.macros[key]) + numberField(value);
      }
      for (const [key, value] of Object.entries(entry.micros || {})) {
        totals.micros[key] = numberField(totals.micros[key]) + numberField(value);
      }
      return totals;
    },
    {
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      micros: { fiber: 0, sugar: 0, sodium: 0, calcium: 0, iron: 0 }
    }
  );
}
