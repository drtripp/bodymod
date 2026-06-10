import { summarizeSnapshotTrend } from "./comparison.js";
import { formatFaceMetricSummary } from "./faceMeasurements.js";
import { buildProtocolCaseLog } from "./protocolPlanning.js";
import { calculateWorkoutPrs } from "./workouts.js";
import { photoCategoryCounts } from "./photos.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(timestamp) {
  if (!timestamp) {
    return "not set";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(timestamp)
  );
}

function protocolAdherence(protocol) {
  const checkIns = Array.isArray(protocol.checkIns) ? protocol.checkIns : [];
  const onTrack = checkIns.filter((checkIn) => checkIn.adherence === "on track").length;
  const missed = checkIns.filter((checkIn) => checkIn.adherence === "missed").length;

  return {
    checkIns: checkIns.length,
    onTrack,
    missed
  };
}

export function buildProgressReportModel({
  account,
  measurements,
  snapshots = [],
  goals = [],
  protocols = [],
  checkIns = [],
  workoutSessions = [],
  photos = [],
  faceMeasurements = []
}) {
  const trend = summarizeSnapshotTrend(snapshots);
  const workoutPrs = calculateWorkoutPrs(workoutSessions);
  const photoCounts = photoCategoryCounts(photos);
  const protocolCaseLogs = protocols.map((protocol) =>
    buildProtocolCaseLog(protocol, measurements, snapshots)
  );

  return {
    generatedAt: new Date().toISOString(),
    account: account || null,
    measurements,
    snapshotCount: snapshots.length,
    trend,
    goals,
    protocols: protocols.map((protocol) => ({
      ...protocol,
      adherence: protocolAdherence(protocol)
    })),
    protocolCaseLogs,
    checkIns,
    workoutPrs,
    photoCounts,
    photoCount: photos.length,
    faceMeasurements
  };
}

function measurementRows(measurements = {}) {
  return [
    ["Height", `${Number(measurements.height).toFixed(1)} cm`],
    ["Weight", `${Number(measurements.weight).toFixed(1)} kg`],
    ["Sex", measurements.sex],
    ["Waist", `${Number(measurements.waistCircumference).toFixed(1)} cm`],
    ["Bideltoid Circ", `${Number(measurements.bideltoidCircumference).toFixed(1)} cm`],
    ["Hip", `${Number(measurements.hipCircumference).toFixed(1)} cm`]
  ];
}

function listItems(items, renderItem, emptyText) {
  if (!items.length) {
    return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }

  return `<ul>${items.map(renderItem).join("")}</ul>`;
}

