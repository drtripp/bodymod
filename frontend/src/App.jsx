import { useEffect, useState } from "react";
import ComparisonPanel from "./components/ComparisonPanel";
import DietDashboard from "./components/DietDashboard";
import InfoFootnote from "./components/InfoFootnote";
import MeasurementForm from "./components/MeasurementForm";
import PopulationPanel from "./components/PopulationPanel";
import ResultSummary from "./components/ResultSummary";
import SiteHeader from "./components/SiteHeader";
import SnapshotPanel from "./components/SnapshotPanel";
import StrategyCorpus from "./components/StrategyCorpus";
import { fetchHealth, fetchMatches, fetchTargets } from "./lib/api";
import { summarizeMeasurementDiff } from "./lib/comparison";
import { trackEvent } from "./lib/analytics";
import {
  coerceMeasurements,
  defaultMeasurements,
  normalizeMeasurements,
  validateMeasurements
} from "./lib/measurements";
import {
  buildShareUrl,
  decodeMeasurementsFromUrl
} from "./lib/share";
import {
  createSnapshot,
  loadSnapshots,
  parseSnapshotExport,
  persistSnapshots,
  serializeSnapshots
} from "./lib/storage";
import {
  buildDisplayFormState,
  displayToMetricValue,
  formatDisplayValue,
  resolveFieldUnitSystem
} from "./lib/units";

