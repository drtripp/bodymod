import { useEffect, useState } from "react";
import ComparisonPanel from "./components/ComparisonPanel";
import MatchList from "./components/MatchList";
import MeasurementForm from "./components/MeasurementForm";
import MethodBlock from "./components/MethodBlock";
import PrivacyBlock from "./components/PrivacyBlock";
import ResultSummary from "./components/ResultSummary";
import SiteHeader from "./components/SiteHeader";
import SnapshotPanel from "./components/SnapshotPanel";
import { fetchHealth, fetchMatches, fetchTargets } from "./lib/api";
import {
  coerceMeasurements,
  defaultMeasurements,
  validateMeasurements
} from "./lib/measurements";

export default function App() {
  const [formState, setFormState] = useState(defaultMeasurements);
  const [errors, setErrors] = useState({});
  const [apiStatus, setApiStatus] = useState("checking");
  const [targets, setTargets] = useState([]);
  const [result, setResult] = useState({
    top_match: null,
    matches: [],
    percentiles: {}
  });
  const [mode, setMode] = useState("side-by-side");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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

    void runMatch(defaultMeasurements);
  }, [targets]);

  async function runMatch(measurements) {
    setIsLoading(true);

    try {
      const response = await fetchMatches(measurements);
      setResult(response);
      setSelectedTargetId(response.top_match?.id || "");
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
    setFormState((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateMeasurements(formState);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    void runMatch(coerceMeasurements(formState));
  }

  const rankedMatches = result.matches.length ? result.matches : targets;
  const selectedTarget =
    rankedMatches.find((match) => match.id === selectedTargetId) || rankedMatches[0];

  return (
    <div className="app-shell">
      <SiteHeader />

      <main className="main-grid">
        <MeasurementForm
          formState={formState}
          errors={errors}
          onChange={handleChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />

        <ResultSummary
          measurements={coerceMeasurements(formState)}
          result={result}
          apiStatus={apiStatus}
        />

        <ComparisonPanel
          mode={mode}
          onModeChange={setMode}
          selectedTarget={selectedTarget}
          onTargetChange={(event) => setSelectedTargetId(event.target.value)}
          rankedMatches={rankedMatches}
          currentMeasurements={coerceMeasurements(formState)}
        />

        <MatchList matches={rankedMatches} />
        <SnapshotPanel />
        <MethodBlock />
        <PrivacyBlock />
      </main>
    </div>
  );
}
