import { useEffect, useMemo, useRef, useState } from "react";
import {
  lookupBarcode,
  sampleFoods,
  scaleFood,
  searchFoods,
  sumNutrition
} from "../lib/diet";
import { loadDietLog, persistDietLog } from "../lib/storage";

function formatNumber(value, digits = 0) {
  return Number(value || 0).toFixed(digits);
}

function macroLine(food) {
  return `${formatNumber(food.macros.calories)} kcal / P ${formatNumber(food.macros.protein)}g / C ${formatNumber(food.macros.carbs)}g / F ${formatNumber(food.macros.fat)}g`;
}

function createLogEntry(food, servings) {
  const scaledFood = scaleFood(food, servings);

  return {
    id: crypto.randomUUID(),
    loggedAt: new Date().toISOString(),
    ...scaledFood
  };
}

export default function DietDashboard() {
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [servings, setServings] = useState(1);
  const [results, setResults] = useState(sampleFoods);
  const [selectedFood, setSelectedFood] = useState(sampleFoods[0]);
  const [status, setStatus] = useState("");
  const [entries, setEntries] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const totals = useMemo(() => sumNutrition(entries), [entries]);

  useEffect(() => {
    setEntries(loadDietLog());
  }, []);

  useEffect(() => {
    persistDietLog(entries);
  }, [entries]);

  useEffect(() => {
    return () => stopScanner();
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    setIsSearching(true);
    setStatus("Searching food database...");

    try {
      const foods = await searchFoods(query);
      setResults(foods.length ? foods : []);
      setSelectedFood(foods[0] || null);
      setStatus(foods.length ? `Found ${foods.length} food(s).` : "No foods found.");
    } catch (error) {
      setResults(sampleFoods);
      setSelectedFood(sampleFoods[0]);
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

    const nextEntries = [createLogEntry(food, servings), ...entries];
    setEntries(nextEntries);
    setStatus(`Logged ${food.name}.`);
  }

  function handleDeleteEntry(entryId) {
    setEntries(entries.filter((entry) => entry.id !== entryId));
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
            Search Open Food Facts, scan or enter barcodes, and build a local macro and micronutrient log.
          </p>
        </div>
        <div className="diet-source-note">
          <strong>Database</strong>
          <span>Open Food Facts lookup plus local sample foods when offline.</span>
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
      </section>

      <section className="diet-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Food Database</h2>
            <p>Select a food, adjust servings, then log it.</p>
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
                <button className="button" type="button" onClick={() => handleAddFood(food)}>
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Daily Totals</h2>
            <p>Stored locally in this browser.</p>
          </div>
          <div className="macro-total-grid" aria-label="Diet macro totals">
            <article>
              <span>Calories</span>
              <strong>{formatNumber(totals.macros.calories)}</strong>
              <small>kcal</small>
            </article>
            <article>
              <span>Protein</span>
              <strong>{formatNumber(totals.macros.protein)}</strong>
              <small>g</small>
            </article>
            <article>
              <span>Carbs</span>
              <strong>{formatNumber(totals.macros.carbs)}</strong>
              <small>g</small>
            </article>
            <article>
              <span>Fat</span>
              <strong>{formatNumber(totals.macros.fat)}</strong>
              <small>g</small>
            </article>
          </div>

          <div className="micro-total-grid" aria-label="Diet micronutrient totals">
            <span>Fiber <strong>{formatNumber(totals.micros.fiber, 1)} g</strong></span>
            <span>Sugar <strong>{formatNumber(totals.micros.sugar, 1)} g</strong></span>
            <span>Sodium <strong>{formatNumber(totals.micros.sodium)} mg</strong></span>
            <span>Calcium <strong>{formatNumber(totals.micros.calcium)} mg</strong></span>
            <span>Iron <strong>{formatNumber(totals.micros.iron, 1)} mg</strong></span>
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
