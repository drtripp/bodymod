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

function numberField(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
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
