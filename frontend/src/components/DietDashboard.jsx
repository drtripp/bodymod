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

function formatNumber(value, digits = 0) {
  return Number(value || 0).toFixed(digits);
}

function macroLine(food) {
  return `${formatNumber(food.macros.calories)} kcal / P ${formatNumber(food.macros.protein)}g / C ${formatNumber(food.macros.carbs)}g / F ${formatNumber(food.macros.fat)}g`;
}

function mealLine(meal) {
  const summary = mealSummary(meal);
  return `${summary.itemCount} item(s) / ${formatNumber(summary.macros.calories)} kcal / P ${formatNumber(summary.macros.protein)}g / C ${formatNumber(summary.macros.carbs)}g / F ${formatNumber(summary.macros.fat)}g`;
}

function targetLine(row) {
  return `Target ${formatNumber(row.target)} ${row.unit} / ${row.percent}%`;
}

function micronutrientLine(row) {
  const prefix = row.targetType === "limit" ? "Limit" : "Target";
  return `${prefix} ${formatNumber(row.target, row.digits)} ${row.unit} / ${row.percent}%`;
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

export default function DietDashboard({ currentMeasurements = defaultMeasurements }) {
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
  const totals = useMemo(() => sumNutrition(entries), [entries]);
  const macroTargets = useMemo(
    () => calculateMacroTargets(currentMeasurements, dietGoalId, activityLevelId),
    [activityLevelId, currentMeasurements, dietGoalId]
  );
  const macroRows = useMemo(
    () => macroTargetRows(totals.macros, macroTargets),
    [macroTargets, totals.macros]
  );
  const micronutrientRows = useMemo(
    () => micronutrientTargetRows(totals.micros),
    [totals.micros]
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
    setStatus("Searching food database...");

    try {
      const foods = await searchFoods(query);
      const localFoods = foodLibrary.customFoods.filter((food) => foodMatchesQuery(food, query));
      const mergedFoods = mergeFoodLists(localFoods, foods);
      setResults(mergedFoods);
      setSelectedFood(mergedFoods[0] || null);
      setStatus(mergedFoods.length ? `Found ${mergedFoods.length} food(s).` : "No foods found.");
    } catch (error) {
      const fallbackFoods = mergeFoodLists(
        foodLibrary.customFoods.filter((food) => foodMatchesQuery(food, query)),
        sampleFoods
      );
      setResults(fallbackFoods);
      setSelectedFood(fallbackFoods[0] || null);
      setStatus("Food database unavailable. Showing sample foods.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleBarcodeLookup(event) {
    event.preventDefault();
    setIsSearching(true);
    setStatus("Looking up barcode...");

    try {
      const food = await lookupBarcode(barcode);
      setResults([food, ...results.filter((item) => item.id !== food.id)]);
      setSelectedFood(food);
      setStatus(`Barcode matched ${food.name}.`);
    } catch (error) {
      setStatus(error.message || "Barcode lookup failed.");
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
    setStatus(`Logged ${food.name}.`);
  }

  function handleDeleteEntry(entryId) {
    updateEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  function handleLogFluid(amount = fluidAmount, label = fluidLabel) {
    const fluidEntry = createFluidEntry(amount, label);
    if (!fluidEntry.amountMl) {
      setStatus("Enter a fluid amount before logging it.");
      return;
    }

    updateFluidEntries((current) => [fluidEntry, ...current]);
    setStatus(`Logged ${fluidEntry.amountMl} ml ${fluidEntry.label}.`);
  }

  function handleDeleteFluid(entryId) {
    updateFluidEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  function handleSaveMealTemplate(event) {
    event.preventDefault();

    if (!entries.length) {
      setStatus("Log foods before saving a meal.");
      return;
    }

    const meal = normalizeMealTemplate({
      name: mealName,
      foods: entries
    });

    if (!mealName.trim()) {
      setStatus("Name the meal before saving it.");
      return;
    }

    updateFoodLibrary((current) => ({
      ...current,
      mealTemplates: upsertMeal(current.mealTemplates, meal, 12)
    }));
    setMealName("");
    setStatus(`Saved meal ${meal.name}.`);
  }

  function handleAddMeal(meal) {
    const mealEntries = createMealLogEntries(meal);
    if (!mealEntries.length) {
      setStatus("That meal has no foods saved.");
      return;
    }

    updateEntries((current) => [...mealEntries, ...current]);
    setStatus(`Logged meal ${meal.name} (${mealEntries.length} item(s)).`);
  }

  function handleDeleteMeal(mealId) {
    updateFoodLibrary((current) => ({
      ...current,
      mealTemplates: removeMeal(current.mealTemplates, mealId)
    }));
    setStatus("Meal template deleted.");
  }

  function handleCopyLatestDay() {
    const latestEntries = latestLoggedDayEntries(entries);
    if (!latestEntries.length) {
      setStatus("No logged day to copy yet.");
      return;
    }

    const copiedEntries = cloneDietEntries(latestEntries);
    updateEntries((current) => [...copiedEntries, ...current]);
    setStatus(`Copied latest logged day (${copiedEntries.length} item(s)).`);
  }

  function importDietCsv(rawValue) {
    const result = parseDietCsvImport(rawValue, { existingEntries: entries });

    if (!result.entries.length) {
      const reason =
        result.invalidRows[0]?.reason ||
        (result.duplicateRows ? "All imported foods were already logged." : "No food rows found.");
      setDietImportStatus(reason);
      setStatus(`Diet import skipped: ${reason}`);
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
      setDietImportStatus("CSV file import failed.");
      setStatus("Diet import failed.");
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
      setStatus("Name the custom food before saving it.");
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
    setStatus(`Saved custom food ${customFood.name}.`);
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
    setStatus(isFavorite(food.id) ? `Removed ${food.name} from favorites.` : `Saved ${food.name} as a favorite.`);
  }

  function stopScanner() {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  }

  async function requestCameraStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access is not available in this browser.");
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
    try {
      const stream = await requestCameraStream();
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsScanning(true);

      if (!("BarcodeDetector" in window)) {
        setStatus("Camera access granted. This browser cannot decode barcodes natively, so enter the barcode manually.");
        return;
      }

      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]
      });
      setStatus("Point the camera at a barcode.");

      const scan = async () => {
        if (!streamRef.current || !videoRef.current) {
          return;
        }

        const codes = await detector.detect(videoRef.current);
        if (codes.length) {
          setBarcode(codes[0].rawValue);
          stopScanner();
          setStatus(`Scanned barcode ${codes[0].rawValue}.`);
          return;
        }

        window.setTimeout(scan, 450);
      };

      void scan();
    } catch (error) {
      stopScanner();
      setStatus("Camera barcode scan failed. Enter the barcode manually.");
    }
  }

  return (
    <main className="diet-workspace">
      <section className="panel diet-hero">
        <div>
          <h2>Diet</h2>
          <p>
            Search Open Food Facts, save custom foods, scan or enter barcodes, and build a local macro and micronutrient log.
          </p>
        </div>
        <div className="diet-source-note">
          <strong>Database</strong>
          <span>Open Food Facts lookup plus custom, favorite, and recent foods stored locally.</span>
        </div>
      </section>

      <section className="panel diet-search-panel">
        <form className="diet-search-grid" onSubmit={handleSearch}>
          <label className="field">
            <span className="field-label">Food search</span>
            <input
              aria-label="Food search"
              value={query}
              placeholder="Greek yogurt, oats, protein bar..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button className="button" type="submit" disabled={isSearching}>
            Search foods
          </button>
        </form>

        <form className="diet-search-grid" onSubmit={handleBarcodeLookup}>
          <label className="field">
            <span className="field-label">Barcode</span>
            <input
              aria-label="Barcode"
              inputMode="numeric"
              value={barcode}
              placeholder="Enter UPC/EAN"
              onChange={(event) => setBarcode(event.target.value)}
            />
          </label>
          <button className="button" type="submit" disabled={isSearching}>
            Lookup barcode
          </button>
          <button className="button" type="button" onClick={handleScanBarcode}>
            Scan
          </button>
        </form>

        <div className={`barcode-scanner ${isScanning ? "is-active" : ""}`}>
          <video ref={videoRef} aria-label="Barcode scanner camera preview" muted playsInline />
          {isScanning ? (
            <button className="button" type="button" onClick={stopScanner}>
              Stop scanner
            </button>
          ) : null}
        </div>

        {status ? <p className="muted-text">{status}</p> : null}

        <form className="diet-import-card" aria-label="Diet CSV import" onSubmit={handleDietCsvImport}>
          <label className="field">
            <span className="field-label">Diet CSV</span>
            <textarea
              aria-label="Diet CSV"
              value={dietImportText}
              placeholder="Date,Meal,Food,Calories,Protein,Carbs,Fat..."
              onChange={(event) => setDietImportText(event.target.value)}
            />
          </label>
          <div className="button-row">
            <button className="button" type="submit">
              Import diet CSV
            </button>
            <label className="button file-button">
              Import file
              <input
                aria-label="Import diet CSV file"
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
            <h2>Food Database</h2>
            <p>Select a food, adjust servings, then log it. Custom foods stay in this browser.</p>
          </div>
          <form className="custom-food-form" aria-label="Custom food form" onSubmit={handleSaveCustomFood}>
            <label className="field">
              <span className="field-label">Custom food name</span>
              <input
                aria-label="Custom food name"
                name="name"
                value={customFoodForm.name}
                placeholder="Tofu bowl"
                onChange={handleCustomFoodFieldChange}
              />
            </label>
            <label className="field">
              <span className="field-label">Brand / note</span>
              <input
                aria-label="Custom food brand"
                name="brand"
                value={customFoodForm.brand}
                placeholder="Home recipe"
                onChange={handleCustomFoodFieldChange}
              />
            </label>
            <label className="field">
              <span className="field-label">Serving</span>
              <input
                aria-label="Custom food serving"
                name="serving"
                value={customFoodForm.serving}
                placeholder="1 bowl"
                onChange={handleCustomFoodFieldChange}
              />
            </label>
            {[
              ["calories", "Calories"],
              ["protein", "Protein"],
              ["carbs", "Carbs"],
              ["fat", "Fat"]
            ].map(([name, label]) => (
              <label key={name} className="field compact-field">
                <span className="field-label">{label}</span>
                <input
                  aria-label={`Custom food ${label.toLowerCase()}`}
                  name={name}
                  type="number"
                  min="0"
                  step="0.1"
                  value={customFoodForm[name]}
                  onChange={handleCustomFoodFieldChange}
                />
              </label>
            ))}
            <div className="custom-micro-grid" aria-label="Custom food micronutrients">
              {micronutrientTargets.map((target) => (
                <label key={target.id} className="field compact-field">
                  <span className="field-label">
                    {target.label} ({target.unit})
                  </span>
                  <input
                    aria-label={`Custom food ${target.label.toLowerCase()}`}
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
              Save custom food
            </button>
          </form>

          <form className="meal-template-form" aria-label="Meal template form" onSubmit={handleSaveMealTemplate}>
            <label className="field">
              <span className="field-label">Meal name</span>
              <input
                aria-label="Meal name"
                value={mealName}
                placeholder="Training breakfast"
                onChange={(event) => setMealName(event.target.value)}
              />
            </label>
            <button className="button" type="submit">
              Save current log as meal
            </button>
            <button className="button" type="button" onClick={handleCopyLatestDay}>
              Copy latest day
            </button>
          </form>

          <div className="meal-template-list" aria-label="Saved meals">
            <h3>Saved meals</h3>
            {foodLibrary.mealTemplates.length ? (
              <ul>
                {foodLibrary.mealTemplates.map((meal) => (
                  <li key={meal.id}>
                    <div>
                      <strong>{meal.name}</strong>
                      <span>{mealLine(meal)}</span>
                    </div>
                    <div className="food-row-actions">
                      <button className="button" type="button" onClick={() => handleAddMeal(meal)}>
                        Add meal
                      </button>
                      <button className="button" type="button" onClick={() => handleDeleteMeal(meal.id)}>
                        Delete meal
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">No saved meals yet.</p>
            )}
          </div>

          <div className="quick-foods" aria-label="Quick diet foods">
            <div>
              <h3>Favorites</h3>
              {foodLibrary.favoriteFoods.length ? (
                <ul className="quick-food-list">
                  {foodLibrary.favoriteFoods.map((food) => (
                    <li key={food.id}>
                      <button type="button" onClick={() => setSelectedFood(food)}>
                        {food.name}
                      </button>
                      <button className="button" type="button" onClick={() => handleAddFood(food)}>
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text">No favorites yet.</p>
              )}
            </div>
            <div>
              <h3>Recents</h3>
              {foodLibrary.recentFoods.length ? (
                <ul className="quick-food-list">
                  {foodLibrary.recentFoods.map((food) => (
                    <li key={food.id}>
                      <button type="button" onClick={() => setSelectedFood(food)}>
                        {food.name}
                      </button>
                      <button className="button" type="button" onClick={() => handleAddFood(food)}>
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text">No recent foods yet.</p>
              )}
            </div>
          </div>

          <div className="serving-row">
            <label className="field compact-field">
              <span className="field-label">Servings</span>
              <input
                aria-label="Servings"
                type="number"
                min="0"
                step="0.25"
                value={servings}
                onChange={(event) => setServings(event.target.value)}
              />
            </label>
            <button className="button" type="button" onClick={() => handleAddFood()}>
              Add selected
            </button>
          </div>

          <ul className="food-result-list" aria-label="Food search results">
            {results.map((food) => (
              <li key={food.id} className={selectedFood?.id === food.id ? "is-selected" : ""}>
                <button type="button" onClick={() => setSelectedFood(food)}>
                  <strong>{food.name}</strong>
                  <span>{food.brand} / {food.serving}</span>
                  <small>{macroLine(food)}</small>
                </button>
                <div className="food-row-actions">
                  <button
                    className="button"
                    type="button"
                    onClick={() => handleToggleFavorite(food)}
                  >
                    {isFavorite(food.id) ? "Unfavorite" : "Favorite"}
                  </button>
                  <button className="button" type="button" onClick={() => handleAddFood(food)}>
                    Add
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Daily Totals</h2>
            <p>Stored locally in this browser.</p>
          </div>
          <div className="macro-target-panel" aria-label="Diet macro targets">
            <div className="macro-target-controls">
              <label className="field compact-field">
                <span className="field-label">Diet goal</span>
                <select
                  aria-label="Diet goal"
                  value={dietGoalId}
                  onChange={(event) => setDietGoalId(event.target.value)}
                >
                  {dietGoalOptions.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact-field">
                <span className="field-label">Activity</span>
                <select
                  aria-label="Activity"
                  value={activityLevelId}
                  onChange={(event) => setActivityLevelId(event.target.value)}
                >
                  {activityLevelOptions.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="macro-target-summary">
              <article>
                <span>Calories</span>
                <strong>{formatNumber(macroTargets.calories)}</strong>
                <small>{macroTargets.goal.rateLabel}</small>
              </article>
              <article>
                <span>Protein</span>
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
              Formula estimate only: Mifflin-St Jeor with age {macroTargets.ageAssumption} placeholder. Adaptive TDEE appears in account check-ins after enough reliable weight and calorie logs.
            </p>
          </div>
          <div className="macro-total-grid" aria-label="Diet macro totals">
            {macroRows.map((row) => (
              <article key={row.id}>
                <span>{row.label}</span>
                <strong>{formatNumber(row.actual)}</strong>
                <small>{targetLine(row)}</small>
                <div className="macro-progress-track" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, row.percent)}%` }} />
                </div>
              </article>
            ))}
          </div>

          <div className="micro-total-grid" aria-label="Diet micronutrient totals">
            {micronutrientRows.map((row) => (
              <article key={row.id}>
                <span>{row.label}</span>
                <strong>{formatNumber(row.actual, row.digits)} {row.unit}</strong>
                <small>{micronutrientLine(row)}</small>
                <div className="macro-progress-track" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, row.percent)}%` }} />
                </div>
              </article>
            ))}
          </div>

          <div className="fluid-panel" aria-label="Fluid log">
            <div className="fluid-summary">
              <article>
                <span>Fluids</span>
                <strong>{formatNumber(fluidTotals.totalMl)} ml</strong>
                <small>Target {formatNumber(fluidTotals.targetMl)} ml / {fluidTotals.percent}%</small>
                <div className="macro-progress-track" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, fluidTotals.percent)}%` }} />
                </div>
              </article>
            </div>
            <div className="fluid-controls">
              <label className="field compact-field">
                <span className="field-label">Fluid amount</span>
                <input
                  aria-label="Fluid amount"
                  type="number"
                  min="0"
                  step="50"
                  value={fluidAmount}
                  onChange={(event) => setFluidAmount(event.target.value)}
                />
              </label>
              <label className="field compact-field">
                <span className="field-label">Fluid label</span>
                <input
                  aria-label="Fluid label"
                  value={fluidLabel}
                  onChange={(event) => setFluidLabel(event.target.value)}
                />
              </label>
              <button className="button" type="button" onClick={() => handleLogFluid()}>
                Log fluid
              </button>
            </div>
            <div className="fluid-preset-row" aria-label="Fluid presets">
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
          <ul className="fluid-log-list" aria-label="Recent fluid entries">
              {fluidEntries.length ? (
                fluidEntries.slice(0, 5).map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.label}: {formatNumber(entry.amountMl)} ml</span>
                    <button className="button" type="button" onClick={() => handleDeleteFluid(entry.id)}>
                      Delete fluid
                    </button>
                  </li>
                ))
              ) : (
                <li className="empty-row">No fluids logged yet.</li>
              )}
            </ul>
          </div>

          <ul className="diet-log-list" aria-label="Diet log entries">
            {entries.length ? (
              entries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{entry.name}</strong>
                    <span>{entry.servings} serving(s) / {macroLine(entry)}</span>
                  </div>
                  <button className="button" type="button" onClick={() => handleDeleteEntry(entry.id)}>
                    Delete
                  </button>
                </li>
              ))
            ) : (
              <li className="empty-row">No foods logged yet.</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
