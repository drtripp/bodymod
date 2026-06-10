const KG_PER_LB = 0.45359237;

function normalizeHeader(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function firstNonEmptyLine(text) {
  return String(text || "")
    .split(/\r?\n/)
    .find((line) => line.trim()) || "";
}

function countOutsideQuotes(line, delimiter) {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function detectDelimiter(text) {
  const line = firstNonEmptyLine(text);
  const delimiters = [",", ";", "\t"];
  return delimiters
    .map((delimiter) => ({
      delimiter,
      count: countOutsideQuotes(line, delimiter)
    }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter || ",";
}

function parseDelimited(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => String(value).trim())) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => String(value).trim())) {
    rows.push(row);
  }

  return rows;
}

function numericValue(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  let cleaned = text.replace(/[^\d,.\-]/g, "");
  if (!cleaned) {
    return null;
  }

  if (/^-?\d{1,3}(,\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(",", ".");
  } else {
    cleaned = cleaned.replace(/,/g, "");
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFourDigitYear(value) {
  const year = Number(value);
  if (!Number.isFinite(year)) {
    return null;
  }

  return year < 100 ? 2000 + year : year;
}

function isoDateAtNoonUtc(year, month, day) {
  const candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return candidate.toISOString();
}

function parseDateValue(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return isoDateAtNoonUtc(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const slashedMatch = text.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})$/);
  if (slashedMatch) {
    const first = Number(slashedMatch[1]);
    const second = Number(slashedMatch[2]);
    const year = toFourDigitYear(slashedMatch[3]);
    const month = first > 12 && second <= 12 ? second : first;
    const day = first > 12 && second <= 12 ? first : second;
    return isoDateAtNoonUtc(year, month, day);
  }

  const excelSerial = numericValue(text);
  if (excelSerial && excelSerial > 20000 && excelSerial < 90000) {
    const excelEpoch = Date.UTC(1899, 11, 30, 12, 0, 0);
    return new Date(excelEpoch + Math.floor(excelSerial) * 24 * 60 * 60 * 1000).toISOString();
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return isoDateAtNoonUtc(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth() + 1,
      parsed.getUTCDate()
    );
  }

  return null;
}

function columnIndex(headers, predicate) {
  return headers.findIndex(predicate);
}

function weightColumnIndex(headers) {
  const candidates = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => /\b(body )?weight\b/.test(header) || header === "bodyweight")
    .map((candidate) => {
      const isTrend = candidate.header.includes("trend") || candidate.header.includes("moving average");
      const isExact = candidate.header === "weight" || candidate.header === "body weight";
      return {
        ...candidate,
        score: isExact ? 0 : isTrend ? 10 : 2
      };
    })
    .sort((left, right) => left.score - right.score || left.index - right.index);

  return candidates[0]?.index ?? -1;
}

function unitFromHeaderAndRow(header, unitValue) {
  const combined = `${header || ""} ${unitValue || ""}`.toLowerCase();
  if (/\b(lb|lbs|pound|pounds)\b/.test(combined)) {
    return "lb";
  }
  if (/\b(kg|kgs|kilogram|kilograms)\b/.test(combined)) {
    return "kg";
  }
  return "kg";
}

function normalizeWeightKg(value, header, unitValue) {
  const numeric = numericValue(value);
  if (numeric === null || numeric <= 0) {
    return null;
  }

  const unit = unitFromHeaderAndRow(header, unitValue);
  const kg = unit === "lb" ? numeric * KG_PER_LB : numeric;
  return Number(kg.toFixed(2));
}

function dateKey(value) {
  const parsed = parseDateValue(value) || (typeof value === "string" ? value : "");
  return parsed ? parsed.slice(0, 10) : "";
}

function existingDailyDateKeys(checkIns = []) {
  return new Set(
    checkIns
      .filter((checkIn) => checkIn?.type === "daily-weight")
      .map((checkIn) => dateKey(checkIn.createdAt))
      .filter(Boolean)
  );
}

function detectedColumnLabel(headers, index) {
  return index >= 0 ? headers[index] : "";
}