export default function App() {
  const [formState, setFormState] = useState(defaultMeasurements);
  const [displayFormState, setDisplayFormState] = useState(defaultMeasurements);
  const [errors, setErrors] = useState({});
  const [apiStatus, setApiStatus] = useState("checking");
  const [targets, setTargets] = useState([]);
  const [result, setResult] = useState({
    top_match: null,
    matches: [],
    percentiles: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [snapshotNote, setSnapshotNote] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [comparisonSnapshotId, setComparisonSnapshotId] = useState("");
  const [comparisonMode, setComparisonMode] = useState("side-by-side");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [globalUnitSystem, setGlobalUnitSystem] = useState("metric");
  const [fieldUnitOverrides, setFieldUnitOverrides] = useState({});
  const [hoveredMeasurement, setHoveredMeasurement] = useState(null);
  const [insightTab, setInsightTab] = useState("result");
  const [activeSection, setActiveSection] = useState("body");
  const [isStrategyExplorerOpen, setIsStrategyExplorerOpen] = useState(false);

  useEffect(() => {
    trackEvent("app_loaded");
    const storedSnapshots = loadSnapshots();
    setSnapshots(storedSnapshots);
    const sharedMeasurements = decodeMeasurementsFromUrl(
      new URLSearchParams(window.location.search).get("m")
    );

    if (sharedMeasurements) {
      const measurements = normalizeMeasurements(sharedMeasurements);
      setFormState(measurements);
      setDisplayFormState(buildDisplayFormState(measurements, "metric", {}));
      trackEvent("share_url_loaded");
    } else if (storedSnapshots.length) {
      const measurements = normalizeMeasurements(storedSnapshots[0].measurements);
      setFormState(measurements);
      setDisplayFormState(
        buildDisplayFormState(measurements, "metric", {})
      );
    } else {
      setDisplayFormState(buildDisplayFormState(defaultMeasurements, "metric", {}));
    }

    fetchHealth()
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));

    fetchTargets()
      .then((response) => {
        setTargets(response.targets);
        setSelectedTargetId((current) => current || response.targets[0]?.id || "");
      })
      .catch(() => setTargets([]));
  }, []);

  useEffect(() => {
    if (!targets.length) {
      return;
    }
    const nextErrors = validateMeasurements(
      formState,
      globalUnitSystem,
      fieldUnitOverrides
    );
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runMatch(coerceMeasurements(formState));
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [fieldUnitOverrides, formState, globalUnitSystem, targets]);

  async function runMatch(measurements) {
    setIsLoading(true);

    try {
      const response = await fetchMatches(measurements);
      setResult(response);
      setSelectedTargetId((current) => current || response.matches?.[0]?.id || "");
      trackEvent("result_rendered", {
        matchCount: response.matches?.length || 0,
        topMatch: response.top_match?.id
      });
    } catch (error) {
      setResult({
        top_match: null,
        matches: [],
        percentiles: {}
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const unitSystem = resolveFieldUnitSystem(
      name,
      globalUnitSystem,
      fieldUnitOverrides
    );

    setDisplayFormState((current) => ({
      ...current,
      [name]: value
    }));

    if (name === "sex") {
      setFormState((current) => ({
        ...current,
        [name]: value
      }));
    } else {
      setFormState((current) => ({
        ...current,
        [name]: displayToMetricValue(name, value, unitSystem)
      }));
    }

    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  function handleFieldBlur(name) {
    const unitSystem = resolveFieldUnitSystem(
      name,
      globalUnitSystem,
      fieldUnitOverrides
    );

    setDisplayFormState((current) => ({
      ...current,
      [name]: formatDisplayValue(name, formState[name], unitSystem)
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateMeasurements(
      formState,
      globalUnitSystem,
      fieldUnitOverrides
    );
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    void runMatch(coerceMeasurements(formState));
  }

  function handleSaveSnapshot() {
    const nextErrors = validateMeasurements(
      formState,
      globalUnitSystem,
      fieldUnitOverrides
    );
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    const nextSnapshots = [
      createSnapshot(coerceMeasurements(formState), snapshotLabel, snapshotNote),
      ...snapshots
    ];

    setSnapshots(nextSnapshots);
    persistSnapshots(nextSnapshots);
    setSnapshotLabel("");
    setSnapshotNote("");
    trackEvent("snapshot_saved", { count: nextSnapshots.length });
  }

  function handleLoadSnapshot(snapshotId) {
    const snapshot = snapshots.find((item) => item.id === snapshotId);
    if (!snapshot) {
      return;
    }

    const measurements = normalizeMeasurements(snapshot.measurements);
    setFormState(measurements);
    setDisplayFormState(
      buildDisplayFormState(measurements, globalUnitSystem, fieldUnitOverrides)
    );
    setErrors({});
  }

  function handleDeleteSnapshot(snapshotId) {
    const nextSnapshots = snapshots.filter((item) => item.id !== snapshotId);
    setSnapshots(nextSnapshots);
    persistSnapshots(nextSnapshots);
    if (comparisonSnapshotId === snapshotId) {
      setComparisonSnapshotId("");
    }
  }

  function handleCompareSnapshot(snapshotId) {
    setComparisonSnapshotId((current) => (current === snapshotId ? "" : snapshotId));
    trackEvent("snapshot_compare_selected");
  }

  function handleExportSnapshots() {
    if (!snapshots.length) {
      return;
    }

    const blob = new Blob([serializeSnapshots(snapshots)], {
      type: "application/json"
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bodymod-snapshots.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    trackEvent("snapshots_exported", { count: snapshots.length });
  }

  function handleImportSnapshots(event) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const importedSnapshots = parseSnapshotExport(String(reader.result || ""));
        const existingIds = new Set(snapshots.map((snapshot) => snapshot.id));
        const uniqueImportedSnapshots = importedSnapshots.filter(
          (snapshot) => !existingIds.has(snapshot.id)
        );
        const skippedCount = importedSnapshots.length - uniqueImportedSnapshots.length;
        const nextSnapshots = [
          ...uniqueImportedSnapshots,
          ...snapshots
        ];
        const importedCount = nextSnapshots.length - snapshots.length;
        setSnapshots(nextSnapshots);
        persistSnapshots(nextSnapshots);
        setImportStatus(
          skippedCount
            ? `Imported ${importedCount} snapshot(s). Skipped ${skippedCount} duplicate snapshot(s).`
            : `Imported ${importedCount} snapshot(s).`
        );
        trackEvent("snapshots_imported", {
          count: importedCount,
          skipped: skippedCount
        });
      } catch (error) {
        setImportStatus("Import failed. Choose a bodymod snapshot JSON file.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function handleGlobalUnitChange(nextUnitSystem) {
    setGlobalUnitSystem(nextUnitSystem);
    setDisplayFormState(buildDisplayFormState(formState, nextUnitSystem, fieldUnitOverrides));
  }

  function handleFieldUnitChange(name, nextUnitSystem) {
    setFieldUnitOverrides((current) => {
      const nextOverrides = { ...current };

      if (nextUnitSystem === globalUnitSystem) {
        delete nextOverrides[name];
      } else {
        nextOverrides[name] = nextUnitSystem;
      }

      return nextOverrides;
    });

    setDisplayFormState((current) => ({
      ...current,
      [name]: formatDisplayValue(name, formState[name], nextUnitSystem)
    }));
  }

  function handleFieldUnitReset(name) {
    setFieldUnitOverrides((current) => {
      if (!current[name]) {
        return current;
      }

      const nextOverrides = { ...current };
      delete nextOverrides[name];
      return nextOverrides;
    });

    setDisplayFormState((current) => ({
      ...current,
      [name]: formatDisplayValue(name, formState[name], globalUnitSystem)
    }));
  }

  const currentMeasurements = coerceMeasurements(formState);
  const rankedMatches = result.matches.length ? result.matches : targets;
  const selectedTarget =
    rankedMatches.find((match) => match.id === selectedTargetId) ||
    rankedMatches[0] ||
    null;
  const comparisonSnapshot = snapshots.find(
    (snapshot) => snapshot.id === comparisonSnapshotId
  );
  const snapshotComparison = summarizeMeasurementDiff(
    currentMeasurements,
    comparisonSnapshot?.measurements
  );
  const shareUrl =
    typeof window !== "undefined" ? buildShareUrl(currentMeasurements) : "";

  function handleTargetChange(event) {
    setSelectedTargetId(event.target.value);
    trackEvent("comparison_target_selected", { id: event.target.value });
  }

  function handleComparisonModeChange(nextMode) {
    setComparisonMode(nextMode);
    trackEvent("comparison_mode_changed", { mode: nextMode });
  }

  async function handleCopyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("Share link copied.");
      trackEvent("share_link_copied");
    } catch (error) {
      setShareStatus("Copy failed. Select the URL manually.");
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onOpenStrategies={() => setIsStrategyExplorerOpen(true)}
        onShare={handleCopyShareLink}
        shareStatus={shareStatus}
      />

      {activeSection === "body" ? (
        <>
          <main className="workspace">
            <section className="visual-column">
              <div className="insight-tabs panel">
                <div className="tab-bar" role="tablist" aria-label="Result and comparison views">
                  <button
                    className={`button ${insightTab === "result" ? "is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={insightTab === "result"}
                    onClick={() => setInsightTab("result")}
                  >
                    Result
                  </button>
                  <button
                    className={`button ${insightTab === "target" ? "is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={insightTab === "target"}
                    onClick={() => setInsightTab("target")}
                  >
                    vs Target
                  </button>
                  <button
                    className={`button ${insightTab === "population" ? "is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={insightTab === "population"}
                    onClick={() => setInsightTab("population")}
                  >
                    vs US Population
                  </button>
                </div>

                {insightTab === "result" ? (
                  <ResultSummary
                    measurements={currentMeasurements}
                    result={result}
                    apiStatus={apiStatus}
                    hoveredMeasurement={hoveredMeasurement}
                    onMeasurementHover={setHoveredMeasurement}
                  />
                ) : insightTab === "target" ? (
                  <ComparisonPanel
                    mode={comparisonMode}
                    onModeChange={handleComparisonModeChange}
                    selectedTarget={selectedTarget}
                    onTargetChange={handleTargetChange}
                    rankedMatches={rankedMatches}
                    currentMeasurements={currentMeasurements}
                    snapshotComparison={snapshotComparison}
                    comparisonSnapshot={comparisonSnapshot}
                  />
                ) : (
                  <PopulationPanel measurements={currentMeasurements} />
                )}
              </div>
            </section>

            <section className="control-column">
              <MeasurementForm
                formState={displayFormState}
                errors={errors}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onFieldBlur={handleFieldBlur}
                globalUnitSystem={globalUnitSystem}
                fieldUnitOverrides={fieldUnitOverrides}
                onGlobalUnitChange={handleGlobalUnitChange}
                onFieldUnitChange={handleFieldUnitChange}
                onFieldUnitReset={handleFieldUnitReset}
                hoveredMeasurement={hoveredMeasurement}
                onMeasurementHover={setHoveredMeasurement}
              />

              <SnapshotPanel
                snapshotLabel={snapshotLabel}
                onSnapshotLabelChange={setSnapshotLabel}
                snapshotNote={snapshotNote}
                onSnapshotNoteChange={setSnapshotNote}
                snapshots={snapshots}
                onSaveSnapshot={handleSaveSnapshot}
                onLoadSnapshot={handleLoadSnapshot}
                onDeleteSnapshot={handleDeleteSnapshot}
                comparisonSnapshotId={comparisonSnapshotId}
                onCompareSnapshot={handleCompareSnapshot}
                onExportSnapshots={handleExportSnapshots}
                onImportSnapshots={handleImportSnapshots}
                importStatus={importStatus}
              />
            </section>
          </main>
          <InfoFootnote />
        </>
      ) : (
        <DietDashboard />
      )}

      {isStrategyExplorerOpen ? (
        <div className="strategy-explorer-overlay" role="presentation">
          <div className="strategy-explorer-shell">
            <button
              className="modal-close strategy-explorer-close"
              type="button"
              aria-label="Close strategy explorer"
              onClick={() => setIsStrategyExplorerOpen(false)}
            >
              x
            </button>
            <StrategyCorpus />
          </div>
        </div>
      ) : null}
    </div>
  );
}
