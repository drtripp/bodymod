const CM_PER_INCH = 2.54;

export const DEFAULT_CLOTHING_SIZE_TABLES = {
  version: 1,
  reference: "Generic placeholder adult size bands for prototype fit estimates. Validate against source-reviewed charts before production use.",
  notes: [
    "US/EU/UK equivalents are approximate scaffold values and brand fit can vary by several sizes.",
    "Dress and women's bottom estimates use simple bust, waist, and hip proxies from the existing measurement schema.",
    "Ring estimates use wrist circumference as a weak proxy until finger circumference is added; users should measure the finger before buying."
  ],
  garments: [
    {
      id: "men-tops",
      label: "Men's tops",
      measurementStrategy: "chest-in",
      fit: "regular",
      bands: [
        { id: "men-top-xs", label: "XS", min: 30, max: 34, equivalents: { EU: "44", UK: "34" } },
        { id: "men-top-s", label: "S", min: 34, max: 37, equivalents: { EU: "46", UK: "36" } },
        { id: "men-top-m", label: "M", min: 37, max: 40.5, equivalents: { EU: "48", UK: "38" } },
        { id: "men-top-l", label: "L", min: 40.5, max: 44, equivalents: { EU: "52", UK: "42" } },
        { id: "men-top-xl", label: "XL", min: 44, max: 48, equivalents: { EU: "56", UK: "46" } },
        { id: "men-top-xxl", label: "XXL", min: 48, max: 53, equivalents: { EU: "60", UK: "50" } }
      ]
    },
    {
      id: "women-tops",
      label: "Women's tops",
      measurementStrategy: "bust-in",
      fit: "regular",
      bands: [
        { id: "women-top-xs", label: "XS", min: 30, max: 33, equivalents: { EU: "34", UK: "6" } },
        { id: "women-top-s", label: "S", min: 33, max: 35.5, equivalents: { EU: "36", UK: "8" } },
        { id: "women-top-m", label: "M", min: 35.5, max: 38, equivalents: { EU: "38", UK: "10" } },
        { id: "women-top-l", label: "L", min: 38, max: 41, equivalents: { EU: "42", UK: "14" } },
        { id: "women-top-xl", label: "XL", min: 41, max: 45, equivalents: { EU: "46", UK: "18" } }
      ]
    },
    {
      id: "men-pants",
      label: "Men's pants",
      measurementStrategy: "pant-waist-in",
      fit: "waist",
      bands: [
        { id: "men-pant-28", label: "W28", min: 27.5, max: 29, equivalents: { EU: "44", UK: "W28" } },
        { id: "men-pant-30", label: "W30", min: 29, max: 31, equivalents: { EU: "46", UK: "W30" } },
        { id: "men-pant-32", label: "W32", min: 31, max: 33, equivalents: { EU: "48", UK: "W32" } },
        { id: "men-pant-34", label: "W34", min: 33, max: 35, equivalents: { EU: "50", UK: "W34" } },
        { id: "men-pant-36", label: "W36", min: 35, max: 37, equivalents: { EU: "52", UK: "W36" } },
        { id: "men-pant-38", label: "W38", min: 37, max: 39, equivalents: { EU: "54", UK: "W38" } },
        { id: "men-pant-40", label: "W40", min: 39, max: 41, equivalents: { EU: "56", UK: "W40" } },
        { id: "men-pant-42", label: "W42", min: 41, max: 43, equivalents: { EU: "58", UK: "W42" } }
      ]
    },
    {
      id: "women-pants",
      label: "Women's pants",
      measurementStrategy: "women-bottom-index-in",
      fit: "waist/hip proxy",
      bands: [
        { id: "women-pant-0", label: "0", min: 24, max: 25.5, equivalents: { EU: "32", UK: "4" } },
        { id: "women-pant-2", label: "2", min: 25.5, max: 26.5, equivalents: { EU: "34", UK: "6" } },
        { id: "women-pant-4", label: "4", min: 26.5, max: 27.5, equivalents: { EU: "36", UK: "8" } },
        { id: "women-pant-6", label: "6", min: 27.5, max: 28.5, equivalents: { EU: "38", UK: "10" } },
        { id: "women-pant-8", label: "8", min: 28.5, max: 29.5, equivalents: { EU: "40", UK: "12" } },
        { id: "women-pant-10", label: "10", min: 29.5, max: 30.5, equivalents: { EU: "42", UK: "14" } },
        { id: "women-pant-12", label: "12", min: 30.5, max: 32, equivalents: { EU: "44", UK: "16" } },
        { id: "women-pant-14", label: "14", min: 32, max: 34, equivalents: { EU: "46", UK: "18" } },
        { id: "women-pant-16", label: "16", min: 34, max: 36, equivalents: { EU: "48", UK: "20" } }
      ]
    },
    {
      id: "dresses",
      label: "Dresses",
      measurementStrategy: "dress-index-in",
      fit: "bust/waist/hip proxy",
      bands: [
        { id: "dress-0", label: "0", min: 31, max: 32.5, equivalents: { EU: "32", UK: "4" } },
        { id: "dress-2", label: "2", min: 32.5, max: 33.5, equivalents: { EU: "34", UK: "6" } },
        { id: "dress-4", label: "4", min: 33.5, max: 34.5, equivalents: { EU: "36", UK: "8" } },
        { id: "dress-6", label: "6", min: 34.5, max: 35.5, equivalents: { EU: "38", UK: "10" } },
        { id: "dress-8", label: "8", min: 35.5, max: 36.5, equivalents: { EU: "40", UK: "12" } },
        { id: "dress-10", label: "10", min: 36.5, max: 37.5, equivalents: { EU: "42", UK: "14" } },
        { id: "dress-12", label: "12", min: 37.5, max: 39, equivalents: { EU: "44", UK: "16" } },
        { id: "dress-14", label: "14", min: 39, max: 41, equivalents: { EU: "46", UK: "18" } },
        { id: "dress-16", label: "16", min: 41, max: 43, equivalents: { EU: "48", UK: "20" } }
      ]
    },
    {
      id: "hats",
      label: "Hats",
      measurementStrategy: "head-cm",
      fit: "head circumference",
      bands: [
        { id: "hat-xs", label: "6 3/4", min: 52, max: 54.5, equivalents: { EU: "54", UK: "6 5/8" } },
        { id: "hat-s", label: "7", min: 54.5, max: 56.5, equivalents: { EU: "56", UK: "6 7/8" } },
        { id: "hat-m", label: "7 1/8", min: 56.5, max: 57.5, equivalents: { EU: "57", UK: "7" } },
        { id: "hat-l", label: "7 1/4", min: 57.5, max: 59, equivalents: { EU: "58", UK: "7 1/8" } },
        { id: "hat-xl", label: "7 1/2", min: 59, max: 61, equivalents: { EU: "60", UK: "7 3/8" } }
      ]
    },
    {
      id: "rings",
      label: "Rings",
      measurementStrategy: "wrist-proxy-cm",
      fit: "weak wrist proxy",
      bands: [
        { id: "ring-4", label: "4", min: 13, max: 14.5, equivalents: { EU: "47", UK: "H" } },
        { id: "ring-5", label: "5", min: 14.5, max: 15.5, equivalents: { EU: "49", UK: "J" } },
        { id: "ring-6", label: "6", min: 15.5, max: 16.5, equivalents: { EU: "52", UK: "L" } },
        { id: "ring-7", label: "7", min: 16.5, max: 17.5, equivalents: { EU: "54", UK: "N" } },
        { id: "ring-8", label: "8", min: 17.5, max: 18.5, equivalents: { EU: "57", UK: "P" } },
        { id: "ring-9", label: "9", min: 18.5, max: 19.5, equivalents: { EU: "59", UK: "R" } }
      ]
    }
  ]
};

