import { useState } from "react";
import { trackEvent } from "../lib/analytics";
import {
  createSnapshot,
  parseSnapshotExport,
  persistSnapshots,
  serializeSnapshots
} from "../lib/storage";

function sortedByNewest(snapshots) {
  return snapshots.slice().sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );
}

export function useSnapshotState(initialSnapshots = []) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [snapshotNote, setSnapshotNote] = useState("");
  const [importStatus, setImportStatus] = useState("");

  function replaceSnapshots(nextSnapshots) {
    setSnapshots(nextSnapshots);
    persistSnapshots(nextSnapshots);
  }

  function saveSnapshot(measurements, options = {}) {
    const snapshotOptions = options?.nativeEvent ? {} : options;
    const nextSnapshots = [
      createSnapshot(
        measurements,
        snapshotOptions.label ?? snapshotLabel,
        snapshotOptions.note ?? snapshotNote
      ),
      ...snapshots
    ];

    replaceSnapshots(nextSnapshots);
    if (!snapshotOptions.label) {
      setSnapshotLabel("");
    }
    if (!snapshotOptions.note) {
      setSnapshotNote("");
    }
    trackEvent("snapshot_saved", {
      count: nextSnapshots.length,
      source: snapshotOptions.source || "manual"
    });

    return true;
  }

  function deleteSnapshot(snapshotId) {
    const nextSnapshots = snapshots.filter((item) => item.id !== snapshotId);
    replaceSnapshots(nextSnapshots);
    return nextSnapshots;
  }

  function exportSnapshots() {
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

  function importSnapshots(event) {
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
        replaceSnapshots(nextSnapshots);
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

  function restoreSnapshots(importedSnapshots = []) {
    const validSnapshots = importedSnapshots.filter(
      (snapshot) => snapshot?.id && snapshot?.createdAt && snapshot?.measurements
    );
    const existingIds = new Set(snapshots.map((snapshot) => snapshot.id));
    const uniqueImportedSnapshots = validSnapshots.filter(
      (snapshot) => !existingIds.has(snapshot.id)
    );
    const skippedCount = validSnapshots.length - uniqueImportedSnapshots.length;
    const nextSnapshots = sortedByNewest([...uniqueImportedSnapshots, ...snapshots]);

    if (uniqueImportedSnapshots.length) {
      replaceSnapshots(nextSnapshots);
      trackEvent("snapshots_imported", {
        count: uniqueImportedSnapshots.length,
        skipped: skippedCount,
        source: "encrypted-backup"
      });
    }

    return {
      snapshots: nextSnapshots,
      importedCount: uniqueImportedSnapshots.length,
      skippedCount
    };
  }

  return {
    snapshots,
    snapshotLabel,
    snapshotNote,
    importStatus,
    setSnapshotLabel,
    setSnapshotNote,
    setSnapshots,
    replaceSnapshots,
    saveSnapshot,
    deleteSnapshot,
    exportSnapshots,
    importSnapshots,
    restoreSnapshots
  };
}
