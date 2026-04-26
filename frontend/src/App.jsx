import { useEffect, useState } from "react";
import MatchList from "./components/MatchList";
import MeasurementForm from "./components/MeasurementForm";
import ResultSummary from "./components/ResultSummary";
import SiteHeader from "./components/SiteHeader";
import SnapshotPanel from "./components/SnapshotPanel";
import { fetchHealth, fetchMatches, fetchTargets } from "./lib/api";
import {
  coerceMeasurements,
  defaultMeasurements,
  validateMeasurements
} from "./lib/measurements";
import { createSnapshot, loadSnapshots, persistSnapshots } from "./lib/storage";
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
  const [globalUnitSystem, setGlobalUnitSystem] = useState("metric");
  const [fieldUnitOverrides, setFieldUnitOverrides] = useState({});
  const [hoveredMeasurement, setHoveredMeasurement] = useState(null);

  useEffect(() => {
    const storedSnapshots = loadSnapshots();
    setSnapshots(storedSnapshots);

    if (storedSnapshots.length) {
      setFormState(storedSnapshots[0].measurements);
      setDisplayFormState(
        buildDisplayFormState(storedSnapshots[0].measurements, "metric", {})
      );
    } else {
      setDisplayFormState(buildDisplayFormState(defaultMeasurements, "metric", {}));
    }

    fetchHealth()
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));

    fetchTargets()
      .then((response) => setTargets(response.targets))
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
      createSnapshot(coerceMeasurements(formState)),
      ...snapshots
    ];

    setSnapshots(nextSnapshots);
    persistSnapshots(nextSnapshots);
  }

  function handleLoadSnapshot(snapshotId) {
    const snapshot = snapshots.find((item) => item.id === snapshotId);
    if (!snapshot) {
      return;
    }

    setFormState(snapshot.measurements);
    setDisplayFormState(
      buildDisplayFormState(snapshot.measurements, globalUnitSystem, fieldUnitOverrides)
    );
    setErrors({});
  }

  function handleDeleteSnapshot(snapshotId) {
    const nextSnapshots = snapshots.filter((item) => item.id !== snapshotId);
    setSnapshots(nextSnapshots);
    persistSnapshots(nextSnapshots);
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

  return (
    <div className="app-shell">
      <SiteHeader />

      <main className="workspace">
        <section className="visual-column">
          <ResultSummary
            measurements={currentMeasurements}
            result={result}
            apiStatus={apiStatus}
            hoveredMeasurement={hoveredMeasurement}
            onMeasurementHover={setHoveredMeasurement}
          />
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

          <MatchList matches={rankedMatches} />
          <SnapshotPanel
            snapshots={snapshots}
            onSaveSnapshot={handleSaveSnapshot}
            onLoadSnapshot={handleLoadSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
          />
        </section>
      </main>
    </div>
  );
}
