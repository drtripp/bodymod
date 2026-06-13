import { useEffect, useMemo, useRef, useState } from "react";
import {
  activityLevelOptions,
  calculateMacroTargets,
  calculateFluidTarget,
  cloneDietEntries,
  createFluidEntry,
  createMealLogEntries,
  dietGoalOptions,
  foodMatchesQuery,
  fluidPresetOptions,
  fluidProgress,
  latestLoggedDayEntries,
  lookupBarcode,
  macroTargetRows,
  mealSummary,
  mergeFoodLists,
  micronutrientTargets,
  micronutrientTargetRows,
  normalizeCustomFood,
  normalizeMealTemplate,
  removeMeal,
  removeFood,
  sampleFoods,
  scaleFood,
  searchFoods,
  sumNutrition,
  upsertFood,
  upsertMeal
} from "../lib/diet";
import {
  parseDietCsvImport,
  summarizeDietCsvImport
} from "../lib/dietImport";
import { defaultMeasurements } from "../lib/measurements";
import {
  loadDietFoodLibrary,
  loadDietLog,
  loadFluidLog,
  persistDietFoodLibrary,
  persistDietLog,
  persistFluidLog
} from "../lib/storage";
import { defaultBarcodeScannerAdapter } from "../lib/barcodeScanner";
import { createTranslator } from "../lib/i18n";

function formatNumber(value, digits = 0) {
  return Number(value || 0).toFixed(digits);
}

function macroLine(food, t) {
  return t("diet.macro.line", {
    calories: formatNumber(food.macros.calories),
    protein: formatNumber(food.macros.protein),
    carbs: formatNumber(food.macros.carbs),
    fat: formatNumber(food.macros.fat)
  });
}

function mealLine(meal, t) {
  const summary = mealSummary(meal);
  return t("diet.meal.line", {
    count: summary.itemCount,
    calories: formatNumber(summary.macros.calories),
    protein: formatNumber(summary.macros.protein),
    carbs: formatNumber(summary.macros.carbs),
    fat: formatNumber(summary.macros.fat)
  });
}

function targetLine(row, t) {
  return t("diet.target.line", {
    target: formatNumber(row.target),
    unit: row.unit,
    percent: row.percent
  });
}

function micronutrientLine(row, t) {
  const key = row.targetType === "limit" ? "diet.limit.line" : "diet.target.line";
  return t(key, {
    target: formatNumber(row.target, row.digits),
    unit: row.unit,
    percent: row.percent
  });
}

function localizedMacroLabel(id, label, t) {
  return t(`diet.macro.${id}`, {}, label);
}

function localizedMicronutrientLabel(id, label, t) {
  return t(`diet.micro.${id}`, {}, label);
}

function localizedDietGoal(goal, t) {
  return {
    ...goal,
    label: t(`diet.goal.${goal.id}`, {}, goal.label),
    rateLabel: t(`diet.goal.${goal.id}.rate`, {}, goal.rateLabel)
  };
}

function localizedActivity(activity, t) {
  return {
    ...activity,
    label: t(`diet.activity.${activity.id}`, {}, activity.label)
  };
}

function createCustomFoodForm() {
  return {
    name: "",
    brand: "",
    serving: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    ...Object.fromEntries(micronutrientTargets.map((target) => [target.id, ""]))
  };
}

function createLogEntry(food, servings) {
  const scaledFood = scaleFood(food, servings);

  return {
    id: crypto.randomUUID(),
    loggedAt: new Date().toISOString(),
    ...scaledFood
  };
}

