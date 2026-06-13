import { summarizeSnapshotTrend } from "./comparison.js";
import { buildBloodworkTrendRows, formatBloodworkResult } from "./bloodwork.js";
import { formatFaceMetricSummary } from "./faceMeasurements.js";
import { buildProtocolCaseLog } from "./protocolPlanning.js";
import { buildProcedureCaseLog } from "./procedures.js";
import { calculateWorkoutPrs } from "./workouts.js";
import { photoCategoryCounts } from "./photos.js";
import { createTranslator, normalizeLocale } from "./i18n.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(timestamp, locale = "en", t = createTranslator(locale)) {
  if (!timestamp) {
    return t("report.notSet");
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
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
  procedures = [],
  bloodworkResults = [],
  photos = [],
  faceMeasurements = []
}) {
  const trend = summarizeSnapshotTrend(snapshots);
  const workoutPrs = calculateWorkoutPrs(workoutSessions);
  const photoCounts = photoCategoryCounts(photos);
  const protocolCaseLogs = protocols.map((protocol) =>
    buildProtocolCaseLog(protocol, measurements, snapshots)
  );
  const procedureCaseLogs = procedures.map((procedure) =>
    buildProcedureCaseLog(procedure, snapshots, photos)
  );
  const bloodworkTrends = buildBloodworkTrendRows(bloodworkResults);

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
    procedures,
    procedureCaseLogs,
    bloodworkResults,
    bloodworkTrends,
    checkIns,
    workoutPrs,
    photoCounts,
    photoCount: photos.length,
    faceMeasurements
  };
}

function localizedSex(measurements = {}, t) {
  return t(`measurement.field.sex.option.${measurements.sex}`, {}, measurements.sex);
}