export function parseHistoricalWeightCsv(rawValue, { existingCheckIns = [] } = {}) {
  const text = String(rawValue || "").trim();
  const emptyResult = {
    entries: [],
    importedCount: 0,
    skippedRows: 0,
    duplicateRows: 0,
    invalidRows: [],
    detectedColumns: {}
  };

  if (!text) {
    return {
      ...emptyResult,
      invalidRows: [{ rowNumber: 0, reason: "Empty CSV." }]
    };
  }

  const rows = parseDelimited(text);
  if (rows.length < 2) {
    return {
      ...emptyResult,
      invalidRows: [{ rowNumber: 1, reason: "CSV needs a header and at least one data row." }]
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const dateIndex = columnIndex(
    headers,
    (header) =>
      header === "date" ||
      header === "day" ||
      header === "logged at" ||
      header === "timestamp" ||
      header === "time" ||
      header.includes("weigh in date")
  );
  const weightIndex = weightColumnIndex(headers);
  const unitIndex = columnIndex(headers, (header) => header === "unit" || header.includes("weight unit"));
  const caloriesIndex = columnIndex(
    headers,
    (header) =>
      header === "kcal" ||
      header.includes("calorie") ||
      header.includes("energy kcal") ||
      header.includes("calories")
  );
  const noteIndex = columnIndex(
    headers,
    (header) => header.includes("note") || header.includes("comment") || header.includes("memo")
  );

  const missingColumns = [];
  if (dateIndex < 0) {
    missingColumns.push("date");
  }
  if (weightIndex < 0) {
    missingColumns.push("weight");
  }
  if (missingColumns.length) {
    return {
      ...emptyResult,
      detectedColumns: {
        date: detectedColumnLabel(headers, dateIndex),
        weight: detectedColumnLabel(headers, weightIndex)
      },
      invalidRows: [
        {
          rowNumber: 1,
          reason: `Missing required ${missingColumns.join(" and ")} column.`
        }
      ]
    };
  }

  const seenDates = existingDailyDateKeys(existingCheckIns);
  const entries = [];
  const invalidRows = [];
  let duplicateRows = 0;

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const createdAt = parseDateValue(row[dateIndex]);
    const weight = normalizeWeightKg(row[weightIndex], headers[weightIndex], row[unitIndex]);

    if (!createdAt || weight === null) {
      invalidRows.push({
        rowNumber,
        reason: !createdAt ? "Invalid date." : "Invalid weight."
      });
      return;
    }

    const key = createdAt.slice(0, 10);
    if (seenDates.has(key)) {
      duplicateRows += 1;
      return;
    }
    seenDates.add(key);

    const calories = caloriesIndex >= 0 ? numericValue(row[caloriesIndex]) : null;
    const rawNote = noteIndex >= 0 ? String(row[noteIndex] || "").trim() : "";
    const note = rawNote ? `CSV import: ${rawNote}` : "CSV import";

    entries.push({
      type: "daily-weight",
      source: "historical-csv",
      createdAt,
      weight,
      calories: calories === null || calories < 0 ? null : Math.round(calories),
      note,
      measurements: {
        weight
      }
    });
  });

  entries.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  return {
    entries,
    importedCount: entries.length,
    skippedRows: duplicateRows + invalidRows.length,
    duplicateRows,
    invalidRows,
    detectedColumns: {
      date: detectedColumnLabel(headers, dateIndex),
      weight: detectedColumnLabel(headers, weightIndex),
      unit: detectedColumnLabel(headers, unitIndex),
      calories: detectedColumnLabel(headers, caloriesIndex),
      note: detectedColumnLabel(headers, noteIndex)
    }
  };
}

export function summarizeHistoricalWeightImport(result) {
  const imported = result?.importedCount || 0;
  const duplicate = result?.duplicateRows || 0;
  const invalid = result?.invalidRows?.length || 0;
  const details = [];

  if (duplicate) {
    details.push(`${duplicate} duplicate date(s) skipped`);
  }
  if (invalid) {
    details.push(`${invalid} invalid row(s) skipped`);
  }

  return details.length
    ? `Imported ${imported} historical log(s); ${details.join(", ")}.`
    : `Imported ${imported} historical log(s).`;
}