export default function DietDashboard({
  currentMeasurements = defaultMeasurements,
  locale = "en"
}) {
  const t = createTranslator(locale);
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [servings, setServings] = useState(1);
  const [results, setResults] = useState(sampleFoods);
  const [selectedFood, setSelectedFood] = useState(sampleFoods[0]);
  const [customFoodForm, setCustomFoodForm] = useState(() => createCustomFoodForm());
  const [mealName, setMealName] = useState("");
  const [fluidAmount, setFluidAmount] = useState("500");
  const [fluidLabel, setFluidLabel] = useState("Water");
  const [status, setStatus] = useState("");
  const [dietImportText, setDietImportText] = useState("");
  const [dietImportStatus, setDietImportStatus] = useState("");
  const [entries, setEntries] = useState([]);
  const [fluidEntries, setFluidEntries] = useState([]);
  const [foodLibrary, setFoodLibrary] = useState({
    customFoods: [],
    favoriteFoods: [],
    recentFoods: [],
    mealTemplates: []
  });
  const [isSearching, setIsSearching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [dietGoalId, setDietGoalId] = useState("maintenance");
  const [activityLevelId, setActivityLevelId] = useState("moderate");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const localizedDietGoals = useMemo(
    () => dietGoalOptions.map((goal) => localizedDietGoal(goal, t)),
    [locale]
  );
  const localizedActivities = useMemo(
    () => activityLevelOptions.map((activity) => localizedActivity(activity, t)),
    [locale]
  );
  const totals = useMemo(() => sumNutrition(entries), [entries]);
  const macroTargets = useMemo(
    () => {
      const targets = calculateMacroTargets(currentMeasurements, dietGoalId, activityLevelId);
      return {
        ...targets,
        goal: localizedDietGoal(targets.goal, t),
        activity: localizedActivity(targets.activity, t)
      };
    },
    [activityLevelId, currentMeasurements, dietGoalId, locale]
  );
  const macroRows = useMemo(
    () =>
      macroTargetRows(totals.macros, macroTargets).map((row) => ({
        ...row,
        label: localizedMacroLabel(row.id, row.label, t)
      })),
    [macroTargets, totals.macros, locale]
  );
  const micronutrientRows = useMemo(
    () =>
      micronutrientTargetRows(totals.micros).map((row) => ({
        ...row,
        label: localizedMicronutrientLabel(row.id, row.label, t)
      })),
    [totals.micros, locale]
  );
  const fluidTarget = useMemo(
    () => calculateFluidTarget(currentMeasurements),
    [currentMeasurements]
  );
  const fluidTotals = useMemo(
    () => fluidProgress(fluidEntries, fluidTarget),
    [fluidEntries, fluidTarget]
  );

  useEffect(() => {
    setEntries(loadDietLog());
    setFluidEntries(loadFluidLog());
    const storedLibrary = loadDietFoodLibrary();
    setFoodLibrary(storedLibrary);
    setResults(mergeFoodLists(storedLibrary.customFoods, sampleFoods));
    setSelectedFood(storedLibrary.customFoods[0] || sampleFoods[0]);
  }, []);

  useEffect(() => {
    return () => stopScanner();
  }, []);

  function updateEntries(updater) {
    setEntries((current) => {
      const nextEntries = typeof updater === "function" ? updater(current) : updater;
      persistDietLog(nextEntries);
      return nextEntries;
    });
  }

  function updateFluidEntries(updater) {
    setFluidEntries((current) => {
      const nextEntries = typeof updater === "function" ? updater(current) : updater;
      persistFluidLog(nextEntries);
      return nextEntries;
    });
  }

  function updateFoodLibrary(updater) {
    setFoodLibrary((current) => {
      const nextLibrary = typeof updater === "function" ? updater(current) : updater;
      persistDietFoodLibrary(nextLibrary);
      return nextLibrary;
    });
  }

  async function handleSearch(event) {
    event.preventDefault();
    setIsSearching(true);
    setStatus(t("diet.status.searching"));

    try {
      const foods = await searchFoods(query);
      const localFoods = foodLibrary.customFoods.filter((food) => foodMatchesQuery(food, query));
      const mergedFoods = mergeFoodLists(localFoods, foods);
      setResults(mergedFoods);
      setSelectedFood(mergedFoods[0] || null);
      setStatus(
        mergedFoods.length
          ? t("diet.status.foundFoods", { count: mergedFoods.length })
          : t("diet.status.noFoods")
      );
    } catch (error) {
      const fallbackFoods = mergeFoodLists(
        foodLibrary.customFoods.filter((food) => foodMatchesQuery(food, query)),
        sampleFoods
      );
      setResults(fallbackFoods);
      setSelectedFood(fallbackFoods[0] || null);
      setStatus(t("diet.status.databaseUnavailable"));
    } finally {
      setIsSearching(false);
    }
  }

  async function handleBarcodeLookup(event) {
    event.preventDefault();
    setIsSearching(true);
    setStatus(t("diet.status.barcodeLooking"));

    try {
      const food = await lookupBarcode(barcode);
      setResults([food, ...results.filter((item) => item.id !== food.id)]);
      setSelectedFood(food);
      setStatus(t("diet.status.barcodeMatched", { name: food.name }));
    } catch (error) {
      setStatus(error.message || t("diet.status.barcodeFailed"));
    } finally {
      setIsSearching(false);
    }
  }

  function handleAddFood(food = selectedFood) {
    if (!food) {
      return;
    }

    updateEntries((current) => [createLogEntry(food, servings), ...current]);
    updateFoodLibrary((current) => ({
      ...current,
      recentFoods: upsertFood(current.recentFoods, food, 8)
    }));
    setStatus(t("diet.status.loggedFood", { name: food.name }));
  }

  function handleDeleteEntry(entryId) {
    updateEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  function handleLogFluid(amount = fluidAmount, label = fluidLabel) {
    const fluidEntry = createFluidEntry(amount, label);
    if (!fluidEntry.amountMl) {
      setStatus(t("diet.status.fluidAmountRequired"));
      return;
    }

    updateFluidEntries((current) => [fluidEntry, ...current]);
    setStatus(t("diet.status.loggedFluid", {
      amount: fluidEntry.amountMl,
      label: fluidEntry.label
    }));
  }

  function handleDeleteFluid(entryId) {
    updateFluidEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  function handleSaveMealTemplate(event) {
    event.preventDefault();

    if (!entries.length) {
      setStatus(t("diet.status.mealFoodsRequired"));
      return;
    }

    const meal = normalizeMealTemplate({
      name: mealName,
      foods: entries
    });

    if (!mealName.trim()) {
      setStatus(t("diet.status.mealNameRequired"));
      return;
    }

    updateFoodLibrary((current) => ({
      ...current,
      mealTemplates: upsertMeal(current.mealTemplates, meal, 12)
    }));
    setMealName("");
    setStatus(t("diet.status.mealSaved", { name: meal.name }));
  }

  function handleAddMeal(meal) {
    const mealEntries = createMealLogEntries(meal);
    if (!mealEntries.length) {
      setStatus(t("diet.status.mealEmpty"));
      return;
    }

    updateEntries((current) => [...mealEntries, ...current]);
    setStatus(t("diet.status.mealLogged", {
      name: meal.name,
      count: mealEntries.length
    }));
  }

  function handleDeleteMeal(mealId) {
    updateFoodLibrary((current) => ({
      ...current,
      mealTemplates: removeMeal(current.mealTemplates, mealId)
    }));
    setStatus(t("diet.status.mealDeleted"));
  }

  function handleCopyLatestDay() {
    const latestEntries = latestLoggedDayEntries(entries);
    if (!latestEntries.length) {
      setStatus(t("diet.status.noDayToCopy"));
      return;
    }

    const copiedEntries = cloneDietEntries(latestEntries);
    updateEntries((current) => [...copiedEntries, ...current]);
    setStatus(t("diet.status.dayCopied", { count: copiedEntries.length }));
  }

  function importDietCsv(rawValue) {
    const result = parseDietCsvImport(rawValue, { existingEntries: entries });

    if (!result.entries.length) {
      const reason =
        result.invalidRows[0]?.reason ||
        (result.duplicateRows
          ? t("diet.status.importAllDuplicates")
          : t("diet.status.importNoRows"));
      setDietImportStatus(reason);
      setStatus(t("diet.status.importSkipped", { reason }));
      return;
    }

    updateEntries((current) =>
      [...result.entries, ...current].sort(
        (left, right) => new Date(right.loggedAt) - new Date(left.loggedAt)
      )
    );
    const summary = summarizeDietCsvImport(result);
    setDietImportText("");
    setDietImportStatus(summary);
    setStatus(summary);
  }

  function handleDietCsvImport(event) {
    event.preventDefault();
    importDietCsv(dietImportText);
  }

  function handleDietCsvFile(event) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => importDietCsv(String(reader.result || ""));
    reader.onerror = () => {
      setDietImportStatus(t("diet.status.csvFileFailed"));
      setStatus(t("diet.status.importFailed"));
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function handleCustomFoodFieldChange(event) {
    const { name, value } = event.target;
    setCustomFoodForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSaveCustomFood(event) {
    event.preventDefault();
    const customFood = normalizeCustomFood(customFoodForm);

    if (!customFood.name || customFood.name === "Custom food") {
      setStatus(t("diet.status.customFoodNameRequired"));
      return;
    }

    updateFoodLibrary((current) => ({
      ...current,
      customFoods: upsertFood(current.customFoods, customFood, 24),
      recentFoods: upsertFood(current.recentFoods, customFood, 8)
    }));
    setResults((current) => mergeFoodLists([customFood], current));
    setSelectedFood(customFood);
    setCustomFoodForm(createCustomFoodForm());
    setStatus(t("diet.status.customFoodSaved", { name: customFood.name }));
  }

  function isFavorite(foodId) {
    return foodLibrary.favoriteFoods.some((food) => food.id === foodId);
  }

  function handleToggleFavorite(food) {
    if (!food?.id) {
      return;
    }

    updateFoodLibrary((current) => {
      const favorite = current.favoriteFoods.some((item) => item.id === food.id);
      return {
        ...current,
        favoriteFoods: favorite
          ? removeFood(current.favoriteFoods, food.id)
          : upsertFood(current.favoriteFoods, food, 12)
      };
    });
    setStatus(
      isFavorite(food.id)
        ? t("diet.status.favoriteRemoved", { name: food.name })
        : t("diet.status.favoriteSaved", { name: food.name })
    );
  }

  function stopScanner() {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  }

  async function requestCameraStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(t("diet.status.cameraUnavailable"));
    }

    const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
    const videoConstraints = coarsePointer
      ? { facingMode: "environment" }
      : true;

    return navigator.mediaDevices.getUserMedia({
      video: videoConstraints
    });
  }

  async function handleScanBarcode() {
    if (defaultBarcodeScannerAdapter.isNativeScannerAvailable()) {
      setStatus(t("diet.status.nativeScannerOpening"));
      try {
        const scannedBarcode = await defaultBarcodeScannerAdapter.scanBarcode();
        setBarcode(scannedBarcode.value);
        setStatus(t("diet.status.barcodeScanned", { barcode: scannedBarcode.value }));
      } catch (error) {
        setStatus(error.message || t("diet.status.nativeScannerFailed"));
      }
      return;
    }

    try {
      const stream = await requestCameraStream();
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsScanning(true);

      if (!("BarcodeDetector" in window)) {
        setStatus(t("diet.status.cameraManualEntry"));
        return;
      }

      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]
      });
      setStatus(t("diet.status.cameraPoint"));

      const scan = async () => {
        if (!streamRef.current || !videoRef.current) {
          return;
        }

        const codes = await detector.detect(videoRef.current);
        if (codes.length) {
          setBarcode(codes[0].rawValue);
          stopScanner();
          setStatus(t("diet.status.barcodeScanned", { barcode: codes[0].rawValue }));
          return;
        }

        window.setTimeout(scan, 450);
      };

      void scan();
    } catch (error) {
      stopScanner();
      setStatus(t("diet.status.cameraFailed"));
    }
  }

  return (
    <main className="diet-workspace">
      <section className="panel diet-hero">
        <div>
          <h2>{t("diet.title")}</h2>
          <p>
            {t("diet.intro")}
          </p>
        </div>
        <div className="diet-source-note">
          <strong>{t("diet.database.title")}</strong>
          <span>{t("diet.database.body")}</span>
        </div>
      </section>

      <section className="panel diet-search-panel">
        <form className="diet-search-grid" onSubmit={handleSearch}>
          <label className="field">
            <span className="field-label">{t("diet.search.label")}</span>
            <input
              aria-label={t("diet.search.label")}
              value={query}
              placeholder={t("diet.search.placeholder")}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button className="button" type="submit" disabled={isSearching}>
            {t("diet.search.button")}
          </button>
        </form>

        <form className="diet-search-grid" onSubmit={handleBarcodeLookup}>
          <label className="field">
            <span className="field-label">{t("diet.barcode.label")}</span>
            <input
              aria-label={t("diet.barcode.label")}
              inputMode="numeric"
              value={barcode}
              placeholder={t("diet.barcode.placeholder")}
              onChange={(event) => setBarcode(event.target.value)}
            />
          </label>
          <button className="button" type="submit" disabled={isSearching}>
            {t("diet.barcode.lookup")}
          </button>
          <button className="button" type="button" onClick={handleScanBarcode}>
            {t("diet.barcode.scan")}
          </button>
        </form>

        <div className={`barcode-scanner ${isScanning ? "is-active" : ""}`}>
          <video ref={videoRef} aria-label={t("diet.barcode.preview")} muted playsInline />
          {isScanning ? (
            <button className="button" type="button" onClick={stopScanner}>
              {t("diet.barcode.stop")}
            </button>
          ) : null}
        </div>

        {status ? (
          <p className="muted-text" role="status" aria-live="polite">
            {status}
          </p>
        ) : null}

        <form className="diet-import-card" aria-label={t("diet.import.aria")} onSubmit={handleDietCsvImport}>
          <label className="field">
            <span className="field-label">{t("diet.import.label")}</span>
            <textarea
              aria-label={t("diet.import.label")}
              value={dietImportText}
              placeholder={t("diet.import.placeholder")}
              onChange={(event) => setDietImportText(event.target.value)}
            />
          </label>
          <div className="button-row">
            <button className="button" type="submit">
              {t("diet.import.button")}
            </button>
            <label className="button file-button">
              {t("diet.import.file")}
              <input
                aria-label={t("diet.import.fileAria")}
                type="file"
                accept=".csv,text/csv"
                onChange={handleDietCsvFile}
              />
            </label>
          </div>
          {dietImportStatus ? <p className="muted-text">{dietImportStatus}</p> : null}
        </form>
      </section>

      <section className="diet-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>{t("diet.foodDatabase.title")}</h2>
            <p>{t("diet.foodDatabase.body")}</p>
          </div>
          <form className="custom-food-form" aria-label={t("diet.customFood.formAria")} onSubmit={handleSaveCustomFood}>
            <label className="field">
              <span className="field-label">{t("diet.customFood.name")}</span>
              <input
                aria-label={t("diet.customFood.name")}
                name="name"
                value={customFoodForm.name}
                placeholder={t("diet.customFood.namePlaceholder")}
                onChange={handleCustomFoodFieldChange}
              />
            </label>
            <label className="field">
              <span className="field-label">{t("diet.customFood.brand")}</span>
              <input
                aria-label={t("diet.customFood.brandAria")}
                name="brand"
                value={customFoodForm.brand}
                placeholder={t("diet.customFood.brandPlaceholder")}
                onChange={handleCustomFoodFieldChange}
              />
            </label>
            <label className="field">
              <span className="field-label">{t("diet.customFood.serving")}</span>
              <input
                aria-label={t("diet.customFood.servingAria")}
                name="serving"
                value={customFoodForm.serving}
                placeholder={t("diet.customFood.servingPlaceholder")}
                onChange={handleCustomFoodFieldChange}
              />
            </label>
            {[
              ["calories", t("diet.macro.calories")],
              ["protein", t("diet.macro.protein")],
              ["carbs", t("diet.macro.carbs")],
              ["fat", t("diet.macro.fat")]
            ].map(([name, label]) => {
              const fieldLabel = t("diet.customFood.macroAria", {
                label: String(label).toLowerCase()
              });
              return (
                <label key={name} className="field compact-field">
                  <span className="field-label">{label}</span>
                  <input
                    aria-label={fieldLabel}
                    name={name}
                    type="number"
                    min="0"
                    step="0.1"
                    value={customFoodForm[name]}
                    onChange={handleCustomFoodFieldChange}
                  />
                </label>
              );
            })}
            <div className="custom-micro-grid" aria-label={t("diet.customFood.microAria")}>
              {micronutrientTargets.map((target) => (
                <label key={target.id} className="field compact-field">
                  <span className="field-label">
                    {localizedMicronutrientLabel(target.id, target.label, t)} ({target.unit})
                  </span>
                  <input
                    aria-label={t("diet.customFood.macroAria", {
                      label: localizedMicronutrientLabel(target.id, target.label, t).toLowerCase()
                    })}
                    name={target.id}
                    type="number"
                    min="0"
                    step={target.digits ? "0.1" : "1"}
                    value={customFoodForm[target.id]}
                    onChange={handleCustomFoodFieldChange}
                  />
                </label>
              ))}
            </div>
            <button className="button" type="submit">
              {t("diet.customFood.save")}
            </button>
          </form>

          <form className="meal-template-form" aria-label={t("diet.meal.formAria")} onSubmit={handleSaveMealTemplate}>
            <label className="field">
              <span className="field-label">{t("diet.meal.name")}</span>
              <input
                aria-label={t("diet.meal.name")}
                value={mealName}
                placeholder={t("diet.meal.namePlaceholder")}
                onChange={(event) => setMealName(event.target.value)}
              />
            </label>
            <button className="button" type="submit">
              {t("diet.meal.save")}
            </button>
            <button className="button" type="button" onClick={handleCopyLatestDay}>
              {t("diet.meal.copyLatest")}
            </button>
          </form>

          <div className="meal-template-list" aria-label={t("diet.meal.savedAria")}>
            <h3>{t("diet.meal.savedTitle")}</h3>
            {foodLibrary.mealTemplates.length ? (
              <ul>
                {foodLibrary.mealTemplates.map((meal) => (
                  <li key={meal.id}>
                    <div>
                      <strong>{meal.name}</strong>
                      <span>{mealLine(meal, t)}</span>
                    </div>
                    <div className="food-row-actions">
                      <button className="button" type="button" onClick={() => handleAddMeal(meal)}>
                        {t("diet.meal.add")}
                      </button>
                      <button className="button" type="button" onClick={() => handleDeleteMeal(meal.id)}>
                        {t("diet.meal.delete")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">{t("diet.meal.empty")}</p>
            )}
          </div>

          <div className="quick-foods" aria-label={t("diet.quick.aria")}>
            <div>
              <h3>{t("diet.quick.favorites")}</h3>
              {foodLibrary.favoriteFoods.length ? (
                <ul className="quick-food-list">
                  {foodLibrary.favoriteFoods.map((food) => (
                    <li key={food.id}>
                      <button type="button" onClick={() => setSelectedFood(food)}>
                        {food.name}
                      </button>
                      <button className="button" type="button" onClick={() => handleAddFood(food)}>
                        {t("diet.add")}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text">{t("diet.quick.noFavorites")}</p>
              )}
            </div>
            <div>
              <h3>{t("diet.quick.recents")}</h3>
              {foodLibrary.recentFoods.length ? (
                <ul className="quick-food-list">
                  {foodLibrary.recentFoods.map((food) => (
                    <li key={food.id}>
                      <button type="button" onClick={() => setSelectedFood(food)}>
                        {food.name}
                      </button>
                      <button className="button" type="button" onClick={() => handleAddFood(food)}>
                        {t("diet.add")}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text">{t("diet.quick.noRecents")}</p>
              )}
            </div>
          </div>

          <div className="serving-row">
            <label className="field compact-field">
              <span className="field-label">{t("diet.servings")}</span>
              <input
                aria-label={t("diet.servings")}
                type="number"
                min="0"
                step="0.25"
                value={servings}
                onChange={(event) => setServings(event.target.value)}
              />
            </label>
            <button className="button" type="button" onClick={() => handleAddFood()}>
              {t("diet.addSelected")}
            </button>
          </div>

          <ul className="food-result-list" aria-label={t("diet.results.aria")}>
            {results.map((food) => (
              <li key={food.id} className={selectedFood?.id === food.id ? "is-selected" : ""}>
                <button type="button" onClick={() => setSelectedFood(food)}>
                  <strong>{food.name}</strong>
                  <span>{food.brand} / {food.serving} / {food.source || t("diet.localSource")}</span>
                  <small>{macroLine(food, t)}</small>
                </button>
                <div className="food-row-actions">
                  <button
                    className="button"
                    type="button"
                    onClick={() => handleToggleFavorite(food)}
                  >
                    {isFavorite(food.id) ? t("diet.unfavorite") : t("diet.favorite")}
                  </button>
                  <button className="button" type="button" onClick={() => handleAddFood(food)}>
                    {t("diet.add")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>{t("diet.dailyTotals.title")}</h2>
            <p>{t("diet.dailyTotals.body")}</p>
          </div>
          <div className="macro-target-panel" aria-label={t("diet.macroTargets.aria")}>
            <div className="macro-target-controls">
              <label className="field compact-field">
                <span className="field-label">{t("diet.goal.label")}</span>
                <select
                  aria-label={t("diet.goal.label")}
                  value={dietGoalId}
                  onChange={(event) => setDietGoalId(event.target.value)}
                >
                  {localizedDietGoals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact-field">
                <span className="field-label">{t("diet.activity.label")}</span>
                <select
                  aria-label={t("diet.activity.label")}
                  value={activityLevelId}
                  onChange={(event) => setActivityLevelId(event.target.value)}
                >
                  {localizedActivities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="macro-target-summary">
              <article>
                <span>{t("diet.macro.calories")}</span>
                <strong>{formatNumber(macroTargets.calories)}</strong>
                <small>{macroTargets.goal.rateLabel}</small>
              </article>
              <article>
                <span>{t("diet.macro.protein")}</span>
                <strong>{formatNumber(macroTargets.protein)}g</strong>
                <small>{macroTargets.goal.proteinPerKg}g/kg</small>
              </article>
              <article>
                <span>TDEE</span>
                <strong>{formatNumber(macroTargets.tdee)}</strong>
                <small>{macroTargets.activity.label}</small>
              </article>
            </div>
            <p className="muted-text">
              {t("diet.macroTargets.note", { age: macroTargets.ageAssumption })}
            </p>
          </div>
          <div className="macro-total-grid" aria-label={t("diet.macroTotals.aria")}>
            {macroRows.map((row) => (
              <article key={row.id}>
                <span>{row.label}</span>
                <strong>{formatNumber(row.actual)}</strong>
                <small>{targetLine(row, t)}</small>
                <div className="macro-progress-track" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, row.percent)}%` }} />
                </div>
              </article>
            ))}
          </div>

          <div className="micro-total-grid" aria-label={t("diet.microTotals.aria")}>
            {micronutrientRows.map((row) => (
              <article key={row.id}>
                <span>{row.label}</span>
                <strong>{formatNumber(row.actual, row.digits)} {row.unit}</strong>
                <small>{micronutrientLine(row, t)}</small>
                <div className="macro-progress-track" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, row.percent)}%` }} />
                </div>
              </article>
            ))}
          </div>

          <div className="fluid-panel" aria-label={t("diet.fluid.aria")}>
            <div className="fluid-summary">
              <article>
                <span>{t("diet.fluid.title")}</span>
                <strong>{formatNumber(fluidTotals.totalMl)} ml</strong>
                <small>{targetLine({ target: fluidTotals.targetMl, unit: "ml", percent: fluidTotals.percent }, t)}</small>
                <div className="macro-progress-track" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, fluidTotals.percent)}%` }} />
                </div>
              </article>
            </div>
            <div className="fluid-controls">
              <label className="field compact-field">
                <span className="field-label">{t("diet.fluid.amount")}</span>
                <input
                  aria-label={t("diet.fluid.amount")}
                  type="number"
                  min="0"
                  step="50"
                  value={fluidAmount}
                  onChange={(event) => setFluidAmount(event.target.value)}
                />
              </label>
              <label className="field compact-field">
                <span className="field-label">{t("diet.fluid.label")}</span>
                <input
                  aria-label={t("diet.fluid.label")}
                  value={fluidLabel}
                  onChange={(event) => setFluidLabel(event.target.value)}
                />
              </label>
              <button className="button" type="button" onClick={() => handleLogFluid()}>
                {t("diet.fluid.log")}
              </button>
            </div>
            <div className="fluid-preset-row" aria-label={t("diet.fluid.presetsAria")}>
              {fluidPresetOptions.map((preset) => (
                <button
                  key={preset.id}
                  className="button"
                  type="button"
                  onClick={() => handleLogFluid(preset.amountMl, "Water")}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <ul className="fluid-log-list" aria-label={t("diet.fluid.recentAria")}>
              {fluidEntries.length ? (
                fluidEntries.slice(0, 5).map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.label}: {formatNumber(entry.amountMl)} ml</span>
                    <button className="button" type="button" onClick={() => handleDeleteFluid(entry.id)}>
                      {t("diet.fluid.delete")}
                    </button>
                  </li>
                ))
              ) : (
                <li className="empty-row">{t("diet.fluid.empty")}</li>
              )}
            </ul>
          </div>

          <ul className="diet-log-list" aria-label={t("diet.log.aria")}>
            {entries.length ? (
              entries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{entry.name}</strong>
                    <span>{t("diet.log.servingLine", {
                      servings: entry.servings,
                      macros: macroLine(entry, t)
                    })}</span>
                  </div>
                  <button className="button" type="button" onClick={() => handleDeleteEntry(entry.id)}>
                    {t("diet.delete")}
                  </button>
                </li>
              ))
            ) : (
              <li className="empty-row">{t("diet.log.empty")}</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