function measurementRows(measurements = {}, t) {
  return [
    [t("measurement.field.height.label"), `${Number(measurements.height).toFixed(1)} cm`],
    [t("measurement.field.weight.label"), `${Number(measurements.weight).toFixed(1)} kg`],
    [t("measurement.field.sex.label"), localizedSex(measurements, t)],
    [t("measurement.field.waistCircumference.label"), `${Number(measurements.waistCircumference).toFixed(1)} cm`],
    [t("measurement.field.bideltoidCircumference.label"), `${Number(measurements.bideltoidCircumference).toFixed(1)} cm`],
    [t("measurement.field.hipCircumference.label"), `${Number(measurements.hipCircumference).toFixed(1)} cm`]
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
  const locale = normalizeLocale(input?.locale);
  const t = createTranslator(locale);

  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(t("report.title"))}</title>
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
        <h1>${escapeHtml(t("report.title"))}</h1>
        <p>${escapeHtml(model.account?.displayName || t("report.localProfile"))} / ${escapeHtml(t("report.generated"))} ${escapeHtml(formatDate(model.generatedAt, locale, t))}</p>
        <p class="muted">${escapeHtml(t("report.printNote"))}</p>
        <button onclick="window.print()">${escapeHtml(t("report.printButton"))}</button>
      </header>

      <section>
        <h2>${escapeHtml(t("report.currentMeasurements"))}</h2>
        <dl>
          ${measurementRows(model.measurements, t)
            .map(
              ([label, value]) => `<div class="stat"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
            )
            .join("")}
        </dl>
      </section>

      <section>
        <h2>${escapeHtml(t("report.snapshotTrend"))}</h2>
        <p>${escapeHtml(t("report.snapshotsSaved", { count: model.snapshotCount }))}</p>
        ${listItems(
          trendItems,
          (metric) => `<li>${escapeHtml(metric.label)}: ${escapeHtml(metric.delta.toFixed(1))} ${escapeHtml(metric.unit)}</li>`,
          t("report.noTrend")
        )}
      </section>

      <section class="grid">
        <div>
          <h2>${escapeHtml(t("report.goals"))}</h2>
          ${listItems(
            model.goals,
            (goal) => `<li><strong>${escapeHtml(goal.label)}</strong>: ${escapeHtml(goal.category)} / ${escapeHtml(t("report.goalCheckIns", { count: goal.checkIns?.length || 0 }))}</li>`,
            t("report.noGoals")
          )}
        </div>
        <div>
          <h2>${escapeHtml(t("report.checkIns"))}</h2>
          ${listItems(
            model.checkIns.slice(0, 8),
            (checkIn) => `<li>${escapeHtml(checkIn.type)} / ${escapeHtml(formatDate(checkIn.createdAt, locale, t))}${checkIn.note ? ` / ${escapeHtml(checkIn.note)}` : ""}</li>`,
            t("report.noCheckIns")
          )}
        </div>
      </section>

      <section>
        <h2>${escapeHtml(t("report.protocols"))}</h2>
        ${listItems(
          model.protocols,
          (protocol) => `<li><strong>${escapeHtml(protocol.label)}</strong>: ${escapeHtml(protocol.status)} / ${escapeHtml(t("report.adherenceCheckIns", { count: protocol.adherence.checkIns }))}, ${escapeHtml(protocol.adherence.onTrack)} ${escapeHtml(t("report.onTrack"))}, ${escapeHtml(protocol.adherence.missed)} ${escapeHtml(t("report.missed"))}. ${escapeHtml(t("report.dose"))}: ${escapeHtml(protocol.dose)}; ${escapeHtml(t("report.frequency"))}: ${escapeHtml(protocol.frequency)}</li>`,
          t("report.noProtocols")
        )}
      </section>

      <section>
        <h2>${escapeHtml(t("report.protocolCaseLogs"))}</h2>
        ${listItems(
          model.protocolCaseLogs,
          (caseLog) => `<li><strong>${escapeHtml(caseLog.label)}</strong>: ${escapeHtml(caseLog.outcomeSummary)} / ${escapeHtml(caseLog.projectionSummary)}</li>`,
          t("report.noProtocolCaseLogs")
        )}
      </section>

      <section>
        <h2>${escapeHtml(t("report.procedureCaseLogs"))}</h2>
        ${listItems(
          model.procedureCaseLogs,
          (caseLog) => `<li><strong>${escapeHtml(caseLog.label)}</strong>: ${escapeHtml(caseLog.summary)} / ${escapeHtml(caseLog.reviewStatus)}</li>`,
          t("report.noProcedureCaseLogs")
        )}
      </section>

      <section>
        <h2>${escapeHtml(t("report.bloodwork"))}</h2>
        <p>${escapeHtml(t("report.bloodworkPrivacy", { count: model.bloodworkResults.length }))}</p>
        ${listItems(
          model.bloodworkTrends,
          (trend) => `<li><strong>${escapeHtml(trend.markerLabel)}</strong>: latest ${escapeHtml(trend.latestValue)} ${escapeHtml(trend.unit)}${trend.delta === null ? "" : ` / delta ${escapeHtml(trend.delta)} ${escapeHtml(trend.unit)}`} / ${escapeHtml(trend.count)} result(s)</li>`,
          t("report.noBloodworkTrends")
        )}
        ${listItems(
          model.bloodworkResults.slice(0, 6),
          (result) => `<li>${escapeHtml(formatBloodworkResult(result))} / ${escapeHtml(result.rangeStatus || t("report.noRange"))}${result.note ? ` / ${escapeHtml(result.note)}` : ""}</li>`,
          t("report.noRecentLabs")
        )}
      </section>

      <section class="grid">
        <div>
          <h2>${escapeHtml(t("report.workoutPrs"))}</h2>
          ${listItems(
            model.workoutPrs,
            (record) => `<li><strong>${escapeHtml(record.exerciseLabel)}</strong>: ${escapeHtml(record.maxLoadKg)} ${escapeHtml(t("report.workoutBest"))} / ${escapeHtml(record.maxVolumeKg)} ${escapeHtml(t("report.workoutVolume"))} / ${escapeHtml(record.sessionCount)} ${escapeHtml(t("report.workoutSessions"))}</li>`,
            t("report.noWorkoutSessions")
          )}
        </div>
        <div>
          <h2>${escapeHtml(t("report.photoManifest"))}</h2>
          <p>${escapeHtml(t("report.photoStored", { count: model.photoCount }))}</p>
          ${listItems(
            model.photoCounts,
            (category) => `<li>${escapeHtml(category.label)}: ${escapeHtml(category.count)} ${escapeHtml(t("report.photoCount"))}</li>`,
            t("report.noPhotos")
          )}
        </div>
      </section>

      <section>
        <h2>${escapeHtml(t("report.faceMeasurements"))}</h2>
        ${listItems(
          model.faceMeasurements,
          (scan) => `<li><strong>${escapeHtml(formatFaceMetricSummary(scan))}</strong>${scan.note ? ` / ${escapeHtml(scan.note)}` : ""}</li>`,
          t("report.noFaceMeasurements")
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
