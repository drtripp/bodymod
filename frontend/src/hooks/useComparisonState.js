import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../lib/analytics";
import { summarizeMeasurementDiff } from "../lib/comparison";
import { buildSnapshotTargets } from "../lib/localTargets";
import {
  buildTargetFilterOptions,
  defaultTargetFilters,
  filterTargets
} from "../lib/targetFilters";

export function useComparisonState({
  result,
  targets,
  snapshots,
  currentMeasurements,
  fallbackMatchPriorities
}) {
  const [comparisonSnapshotId, setComparisonSnapshotId] = useState("");
  const [comparisonMode, setComparisonMode] = useState("side-by-side");
  const [silhouetteView, setSilhouetteView] = useState("front");
  const [matchPriority, setMatchPriority] = useState("balanced");
  const [matchPriorityPresets, setMatchPriorityPresets] = useState(fallbackMatchPriorities);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [targetFilters, setTargetFilters] = useState(defaultTargetFilters);

  const rankedMatches = result.matches.length ? result.matches : targets;
  const snapshotTargets = useMemo(() => buildSnapshotTargets(snapshots), [snapshots]);
  const allComparisonTargets = useMemo(
    () => [...rankedMatches, ...snapshotTargets],
    [rankedMatches, snapshotTargets]
  );
  const targetFilterOptions = useMemo(
    () => buildTargetFilterOptions(allComparisonTargets),
    [allComparisonTargets]
  );
  const comparisonTargets = useMemo(
    () => filterTargets(allComparisonTargets, targetFilters),
    [allComparisonTargets, targetFilters]
  );
  const selectedTarget =
    comparisonTargets.find((match) => match.id === selectedTargetId) ||
    comparisonTargets[0] ||
    null;
  const comparisonSnapshot = snapshots.find(
    (snapshot) => snapshot.id === comparisonSnapshotId
  );
  const snapshotComparison = summarizeMeasurementDiff(
    currentMeasurements,
    comparisonSnapshot?.measurements
  );

  useEffect(() => {
    if (!comparisonTargets.length) {
      return;
    }

    setSelectedTargetId((current) =>
      comparisonTargets.some((target) => target.id === current)
        ? current
        : comparisonTargets[0].id
    );
  }, [comparisonTargets]);

  function handleTargetChange(event) {
    setSelectedTargetId(event.target.value);
    trackEvent("comparison_target_selected", { id: event.target.value });
  }

  function handleTargetFilterChange(name, value) {
    setTargetFilters((current) => ({
      ...current,
      [name]: value
    }));
    trackEvent("comparison_target_filter_changed", { name, value });
  }

  function handleComparisonModeChange(nextMode) {
    setComparisonMode(nextMode);
    trackEvent("comparison_mode_changed", { mode: nextMode });
  }

  function handleSilhouetteViewChange(nextView) {
    setSilhouetteView(nextView === "side" ? "side" : "front");
    trackEvent("silhouette_view_changed", { view: nextView });
  }

  function handleMatchPriorityChange(nextPriority) {
    setMatchPriority(nextPriority);
    setSelectedTargetId("");
    trackEvent("match_priority_changed", { priority: nextPriority });
  }

  function handleCompareSnapshot(snapshotId) {
    setComparisonSnapshotId((current) => (current === snapshotId ? "" : snapshotId));
    trackEvent("snapshot_compare_selected");
  }

  function clearComparisonSnapshot(snapshotId) {
    if (comparisonSnapshotId === snapshotId) {
      setComparisonSnapshotId("");
    }
  }

  return {
    comparisonSnapshotId,
    comparisonMode,
    silhouetteView,
    matchPriority,
    matchPriorityPresets,
    selectedTargetId,
    targetFilters,
    rankedMatches,
    allComparisonTargets,
    targetFilterOptions,
    comparisonTargets,
    selectedTarget,
    comparisonSnapshot,
    snapshotComparison,
    setMatchPriorityPresets,
    setSelectedTargetId,
    handleTargetChange,
    handleTargetFilterChange,
    handleComparisonModeChange,
    handleSilhouetteViewChange,
    handleMatchPriorityChange,
    handleCompareSnapshot,
    clearComparisonSnapshot
  };
}