export function buildProgressReportHtml(input) {
  const model = buildProgressReportModel(input);
  const trendItems = model.trend?.metrics?.slice(0, 6) || [];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>bodymod progress report</title>
    <style>
      :root { color: #17212b; font-family: Georgia, serif; }
      body { margin: 0; background: #f7f5ee; }
      main { max-width: 920px; margin: 0 auto; padding: 36px; }
      header, section { border: 1px solid #9aa4ad; background: #fffdf7; margin-bottom: 16px; padding: 18px; }
      h1, h2, h3, p { margin: 0 0 8px; }
      h1 { font-size: 2rem; }
      h2 { font-size: 1.2rem; border-bottom: 1px solid #cbd1d7; padding-bottom: 6px; }
      dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      div.stat { border: 1px solid #cbd1d7; padding: 10px; }
      dt { color: #5a6672; font-size: 0.8rem; text-transform: uppercase; }
      dd { font-size: 1.25rem; font-weight: 700; margin: 0; }
      ul { margin: 0; padding-left: 20px; }
      li { margin: 6px 0; }
      .muted { color: #5a6672; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      @media print { body { background: white; } main { padding: 0; } button { display: none; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>bodymod progress report</h1>
        <p>${escapeHtml(model.account?.displayName || "Local profile")} / generated ${escapeHtml(formatDate(model.generatedAt))}</p>
        <p class="muted">Printable local report for review conversations. Not medical advice.</p>
        <button onclick="window.print()">Print / save as PDF</button>
      </header>

      <section>
        <h2>Current measurements</h2>
        <dl>
          ${measurementRows(model.measurements)
            .map(
              ([label, value]) => `<div class="stat"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
            )
            .join("")}
        </dl>
      </section>

      <section>
        <h2>Snapshot trend</h2>
        <p>${model.snapshotCount} snapshot(s) saved.</p>
        ${listItems(
          trendItems,
          (metric) => `<li>${escapeHtml(metric.label)}: ${escapeHtml(metric.delta.toFixed(1))} ${escapeHtml(metric.unit)}</li>`,
          "No multi-snapshot trend yet."
        )}
      </section>

      <section class="grid">
        <div>
          <h2>Goals</h2>
          ${listItems(
            model.goals,
            (goal) => `<li><strong>${escapeHtml(goal.label)}</strong>: ${escapeHtml(goal.category)} / ${escapeHtml(goal.checkIns?.length || 0)} check-in(s)</li>`,
            "No saved goals yet."
          )}
        </div>
        <div>
          <h2>Check-ins</h2>
          ${listItems(
            model.checkIns.slice(0, 8),
            (checkIn) => `<li>${escapeHtml(checkIn.type)} / ${escapeHtml(formatDate(checkIn.createdAt))}${checkIn.note ? ` / ${escapeHtml(checkIn.note)}` : ""}</li>`,
            "No check-ins logged yet."
          )}
        </div>
      </section>

      <section>
        <h2>Protocols and adherence</h2>
        ${listItems(
          model.protocols,
          (protocol) => `<li><strong>${escapeHtml(protocol.label)}</strong>: ${escapeHtml(protocol.status)} / ${escapeHtml(protocol.adherence.checkIns)} adherence check-in(s), ${escapeHtml(protocol.adherence.onTrack)} on track, ${escapeHtml(protocol.adherence.missed)} missed. Dose: ${escapeHtml(protocol.dose)}; frequency: ${escapeHtml(protocol.frequency)}</li>`,
          "No protocols started yet."
        )}
      </section>

      <section>
        <h2>Protocol case logs</h2>
        ${listItems(
          model.protocolCaseLogs,
          (caseLog) => `<li><strong>${escapeHtml(caseLog.label)}</strong>: ${escapeHtml(caseLog.outcomeSummary)} / ${escapeHtml(caseLog.projectionSummary)}</li>`,
          "No protocol case logs yet."
        )}
      </section>

      <section class="grid">
        <div>
          <h2>Workout PRs</h2>
          ${listItems(
            model.workoutPrs,
            (record) => `<li><strong>${escapeHtml(record.exerciseLabel)}</strong>: ${escapeHtml(record.maxLoadKg)} kg best / ${escapeHtml(record.maxVolumeKg)} kg volume / ${escapeHtml(record.sessionCount)} session(s)</li>`,
            "No workout sessions logged yet."
          )}
        </div>
        <div>
          <h2>Photo manifest</h2>
          <p>${model.photoCount} local photo(s) stored in this browser.</p>
          ${listItems(
            model.photoCounts,
            (category) => `<li>${escapeHtml(category.label)}: ${escapeHtml(category.count)} photo(s)</li>`,
            "No progress photos logged yet."
          )}
        </div>
      </section>

      <section>
        <h2>Face measurements</h2>
        ${listItems(
          model.faceMeasurements,
          (scan) => `<li><strong>${escapeHtml(formatFaceMetricSummary(scan))}</strong>${scan.note ? ` / ${escapeHtml(scan.note)}` : ""}</li>`,
          "No face measurements logged yet."
        )}
      </section>
    </main>
  </body>
</html>`;
}

export function downloadProgressReport(input, filename = "bodymod-progress-report.html") {
  const blob = new Blob([buildProgressReportHtml(input)], {
    type: "text/html"
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