const fitCards = [
  {
    id: "shirt",
    label: "Shirt",
    tableForSex: { male: "men-tops", female: "women-tops" }
  },
  {
    id: "pants",
    label: "Pants",
    tableForSex: { male: "men-pants", female: "women-pants" }
  },
  {
    id: "dress",
    label: "Dress",
    tableId: "dresses"
  },
  {
    id: "hat",
    label: "Hat",
    tableId: "hats"
  },
  {
    id: "ring",
    label: "Ring",
    tableId: "rings",
    confidence: "low"
  }
];

function cmToInches(value) {
  return Number(value) / CM_PER_INCH;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function tableList(tables) {
  return Array.isArray(tables?.garments)
    ? tables.garments
    : DEFAULT_CLOTHING_SIZE_TABLES.garments;
}

function tableById(tables, tableId) {
  return tableList(tables).find((table) => table.id === tableId) || null;
}

function measurementValue(measurements, strategy) {
  const chestIn = cmToInches(measurements.nippleCircumference);
  const waistIn = cmToInches(measurements.pantWaistCircumference);
  const hipIn = cmToInches(measurements.hipCircumference);

  if (strategy === "chest-in" || strategy === "bust-in") {
    return chestIn;
  }

  if (strategy === "pant-waist-in") {
    return waistIn;
  }

  if (strategy === "women-bottom-index-in") {
    return Math.max(waistIn, hipIn - 10);
  }

  if (strategy === "dress-index-in") {
    return Math.max(chestIn, cmToInches(measurements.waistCircumference) + 9, hipIn - 3);
  }

  if (strategy === "head-cm") {
    return Number(measurements.headCircumference);
  }

  if (strategy === "wrist-proxy-cm") {
    return Number(measurements.wristCircumference);
  }

  return Number.NaN;
}

function measurementNote(measurements, strategy, value) {
  if (strategy === "chest-in") {
    return `Chest ${roundOne(value)} in from chest circumference`;
  }

  if (strategy === "bust-in") {
    return `Bust ${roundOne(value)} in from chest circumference`;
  }

  if (strategy === "pant-waist-in") {
    return `Pant waist ${roundOne(value)} in`;
  }

  if (strategy === "women-bottom-index-in") {
    return `Waist/hip proxy ${roundOne(value)} in`;
  }

  if (strategy === "dress-index-in") {
    return `Bust/waist/hip proxy ${roundOne(value)} in`;
  }

  if (strategy === "head-cm") {
    return `Head ${roundOne(measurements.headCircumference)} cm`;
  }

  if (strategy === "wrist-proxy-cm") {
    return `Weak wrist proxy ${roundOne(measurements.wristCircumference)} cm`;
  }

  return "Approximate size band";
}

function findBand(bands, value) {
  if (!Array.isArray(bands) || !bands.length || Number.isNaN(value)) {
    return null;
  }

  const sortedBands = [...bands].sort((left, right) => left.min - right.min);
  const matchedBand = sortedBands.find((band, index) => {
    const isLast = index === sortedBands.length - 1;
    return value >= band.min && (isLast ? value <= band.max : value < band.max);
  });

  if (matchedBand) {
    return matchedBand;
  }

  if (value < sortedBands[0].min) {
    return sortedBands[0];
  }

  return sortedBands[sortedBands.length - 1];
}

function formatBand(band) {
  const equivalents = band.equivalents || {};
  return [
    `US ${band.label}`,
    equivalents.EU ? `EU ${equivalents.EU}` : null,
    equivalents.UK ? `UK ${equivalents.UK}` : null
  ]
    .filter(Boolean)
    .join(" / ");
}

export function estimateClothingSizes(measurements, tables = DEFAULT_CLOTHING_SIZE_TABLES) {
  return fitCards
    .map((card) => {
      const tableId = card.tableId || card.tableForSex?.[measurements.sex] || card.tableForSex?.male;
      const table = tableById(tables, tableId);

      if (!table) {
        return null;
      }

      const value = measurementValue(measurements, table.measurementStrategy);
      const band = findBand(table.bands, value);

      if (!band) {
        return null;
      }

      return {
        id: card.id,
        label: card.label,
        value: formatBand(band),
        note: measurementNote(measurements, table.measurementStrategy, value),
        confidence: card.confidence || (table.measurementStrategy.includes("proxy") ? "low" : "medium"),
        tableLabel: table.label,
        fit: table.fit
      };
    })
    .filter(Boolean);
}
